"use strict";

const http = require('http');
const https = require('https');
const util = require("util");
const fs = require("fs");
const crypto = require("crypto");

const tar = require("./tar.js");
const debug = require("./debug.js");

const CONCURRENCY = process.env.QDD_CONCURRENCY
  ? Number(process.env.QDD_CONCURRENCY)
  : 10;

http.globalAgent.maxSockets = CONCURRENCY;
https.globalAgent.maxSockets = CONCURRENCY;

async function download(cacheDir, url, integrity, destDir) {
  debug(() => `download ${url}`);
  const [algorithm, expected] = integrity.split("-");
  await new Promise((res, rej) => {
    (url.startsWith('https') ? https : http).get(url).on('response', onResponse);
    function onResponse(resp) {
      if (resp.statusCode !== 200) {
        return rej(new Error(`request for ${url} gave status code ${resp.statusCode}`));
      }
      const hasher = crypto.createHash(algorithm);
      const tarStream = tar(cacheDir, destDir);
      resp.pipe(tarStream);
      resp.on("data", d => hasher.update(d));
      resp.once("error", rej);
      resp.once("end", () => {
        const digest = hasher.digest("base64");
        if (digest !== expected) {
          return rej(new Error(`hashes don't match! ${digest}, ${expected}}`));
        }
      });
      tarStream.once("tar_finish", res);
    }
  });
}

module.exports = download;
