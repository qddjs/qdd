#!/usr/bin/env node
'use strict';

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
      todos.push(installOne.bind(null, name, integrity, url, destDir, cacheDir));
      if (entry.dependencies) {
        install(entry, destDir);
      }
      if (topLevel && destDir) {
        binTodos.push(installBin.bind(null, name, destDir, `${dir}/node_modules/.bin`));
      }
    }
  }

  function installOne (name, integrity, url, destDir, cacheDir, cb) {
    if (cacheDir) {
      isdir(cacheDir, (err, isDir) => {
        if (err || !isDir) {
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
    for (const fn of todos) {
      fn(err => {
        todo--;
        if (err) {
          throw err;
        }
        if (todo === 0) {
          for (const binFn of binTodos) {
            binFn(err => {
              if (err) {
                throw err;
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
