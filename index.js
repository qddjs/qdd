#!/usr/bin/env node
'use strict';

const { Worker } = require('worker_threads');

const SIZE = 4;

class WorkerPool {
  constructor() {
    this._pool = []
    for (let i = 0; i < SIZE; i++) {
      const newWorker = new Worker(__dirname + '/lib/worker.js');
      newWorker.once('online', () => {
        newWorker.isOnline = true;
      }).on('error', e => {
        console.log(e.stack)
        throw e
      }).on('message', ([id, err]) => {
        const cb = this._cbMap.get(id);
        cb(err);
        this._cbMap.delete(id);
      });
      this._pool.push(newWorker);
    }
    this._cur = -1;
    this._cbId = -1;
    this._cbMap = new Map()
  }

  postMessage(val, cb) {
    this._cur++;
    if (this._cur === SIZE) {
      this._cur = 0;
    }
    const worker = this._pool[this._cur];
    const cbId = ++this._cbId;
    this._cbMap.set(cbId, cb);
    this._pool[this._cur].postMessage([cbId,val]);
  }

  terminate() {
    for (const worker of this._pool) {
      worker.terminate();
    }
  }
}

(() => { // BEGIN IIFE
  // Need the IIFE so we can do the early return. It's not actually necessary,
  // but standard barfs without it.

  if (process.argv.length > 2 && !process.argv[2].startsWith('-')) {
    const { spawn } = require('child_process');
    spawn('npm', process.argv.slice(2), { stdio: 'inherit' })
      .on('close', (code, signal) => {
        process.exitCode = code || 0;
        if (signal) {
          console.error('npm exited due to signal', signal);
        }
      })
      .on('error', e => {
        throw e;
      });
    return;
  }

  const config = require('./lib/config.js');
  const download = require('qdownload');
  const { isdir, mkdirp, cpr } = require('qfastfs');
  const fs = require('fs');
  const util = require('util');
  const path = require('path');

  const isProd = config.production;

  const useCache = !config.noCache;
  const useDest = !config.cacheOnly;

  if (fs.existsSync(`${process.cwd()}/node_modules`)) {
    console.error('Please delete your node_modules directory before installing.');
    process.exit(1);
  }

  const workerPool = new WorkerPool();

  let tree;
  try {
    tree = require(`${process.cwd()}/package-lock.json`);
  } catch (e) {
    if ('QDD_LOCKJS' in process.env) {
      const content = fs.readFileSync(process.env.QDD_LOCKJS, 'utf8');
      const afterJson = content.split(/^\/\*\*package-lock(?:\s|$)/m)[1];
      if (afterJson) {
        const [json, rest] = afterJson.split(/\*\*\/$/m);
        if (rest) {
          try {
            tree = JSON.parse(json.replace(/^\s*\*/mg, ''));
          } catch (err) {
            throw new Error('badly formed in-line package-lock');
          }
        }
      }
    } else {
      throw e;
    }
  }

  const todos = [];
  const binTodos = [];
  function install (mod, dir, topLevel = false) {
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
      const destDir = useDest ? `${dir}/node_modules/${name}` : null;
      const cacheDir = useCache ? config.cacheDir + '/' + integrity : null;
      todos.push([name, integrity, url, destDir, cacheDir]);
      if (entry.dependencies) {
        install(entry, destDir);
      }
      if (topLevel && destDir) {
        binTodos.push([name, destDir, `${dir}/node_modules/.bin`]);
      }
    }
  }

  function installOne (name, integrity, url, destDir, cacheDir, cb) {
    if (cacheDir) {
      isdir(cacheDir, (err, isDir) => {
        if (err || !isDir) {
          return workerPool.postMessage([url, integrity, cacheDir, destDir], cb)
          return download(url, integrity, cacheDir, destDir, cb);
        }
        if (useDest) {
          cpr(cacheDir, destDir, cb);
        }
      });
    } else {
      return download(url, integrity, cacheDir, destDir, cb);
    }
  }

  function installBin (name, destDir, binDir, cb) {
    mkdirp(binDir, err => {
      if (err) {
        cb(err);
        return;
      }
      let { bin } = require(destDir + '/package.json');
      if (typeof bin === 'string') {
        bin = { [name]: bin };
      }
      for (const binName in bin) {
        try {
          fs.symlinkSync(path.join(destDir, bin[binName]), path.join(binDir, binName));
        } catch (e) {
          cb(e);
          return;
        }
      }
      cb();
    });
  }

  function doTheTodos () {
    let todo = todos.length;
    for (const argList of todos) {
      installOne(...argList, err => {
        todo--;
        if (err) {
          throw err;
        }
        if (todo === 0) {
          let binTodo = binTodos.length;
          if (binTodo === 0) {
            workerPool.terminate()
          }
          for (const binArgList of binTodos) {
            installBin(...binArgList, err => {
              binTodo--;
              if (err) {
                throw err;
              }
              if (binTodo === 0) {
                workerPool.terminate()
              }
            });
          }
        }
      });
    }
  }

  install(tree, process.cwd(), true);

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
})(); // END IIFE

