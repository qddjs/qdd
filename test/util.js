'use strict';

const {
  mkdtemp: mkdtempCb,
  readdir: readdirCb,
  stat: statCb
} = require('fs');
const { exec: execCb } = require('child_process');
const path = require('path');
const util = require('util');
const os = require('os');
const cpr = util.promisify(require('qfastfs').cpr);
const exec = util.promisify(execCb);
const mkdtemp = util.promisify(mkdtempCb);
const readdir = util.promisify(readdirCb);
const stat = util.promisify(statCb);
const fixturesDir = path.resolve(__dirname, 'fixtures');

const QDD = path.resolve(__dirname, '..', 'index.js');

async function mkTestDir (fixtureName) {
  const tmpdir = await mkdtemp(path.join(os.tmpdir(), 'qdd-test-'));
  await cpr(path.join(fixturesDir, fixtureName), tmpdir);
  const origDir = process.cwd();
  process.chdir(tmpdir);
  return async () => {
    process.chdir(origDir);
    try {
      await exec(`rm -rf ${tmpdir}`);
    } catch (e) {
      // This seems to fail on Travis. Not a huge deal.
    }
  };
}

function getTree () {
  return tree(path.join(process.cwd(), 'node_modules'));
}

function clearNodeModules () {
  return exec(`rm -rf node_modules`);
}

function runQdd (opts) {
  return exec(`node --no-warnings ${QDD}` + (opts ? ' ' + opts : ''));
}

async function getQddTree (opts) {
  await clearNodeModules();
  await runQdd(opts);
  return getTree();
}

const npmTrees = {};

async function getNpmTree (opts) {
  // This caching of npm trees speeds the tests up quite a bit.
  const treeKey = opts || 'DEFAULT';
  if (treeKey in npmTrees) {
    return npmTrees[treeKey];
  }
  await clearNodeModules();
  await exec(`npm ci --ignore-scripts` + (opts ? ' ' + opts : ''));
  const tree = await getTree();
  npmTrees[treeKey] = tree;
  return tree;
}

async function tree (dir, topLevel = true) {
  const contents = await readdir(dir);
  const result = {};
  for (let i = 0; i < contents.length; i++) {
    const item = contents[i];
    if (item.startsWith('.') && !topLevel) {
      continue;
    }
    const fullItem = dir + '/' + item;
    const stats = await stat(fullItem);
    if (stats.isDirectory()) {
      result[item] = await tree(fullItem, false);
    } else if (item === 'package.json') {
      result[item] = 'package.json';
    } else {
      result[item] = stats.size;
    }
  }
  return result;
}

module.exports = {
  clearNodeModules,
  runQdd,
  mkTestDir,
  exec,
  getQddTree,
  getNpmTree,
  tree,
  QDD
};
