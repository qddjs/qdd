#!/usr/bin/env node
'use strict';

const config = require('./lib/config.js');
const cp = require('./lib/cp.js');
const download = require('./lib/download.js');
const mkdirp = require('./lib/mkdirp.js');
const isdir = require('./lib/isdir.js');

const fs = require('fs');
const util = require('util');
let worker;
try {
  worker = require('worker_threads');
} catch (e) {
  // Older node. No workers.
}

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
function install (mod, dir, runInWorker) {
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
    if (runInWorker) {
      runInWorker([name, integrity, url, destDir, cacheDir]);
    } else {
      todos.push(installOne.bind(null, name, integrity, url, destDir, cacheDir));
    }
    if (entry.dependencies) {
      install(entry, destDir, runInWorker);
    }
  }
}

function installOne (name, integrity, url, destDir, cacheDir, cb) {
  if (cacheDir) {
    isdir(cacheDir, (err, isDir) => {
      if (err || !isDir) {
        return download(cacheDir, url, integrity, destDir, cb);
      }
      cp(cacheDir, destDir, false, cb);
    });
  } else {
    return download(cacheDir, url, integrity, destDir, cb);
  }
}

function doTheTodos() {
  for (const fn of todos) {
    fn(err => {
      if (err) {
        throw err;
      }
    });
  }
}

function makeWorker() {
  const w = new worker.Worker(__filename);
  w.on('error', err => {
    throw err;
  });
  return w;
}


if (!worker) {
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
} else {
  if (worker.isMainThread) {
    const os = require('os');
    const numWorkers = os.cpus().length;
    const workers = [];
    for (let i = 0; i < numWorkers; i++) workers.push(makeWorker());
    let toRun = 0;
    const runInWorker = (args) => {
      toRun++;
      const w = workers[Math.floor(Math.random()*numWorkers)];
      w.on('message', msg => {
        if (msg === 'done') {
          toRun--;
        }
        if (toRun === 0) {
          workers.forEach(wrk => wrk.terminate());
        }
      });
      w.postMessage(args);
    }
    install(tree, process.cwd(), runInWorker);
  } else {
    worker.parentPort.on('message', args => installOne(...args, err => {
      if (err) {
        throw err;
      }
      worker.parentPort.postMessage('done');
    }));
  }
}
