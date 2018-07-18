'use strict';

const debug = require('./debug.js');
const { copy, mkdir } = require('./fastfs.js');
const { scandir } = require('scandir-native');

function maybeMkdir (dir, cb) {
  mkdir(dir, (err) => {
    if (err) {
      return cb(err.code === 'EEXIST' ? null : err);
    }
    cb();
  });
}

const once = cb => {
  let beenCalled = false;
  return (err, data) => {
    if (!beenCalled) {
      beenCalled = true;
      cb(err, data);
    }
  };
};

module.exports = function cpr (src, dest, mkdirFunc, isdir, _cb) {
  debug(() => `cpr ${src} ${dest}`);
  const cb = once(_cb);
  const isDirHandler = (err, isDir) => {
    if (err) {
      return cb(err);
    }
    if (isDir) {
      mkdirFunc(dest, err => {
        if (err) {
          return cb(err);
        }
        scandir(src, (err, contents) => {
          if (err) {
            return cb(err);
          }
          let toRun = contents.length;
          for (const item of contents) {
            const srcFile = `${src}/${item.name}`;
            const dstFile = `${dest}/${item.name}`;
            cpr(srcFile, dstFile, maybeMkdir, item.type === 2, err => {
              if (err) {
                return cb(err);
              }
              if (--toRun === 0) {
                cb();
              }
            });
          }
        });
      });
    } else {
      copy(src, dest, cb);
    }
  };
  isDirHandler(null, isdir);
};
