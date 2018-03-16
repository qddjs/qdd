'use strict';

module.exports = {
  cacheDir: process.argv[2] === '--cache' ? process.argv[3] : `${process.env.HOME}/.cache/qdd`
};
