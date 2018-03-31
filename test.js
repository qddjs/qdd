'use strict';

const assert = require('assert');
const { execSync: exec } = require('child_process');
const util = require('util');
const path = require('path');

const test = require('pitesti')({ timeout: 60000 });

test`fresh cache trees are equal`(() => {
  exec(`rm -rf testapp/node_modules`);
  exec(`npm ci`, { cwd: path.join(__dirname, 'testapp') });
  const npmTree = exec(`tree -s ${__dirname}/testapp/node_modules`, {
    maxBuffer: 100 * 1024 * 1024
  }).toString().replace(/\[ +\d+\] {2}package.json/g, 'package.json');
  // ^ package.jsons have different sizes
  exec(`rm -rf ~/.cache/qdd`);
  exec(`rm -rf testapp/node_modules`);
  exec('node --no-warnings ../index.js', { cwd: path.join(__dirname, 'testapp') });
  const qddTree = exec(`tree -s ${__dirname}/testapp/node_modules`, {
    maxBuffer: 100 * 1024 * 1024
  }).toString().replace(/\[ +\d+\] {2}package.json/g, 'package.json');
  // ^ package.jsons have different sizes
  assert.strictEqual(npmTree, qddTree);
});

test`primed cache trees are equal`(() => {
  exec(`rm -rf testapp/node_modules`);
  exec(`npm ci`, { cwd: path.join(__dirname, 'testapp') });
  const npmTree = exec(`tree -s ${__dirname}/testapp/node_modules`, {
    maxBuffer: 100 * 1024 * 1024
  }).toString().replace(/\[ +\d+\] {2}package.json/g, 'package.json');
  // ^ package.jsons have different sizes
  exec(`rm -rf testapp/node_modules`);
  exec('node --no-warnings ../index.js', { cwd: path.join(__dirname, 'testapp') });
  const qddTree = exec(`tree -s ${__dirname}/testapp/node_modules`, {
    maxBuffer: 100 * 1024 * 1024
  }).toString().replace(/\[ +\d+\] {2}package.json/g, 'package.json');
  // ^ package.jsons have different sizes
  assert.strictEqual(npmTree, qddTree);
});

test();
