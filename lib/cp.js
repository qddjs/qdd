'use strict';

const mkdirp = require('./mkdirp.js');
const debug = require('./debug.js');
const { copy, mkdir, readdir, isdir, hasTypes } = require('./fastfs.js');
const { once } = require('./util.js');

function maybeMkdir (dir, cb) {
  mkdir(dir, (err) => {
    if (err) {
      return cb(err.code === 'EEXIST' ? null : err);
    }
    cb();
  });
}

function cprWithTypes (src, dest, useMkdir, _cb, dirent) {
  debug(() => `cpr ${src} ${dest}`);
  const cb = once(_cb);
  const errback = fn => (err, result) => err ? cb(err) : fn(result);

  const onIsdir = errback(isDir => {
    if (isDir) {
      (useMkdir ? maybeMkdir : mkdirp)(dest, errback(() => {
        readdir(src, errback(contents => {
          let toRun = contents.length;
          for (const item of contents) {
            let name = item.name;
            cprWithTypes(`${src}/${name}`, `${dest}/${name}`, true, errback(() => {
              if (--toRun === 0) {
                cb();
              }
            }), item);
          }
        }));
      }));
    } else {
      copy(src, dest, cb);
    }
  });

  if (dirent) {
    onIsdir(null, dirent.isDirectory());
  } else {
    isdir(src, onIsdir);
  }
}

function cprWithoutTypes (src, dest, useMkdir, _cb) {
  debug(() => `cpr ${src} ${dest}`);
  const cb = once(_cb);
  const errback = fn => (err, result) => err ? cb(err) : fn(result);

  isdir(src, errback(isDir => {
    if (isDir) {
      (useMkdir ? maybeMkdir : mkdirp)(dest, errback(() => {
        readdir(src, errback(contents => {
          let toRun = contents.length;
          for (const item of contents) {
            cprWithoutTypes(`${src}/${item}`, `${dest}/${item}`, true, errback(() => {
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
}

module.exports = hasTypes ? cprWithTypes : cprWithoutTypes;
