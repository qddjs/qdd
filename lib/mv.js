"use strict";

const util = require("util");
const path = require("path");
const fs = require("fs");
const rename = util.promisify(fs.rename);
const mkdirp = require("./mkdirp.js");
const debug = require("./debug.js");
const cp = require("./cp.js");

module.exports = async function mv(src, dest, skipMkDest = false) {
  debug(() => `mv ${src} ${dest}`);
  if (!skipMkDest) {
    await mkdirp(path.dirname(dest));
  }
  try {
    await rename(src, dest);
  } catch (err) {
    if (err.code === "EXDEV") {
      await cp(src, dest);
      // we'd need to rimraf normally, but this will be done
      // at a higher level anyway
      return;
    }
    throw err;
  }
};
