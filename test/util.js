'use strict';

const { mkdtemp: mkdtempCb } = require('fs');
const { exec: execCb } = require('child_process');
const path = require('path');
const util = require('util');
const os = require('os');
const cpr = util.promisify(require('../lib/cp.js'));
const exec = util.promisify(execCb);
const mkdtemp = util.promisify(mkdtempCb);
const fixturesDir = path.resolve(__dirname, 'fixtures');

const QDD = path.resolve(__dirname, '..', 'index.js');

async function mkTestDir (fixtureName) {
  const tmpdir = await mkdtemp(path.join(os.tmpdir(), 'qdd-test-'));
  await cpr(path.join(fixturesDir, fixtureName), tmpdir, false);
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

async function getTree () {
  return (await exec('tree -s -p ./node_modules', {
    maxBuffer: 100 * 1024 * 1024
  }))
    .stdout
    .replace(/\[d.*\d+\]/g, '[DIR]')
    .replace(/\[-[rwx-]+ /g, '[ ')
    .replace(/\[ +\d+\] {2}package.json/g, 'package.json');
}

function clearNodeModules () {
  return exec(`rm -rf node_modules`);
}

async function getQddTree (opts, env = {}) {
  await clearNodeModules();
  await exec(`node --no-warnings ${QDD}` + (opts ? ' ' + opts : ''));
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

module.exports = { mkTestDir, exec, getQddTree, getNpmTree };
