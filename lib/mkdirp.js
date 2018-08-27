'use strict';

const path = require('path');
const debug = require('./debug.js');
const { mkdir } = require('./fastfs.js');

const cache = new Map();

module.exports = function mkdirp (dir, cb) {
  debug(() => `mkdirp ${dir}`);
  if (cache.has(dir)) {
    return cache.get(dir).then(cb, cb);
  }
  let finish;
  const p = new Promise((resolve, reject) => {
    finish = e => {
      cache.delete(dir);
      cb(e);
      (e ? reject : resolve)(e);
    };
  });
  cache.set(dir, p);
  mkdir(dir, err => {
    if (err) {
      if (err.code === 'ENOENT') {
        return mkdirp(path.dirname(dir), e => {
          if (e) {
            return finish(e);
          }
          mkdir(dir, finish);
        });
      }
      if (err.code === 'EEXIST') {
        // We should check if it's a directory, but since we're in control of all
        // of these files anyway, just move along.
        return finish();
      }
      return finish(err);
    } else {
      finish();
    }
  });
};
