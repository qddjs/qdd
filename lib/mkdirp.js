"use strict";

const fs = require("fs");
const path = require("path");
const util = require("util");
const debug = require("./debug.js");
const mkdir = util.promisify(fs.mkdir);
const stat = util.promisify(fs.stat);

async function mkdirp(dir) {
  debug(() => `mkdirp ${dir}`);
  try {
    await mkdir(dir);
  } catch (e) {
    if (e.code === "ENOENT") {
      await mkdirp(path.dirname(dir));
      await mkdirp(dir);
      return;
    }
    if (e.code === "EEXIST") {
      return;
    }
    try {
      if ((await stat(dir)).isDirectory()) {
        return;
      }
    } catch (e2) {
      /* continue and throw original error*/
    }
    throw e;
  }
}
module.exports = mkdirp;
