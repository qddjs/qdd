#!/usr/bin/env node
'use strict';

const config = require('./lib/config.js');
const cp = require('./lib/cp.js');
const download = require('./lib/download.js');
const mkdirp = require('./lib/mkdirp.js');
const { isdir } = require('./lib/fastfs.js');

const fs = require('fs');
const util = require('util');

const isProd =
  'QDD_PROD' in process.env ||
  process.env.NODE_ENV === 'production' ||
  process.env.NODE_ENV === 'prod';

const useCache = !('QDD_NOCACHE' in process.env);

if (fs.existsSync(`${process.cwd()}/node_modules`)) {
  console.error('Please delete your node_modules directory before installing.');
  process.exit(1);
}

const tree = require(`${process.cwd()}/package-lock.json`);

const todos = [];
function install (mod, dir) {
  const deps = mod.dependencies;
  if (!deps) return;

  const depEntries = Object.entries(deps);
  for (const [name, entry] of depEntries) {
    if (entry.bundled) {
      continue;
    }
    if (isProd && entry.dev) {
      continue;
    }

    const { integrity, resolved: url } = entry;
    if (!integrity || !url) {
      console.error('invalid entry found in package-lock.json');
      console.error(util.inspect({ [name]: entry }));
      console.error('fix this, delete node_modules, and try again');
      process.exit(1);
    }
    const destDir = `${dir}/node_modules/${name}`;
    const cacheDir = useCache ? config.cacheDir + '/' + integrity : null;
    todos.push(installOne.bind(null, name, integrity, url, destDir, cacheDir));
    if (entry.dependencies) {
      install(entry, destDir);
    }
  }
}

function installOne (name, integrity, url, destDir, cacheDir, cb) {
  if (cacheDir) {
    isdir(cacheDir, (err, isDir) => {
      if (err || !isDir) {
        return download(cacheDir, url, integrity, destDir, cb);
      }
      cp(cacheDir, destDir, mkdirp, true, cb);
    });
  } else {
    return download(cacheDir, url, integrity, destDir, cb);
  }
}

function doTheTodos () {
  for (const fn of todos) {
    fn(err => {
      if (err) {
        throw err;
      }
    });
  }
}

install(tree, process.cwd());

if (useCache) {
  mkdirp(config.cacheDir, (err) => {
    if (err) {
      throw err;
    }
    doTheTodos();
  });
} else {
  doTheTodos();
}
