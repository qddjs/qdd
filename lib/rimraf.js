"use strict";

const util = require("util");
const fs = require("fs");
const debug = require("./debug.js");
const readdir = util.promisify(fs.readdir);
const stat = util.promisify(fs.stat);
const rmdir = util.promisify(fs.rmdir);
const unlink = util.promisify(fs.unlink);

async function rimraf(thing) {
  debug(() => `rimraf ${thing}`);
  const stats = await stat(thing);
  if (stats.isDirectory()) {
    const contents = await readdir(thing);
    await Promise.all(contents.map(x => rimraf(`${thing}/${x}`)));
    await rmdir(thing);
  } else {
    await unlink(thing);
  }
}
module.exports = rimraf;
