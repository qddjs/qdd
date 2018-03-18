'use strict';

const assert = require('assert');
const { exec: execCb } = require('child_process');
const util = require('util');
const path = require('path');
const exec = util.promisify(execCb);

const test = require('pitesti')({ timeout: 60000 });

test`fresh cache trees are equal`(async () => {
  await exec(`rm -rf testapp/node_modules`);
  await exec(`npm ci`, { cwd: path.join(__dirname, 'testapp') });
  const npmTree = (await exec(`tree -s ${__dirname}/testapp/node_modules`, {
    maxBuffer: 100 * 1024 * 1024
  })).stdout.replace(/\[ +\d+\] {2}package.json/g, 'package.json');
  // ^ package.jsons have different sizes
  await exec(`rm -rf ~/.cache/qdd`);
  await exec(`rm -rf testapp/node_modules`);
  await exec('node --no-warnings ../index.js', { cwd: path.join(__dirname, 'testapp') });
  const qddTree = (await exec(`tree -s ${__dirname}/testapp/node_modules`, {
    maxBuffer: 100 * 1024 * 1024
  })).stdout.replace(/\[ +\d+\] {2}package.json/g, 'package.json');
  // ^ package.jsons have different sizes
  assert.strictEqual(npmTree, qddTree);
});

test`primed cache trees are equal`(async () => {
  await exec(`rm -rf testapp/node_modules`);
  await exec(`npm ci`, { cwd: path.join(__dirname, 'testapp') });
  const npmTree = (await exec(`tree -s ${__dirname}/testapp/node_modules`, {
    maxBuffer: 100 * 1024 * 1024
  })).stdout.replace(/\[ +\d+\] {2}package.json/g, 'package.json');
  // ^ package.jsons have different sizes
  await exec(`rm -rf testapp/node_modules`);
  await exec('node --no-warnings ../index.js', { cwd: path.join(__dirname, 'testapp') });
  const qddTree = (await exec(`tree -s ${__dirname}/testapp/node_modules`, {
    maxBuffer: 100 * 1024 * 1024
  })).stdout.replace(/\[ +\d+\] {2}package.json/g, 'package.json');
  // ^ package.jsons have different sizes
  assert.strictEqual(npmTree, qddTree);
});

test();
