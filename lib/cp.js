'use strict';

const util = require("util");
const fs = require("fs");
const mkdirp = require("./mkdirp.js");
const isdir = require("./isdir.js");
const debug = require("./debug.js");
const stat = util.promisify(fs.stat);
const mkdir = util.promisify(fs.mkdir);
const {
  FSReqWrap,
  copyFile: bCopyFile,
  readdir: bReaddir
} = process.binding('fs');

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

const copy = (src, dest) => new Promise((res, rej) => {
  const req = new FSReqWrap();
  req.oncomplete = err => err ? rej(err) : res();
  bCopyFile(src, dest, 0, req);
});

const readdir = dir => new Promise((res, rej) => {
  const req = new FSReqWrap();
  req.oncomplete = (err, dirs) => err ? rej(err) : res(dirs);
  bReaddir(dir, 'utf8', req);
});

async function cpr(src, dest, useMkdir = false) {
  debug(() => `cpr ${src} ${dest}`);
  if (await isdir(src)) {
    await (useMkdir ? maybeMkdir : mkdirp)(dest);
    await Promise.all(
      (await readdir(src)).map(item => cpr(`${src}/${item}`, `${dest}/${item}`, true))
    );
  } else {
    await copy(src, dest);
  }
}
module.exports = cpr;
