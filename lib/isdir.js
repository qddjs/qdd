'use strict';
const fs = require("fs");
const util = require('util');
const {
  FSReqWrap,
  stat: bStat,
  getStatValues
} = process.binding('fs');
const { S_IFDIR, S_IFMT } = fs.constants;
const statValues = getStatValues();
const isDir = file => new Promise((res, rej) => {
  const req = new FSReqWrap();
  req.oncomplete = err => {
    if (err) {
      return rej(err);
    }
    const mode = statValues[1];
    res((mode & S_IFMT) === S_IFDIR);
  };
  bStat(file, req);
});
module.exports = isDir;
