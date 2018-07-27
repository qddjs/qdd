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
  const errback = fn => (err, result) => err ? cb(err) : fn(result);

  isdir(src, errback(isDir => {
    if (isDir) {
      (useMkdir ? maybeMkdir : mkdirp)(dest, errback(() => {
        readdir(src, errback(contents => {
          let toRun = contents.length;
          for (const item of contents) {
            cpr(`${src}/${item}`, `${dest}/${item}`, true, errback(() => {
              if (--toRun === 0) {
                cb();
              }
            }));
          }
        }));
      }));
    } else {
      copy(src, dest, cb);
    }
  }));
};
