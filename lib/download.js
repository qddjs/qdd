"use strict";

const http = require('http');
const https = require('https');
const os = require("os");
const util = require("util");
const fs = require("fs");
const path = require("path");
const url = require('url');
const crypto = require("crypto");
const mkdtemp = util.promisify(fs.mkdtemp);
const readdir = util.promisify(fs.readdir);
const stat = util.promisify(fs.stat);

const { cacheDir } = require("./config.js");
const tar = require("./tar.js");
const mv = require("./mv.js");
const rimraf = require("./rimraf.js");
const debug = require("./debug.js");

const CONCURRENCY = process.env.QDD_CONCURRENCY
  ? Number(process.env.QDD_CONCURRENCY)
  : 10;

http.globalAgent.maxSockets = CONCURRENCY;
https.globalAgent.maxSockets = CONCURRENCY;

async function download(cacheDir, url, integrity) {
  debug(() => `download ${url}`);
  const tmpdir = await mkdtemp(os.tmpdir() + "/qdd-");
  const tgzFileName = `${tmpdir}/${path.basename(url)}`;
  const [algorithm, expected] = integrity.split("-");
  await new Promise((res, rej) => {
    (url.startsWith('https') ? https : http).get(url).on('response', onResponse);
    function onResponse(resp) {
      if (resp.statusCode !== 200) {
        return rej(new Error(`request for ${url} gave status code ${resp.statusCode}`));
      }
      const hasher = crypto.createHash(algorithm);
      const tgzOutStream = fs.createWriteStream(tgzFileName);
      resp.pipe(tgzOutStream);
      resp.on("data", d => hasher.update(d));
      resp.once("error", rej);
      resp.once("end", () => {
        const digest = hasher.digest("base64");
        if (digest !== expected) {
          return rej(new Error(`hashes don't match! ${digest}, ${expected}}`));
        }
      });
      tgzOutStream.once("close", res);
    }
  });
  await tar(tgzFileName, tmpdir);
  try {
    await mv(`${tmpdir}/package`, cacheDir);
  } catch (e) {
    if (e.code !== "ENOENT") {
      await rimraf(tmpdir);
      throw e;
    }
    // not actually package, but a different dir
    const contents = await readdir(tmpdir);
    if (contents.length !== 2) {
      await rimraf(tmpdir);
      throw e;
    }
    contents.splice(contents.indexOf(path.basename(url)), 1);
    const packagePath = `${tmpdir}/${contents[0]}`;
    const stats = await stat(packagePath);
    if (!stats.isDirectory()) {
      await rimraf(tmpdir);
      throw e;
    }
    await mv(packagePath, cacheDir);
  }
  await rimraf(tmpdir);
}

module.exports = download;
