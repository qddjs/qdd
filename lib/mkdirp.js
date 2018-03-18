'use strict';

const fs = require('fs');
const path = require('path');
const debug = require('./debug.js');
const mkdir = fs.mkdir;

const cache = new Map();

module.exports = function mkdirp (dir, cb) {
  debug(() => `mkdirp ${dir}`);
  if (cache.has(dir)) {
    return cache.get(dir).then(cb, cb);
  }
  let res;
  let rej;
  const p = new Promise((resolve, reject) => {
    res = () => {
      cache.delete(dir);
      cb();
      resolve();
    };
    rej = e => {
      cache.delete(dir);
      cb(e);
      reject(e);
    };
  });
  cache.set(dir, p);
  mkdir(dir, err => {
    if (err) {
      if (err.code === 'ENOENT') {
        return mkdirp(path.dirname(dir), e => {
          if (e) {
            return rej(e);
          }
          mkdir(dir, e => {
            if (e) {
              rej(e);
            } else {
              res();
            }
          });
        });
      }
      if (err.code === 'EEXIST') {
        // We should check if it's a directory, but since we're in control of all
        // of these files anyway, just move along.
        return res();
      }
      return rej(err);
    } else {
      res();
    }
  });
};
