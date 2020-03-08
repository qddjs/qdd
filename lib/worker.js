'use strict';

const download = require('qdownload');
require('./config');

const { parentPort } = require('worker_threads')

parentPort.on('message', ([id, args]) => {
  download(...args, err => {
    if (err && err.code === 'EEXIST') {
      err = undefined
    }
    parentPort.postMessage([id, err]);
  });
});
