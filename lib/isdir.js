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
const hasBigInt = (() => {
  const split = process.versions.node.split('.').map(n => Number(n));
  return split[0] >= 10 && split[1] >= 5;
})();
const statFunc = hasBigInt ? (file, req) => bStat(file, false, req) : bStat;
module.exports = (file, cb) => {
  const req = new FSReqWrap(false);
  req.oncomplete = err => {
    if (err) {
      return cb(err);
    }
    const mode = statValues[1];
    cb(null, (mode & S_IFMT) === S_IFDIR);
  };

  statFunc(file, req);
};
