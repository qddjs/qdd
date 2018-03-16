'use strict';

const util = require("util");
const fs = require("fs");
const mkdirp = require("./mkdirp.js");
const debug = require("./debug.js");
const readdir = util.promisify(fs.readdir);
const copyFile = util.promisify(fs.copyFile);
const stat = util.promisify(fs.stat);
const mkdir = util.promisify(fs.mkdir);

async function maybeMkdir(dir) {
  try {
    await mkdir(dir);
  } catch (e) {
    if (e.code === 'EEXIST') {
      return;
    }
    throw e;
  }
}

async function cpr(src, dest, useMkdir = false) {
  debug(() => `cpr ${src} ${dest}`);
  if ((await stat(src)).isDirectory()) {
    await (useMkdir ? maybeMkdir : mkdirp)(dest);
    await Promise.all(
      (await readdir(src)).map(item => cpr(`${src}/${item}`, `${dest}/${item}`, true))
    );
  } else {
    await copyFile(src, dest);
  }
}
module.exports = cpr;