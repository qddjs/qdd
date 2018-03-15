"use strict";

const fs = require("fs");
const path = require("path");
const util = require("util");
const debug = require("./debug.js");
const mkdir = util.promisify(fs.mkdir);
const stat = util.promisify(fs.stat);

const noop = () => {};
const cache = new Map();

async function mkdirp(dir, noCache = false) {
  let res = noop;
  let rej = noop;
  if (!noCache) {
    if (cache.has(dir)) {
      return cache.get(dir);
    }

    let cachePromise = new Promise((_res, _rej) => {
      res = () => {
        cache.delete(dir);
        return _res();
      };
      rej = (e) => {
        cache.delete(dir);
        return _rej(e);
      };
    });
    cache.set(dir, cachePromise);
  }
  debug(() => `mkdirp ${dir}`);
  try {
    await mkdir(dir);
    res();
  } catch (e) {
    if (e.code === "ENOENT") {
      try {
        await mkdirp(path.dirname(dir));
      } catch (mkdirpErr) {
        rej(mkdirpErr);
        throw mkdirpErr;
      }
      await mkdirp(dir, true);
      res();
      return;
    }
    if (e.code === "EEXIST") {
      // We should check if it's a directory, but since we're in control of all
      // of these files anyway, just move along.
      res();
      return;
    }
    rej(e);
    throw e;
  }
}
module.exports = mkdirp;
