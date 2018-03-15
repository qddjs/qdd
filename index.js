#!/usr/bin/env node
"use strict";

const config = require("./lib/config.js");
const cp = require("./lib/cp.js");
const download = require("./lib/download.js");
const mkdirp = require('./lib/mkdirp.js');

const fs = require("fs");
const path = require("path");
const util = require("util");

const stat = util.promisify(fs.stat);

const isProd =
  "QDD_PROD" in process.env ||
  process.env.NODE_ENV === "production" ||
  process.env.NODE_ENV === "prod";

if (fs.existsSync(`${process.cwd()}/node_modules`)) {
  console.error("Please delete your node_modules directory before installing.");
  process.exit(1);
}

const tree = require(`${process.cwd()}/package-lock.json`);

const todos = [];
function install(mod, dir) {
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
    todos.push(installOne.bind(null, name, entry, dir));
    if (entry.dependencies) {
      install(entry, `${dir}/node_modules/${name}`);
    }
  }
}

async function installOne(name, entry, dir) {
  if (!entry.integrity || !entry.resolved) {
    console.error("Invalid entry found in package-lock.json");
    console.error(util.inspect({ [name]: entry }));
    console.error("Fix this, delete node_modules, and try again");
    process.exit(1);
  }
  const cached = await getCacheDir(entry.resolved, entry.integrity);
  await cp(cached, `${dir}/node_modules/${name}`);
}

async function getCacheDir(url, integrity) {
  const cacheDir = config.cacheDir + '/' + integrity;
  try {
    const stats = await stat(cacheDir);
    if (stats.isDirectory()) {
      return cacheDir;
    }
  } catch (e) {}
  await download(cacheDir, url, integrity);
  return cacheDir;
}

install(tree, process.cwd());
mkdirp(config.cacheDir)
.then(() => Promise.all(todos.map(x => x())))
.catch(e => {
  console.error(e.stack);
  process.exit(1);
});
