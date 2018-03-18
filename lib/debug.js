'use strict';

module.exports =
  'QDD_DEBUG' in process.env
    ? fn => process._rawDebug(`QDD: ${fn()}`)
    : () => {};
