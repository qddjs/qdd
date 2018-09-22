'use strict';

const config = {};

const cacheDirIndex = process.argv.indexOf('--cache');
if (cacheDirIndex >= 0) {
  config.cacheDir = process.argv[cacheDirIndex + 1];
} else {
  config.cacheDir = process.env.QDD_CACHE || `${process.env.HOME}/.cache/qdd`;
}

config.debug = process.argv.includes('--debug') || 'QDD_DEBUG' in process.env;

const concurrencyIndex = process.argv.indexOf('--concurrency');
if (concurrencyIndex >= 0) {
  config.concurrency = Number(process.argv[concurrencyIndex + 1]);
} else {
  config.concurrency = process.env.QDD_CONCURRENCY
    ? Number(process.env.QDD_CONCURRENCY)
    : 10;
}

const http = require('http');
const https = require('https');
http.globalAgent.maxSockets = config.concurrency;
https.globalAgent.maxSockets = config.concurrency;

config.production = process.argv.includes('--prod') ||
  process.argv.includes('--production') ||
  'QDD_PROD' in process.env ||
  'QDD_PRODUCTION' in process.env ||
  process.env.NODE_ENV === 'production' ||
  process.env.NODE_ENV === 'prod';

config.noCache = process.argv.includes('--nocache') ||
  'QDD_NOCACHE' in process.env;

config.cacheOnly = process.argv.includes('--onlycache') ||
  'QDD_ONLYCACHE' in process.env;

module.exports = config;
