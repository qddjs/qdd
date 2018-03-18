'use strict';
const fs = require('fs');
const {
  FSReqWrap,
  stat: bStat,
  getStatValues,
  statValues: bStatValues
} = process.binding('fs');
const { S_IFDIR, S_IFMT } = fs.constants;
const statValues = bStatValues || getStatValues();
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
