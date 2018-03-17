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
module.exports = (file, cb) => {
  const req = new FSReqWrap();
  req.oncomplete = err => {
    if (err) {
      return cb(err);
    }
    const mode = statValues[1];
    cb(null, (mode & S_IFMT) === S_IFDIR);
  };
  bStat(file, req);
};
