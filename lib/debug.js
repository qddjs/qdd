'use strict';

const config = require('./config.js');

module.exports =
  config.debug
    ? fn => process._rawDebug(`QDD: ${fn()}`)
    : () => {};
