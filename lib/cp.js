'use strict';

const fs = require('fs');
const mkdirp = require('./mkdirp.js');
const isdir = require('./isdir.js');
const debug = require('./debug.js');
const mkdir = fs.mkdir;
const {
  FSReqWrap,
  copyFile: bCopyFile,
  readdir: bReaddir
} = process.binding('fs');

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

const copy = bCopyFile ? (src, dest, cb) => {
  const req = new FSReqWrap();
  req.oncomplete = cb;
  bCopyFile(src, dest, 0, req);
} : (src, dest, _cb) => {
  const cb = once(_cb);
  const from = fs.createReadStream(src);
  const to = fs.createWriteStream(dest);
  from.on('error', cb);
  to.on('error', cb);
  to.on('close', cb);
  from.pipe(to);
};

const readdir = (dir, cb) => {
  const req = new FSReqWrap();
  req.oncomplete = cb;
  bReaddir(dir, 'utf8', req);
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
