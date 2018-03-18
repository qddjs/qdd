'use strict';

const zlib = require('zlib');
const tarStream = require('tar-stream');
const fs = require('fs');
const { dirname } = require('path');
const mkdirp = require('./mkdirp.js');
const debug = require('./debug.js');

module.exports = function tar (cacheDir, destDir) {
  debug(() => `untar ${cacheDir} ${destDir}`);
  const gunzip = zlib.createGunzip();
  const extractStream = tarStream.extract();
  extractStream.on('entry', (header, stream, next) => {
    if (header.type !== 'file') {
      stream.resume();
      stream.on('end', next);
      return;
    }
    const name = header.name.slice(header.name.indexOf('/'));
    const filename1 = destDir + name;
    const filename2 = cacheDir + name;
    let toMkdirp = 2;
    mkdirp(dirname(filename1), onOneMkdirp);
    mkdirp(dirname(filename2), onOneMkdirp);
    function onOneMkdirp (err) {
      if (err) {
        return next(err);
      }
      if (--toMkdirp === 0) {
        onBothMkdirp();
      }
    }
    function onBothMkdirp () {
      const writeStream1 = fs.createWriteStream(filename1);
      const writeStream2 = fs.createWriteStream(filename2);
      let closed = 0;
      const onClose = () => {
        if (++closed === 2) {
          next();
        }
      };
      writeStream1.on('close', onClose);
      writeStream2.on('close', onClose);
      stream.pipe(writeStream1);
      stream.pipe(writeStream2);
    }
  });
  extractStream.on('finish', () => gunzip.emit('tar_finish'));
  extractStream.on('error', e => gunzip.emit('error', e));
  gunzip.pipe(extractStream);
  return gunzip;
};
