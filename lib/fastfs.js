'use strict';

const fs = require('fs');
const {
  FSReqWrap,
  stat: bStat,
  copyFile: bCopyFile,
  readdir: bReaddir,
  mkdir: bMkdir,
  getStatValues,
  statValues: bStatValues
} = process.binding('fs');

// This whole chunk is just needed for isdir
const { S_IFDIR, S_IFMT } = fs.constants;
const statValues = bStatValues || getStatValues();
const hasBigInt = (() => {
  const split = process.versions.node.split('.').map(n => Number(n));
  return split[0] >= 10 && split[1] >= 5;
})();
const statFunc = hasBigInt ? (file, req) => bStat(file, false, req) : bStat;

class Wrap extends FSReqWrap {
  constructor (cb) {
    super();
    this.oncomplete = cb;
  }
}

const copy = (src, dest, cb) => bCopyFile(src, dest, 0, new Wrap(cb));

const mkdir = (path, cb) => bMkdir(path, 0o777, new Wrap(cb));

const readdir = (dir, cb) => bReaddir(dir, 'utf8', new Wrap(cb));

const isdir = (file, cb) => statFunc(file, new Wrap(err => {
  if (err) {
    return cb(err);
  }
  const mode = statValues[1];
  cb(null, (mode & S_IFMT) === S_IFDIR);
}));

module.exports = {
  Wrap,
  copy,
  readdir,
  isdir,
  mkdir
};
