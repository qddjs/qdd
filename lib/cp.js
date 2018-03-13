'use strict';

const util = require("util");
const fs = require("fs");
const mkdirp = require("./mkdirp.js");
const debug = require("./debug.js");
const readdir = util.promisify(fs.readdir);
const copyFile = util.promisify(fs.copyFile);
const stat = util.promisify(fs.stat);

async function cpr(src, dest) {
  debug(() => `cpr ${src} ${dest}`);
  if ((await stat(src)).isDirectory()) {
    await mkdirp(dest);
    await Promise.all(
      (await readdir(src)).map(item => cpr(`${src}/${item}`, `${dest}/${item}`))
    );
  } else {
    await copyFile(src, dest);
  }
}
module.exports = cpr;
