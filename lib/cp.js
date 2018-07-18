'use strict';

const mkdirp = require('./mkdirp.js');
const debug = require('./debug.js');
const { copy, mkdir, readdir, isdir } = require('./fastfs.js');

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

module.exports = function cpr (src, dest, useMkdir, _cb) {
  debug(() => `cpr ${src} ${dest}`);
  const cb = once(_cb);
  isdir(src, (err, isDir) => {
    if (err) {
      return cb(err);
    }
    if (isDir) {
      (useMkdir ? maybeMkdir : mkdirp)(dest, err => {
        if (err) {
          return cb(err);
        }
        readdir(src, (err, contents) => {
          if (err) {
            return cb(err);
          }
          let toRun = contents.length;
          for (const item of contents) {
            cpr(`${src}/${item}`, `${dest}/${item}`, true, err => {
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
  });
};
