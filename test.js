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

test`fresh cache trees are equal, with another cache`(async () => {
  await exec(`rm -rf testapp/node_modules`);
  await exec(`npm ci`, { cwd: path.join(__dirname, 'testapp') });
  const npmTree = (await exec(`tree -s ${__dirname}/testapp/node_modules`, {
    maxBuffer: 100 * 1024 * 1024
  })).stdout.replace(/\[ +\d+\] {2}package.json/g, 'package.json');
  // ^ package.jsons have different sizes
  await exec(`rm -rf /tmp/testqddcache`);
  await exec(`rm -rf testapp/node_modules`);
  await exec('node --no-warnings ../index.js --cache /tmp/testqddcache', {
    cwd: path.join(__dirname, 'testapp')
  });
  const qddTree = (await exec(`tree -s ${__dirname}/testapp/node_modules`, {
    maxBuffer: 100 * 1024 * 1024
  })).stdout.replace(/\[ +\d+\] {2}package.json/g, 'package.json');
  // ^ package.jsons have different sizes
  assert.strictEqual(npmTree, qddTree);
});

test`no cache trees are equal`(async () => {
  await exec(`rm -rf testapp/node_modules`);
  await exec(`npm ci`, { cwd: path.join(__dirname, 'testapp') });
  const npmTree = (await exec(`tree -s ${__dirname}/testapp/node_modules`, {
    maxBuffer: 100 * 1024 * 1024
  })).stdout.replace(/\[ +\d+\] {2}package.json/g, 'package.json');
  // ^ package.jsons have different sizes
  await exec(`rm -rf testapp/node_modules`);
  await exec('node --no-warnings ../index.js', {
    cwd: path.join(__dirname, 'testapp'),
    env: Object.assign({}, process.env, { QDD_NOCACHE: '1' })
  });
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

test`prod mode trees are equal`(async () => {
  await exec(`rm -rf testapp/node_modules`);
  await exec(`npm ci --only=prod`, { cwd: path.join(__dirname, 'testapp') });
  const npmTree = (await exec(`tree -s ${__dirname}/testapp/node_modules`, {
    maxBuffer: 100 * 1024 * 1024
  })).stdout.replace(/\[ +\d+\] {2}package.json/g, 'package.json');
  // ^ package.jsons have different sizes
  await exec(`rm -rf testapp/node_modules`);
  await exec('node --no-warnings ../index.js', {
    cwd: path.join(__dirname, 'testapp'),
    env: Object.assign({}, process.env, { QDD_PROD: '1' })
  });
  const qddTree = (await exec(`tree -s ${__dirname}/testapp/node_modules`, {
    maxBuffer: 100 * 1024 * 1024
  })).stdout.replace(/\[ +\d+\] {2}package.json/g, 'package.json');
  // ^ package.jsons have different sizes
  assert.strictEqual(npmTree, qddTree);
});

test`exit 1 if node_modules still present`(async () => {
  let err;
  try {
    await exec('node ../index.js', { cwd: path.join(__dirname, 'testapp') });
  } catch (e) {
    err = e;
  }
  assert(err);
  assert.strictEqual(err.code, 1);
  assert.strictEqual(
    err.stderr.toString(),
    'Please delete your node_modules directory before installing.\n'
  );
});

test`debug`(() => {
  const debugFile = './lib/debug.js';
  const results = [];
  process._rawDebug = results.push.bind(results);
  {
    const debug = require(debugFile);
    debug(() => 'hello');
    debug(() => 'world');
  }
  delete require.cache[require.resolve(debugFile)];
  delete require.cache[require.resolve('./lib/config.js')];
  process.env.QDD_DEBUG = 1;
  {
    const debug = require(debugFile);
    debug(() => 'hola');
    debug(() => 'mundo');
  }
  assert.deepStrictEqual(results, ['QDD: hola', 'QDD: mundo']);
  delete process.env.QDD_DEBUG;
});

test`config`(() => {
  const absoluteConfig = require.resolve('./lib/config.js');
  delete require.cache[absoluteConfig];
  let config = require('./lib/config.js');
  assert.deepStrictEqual(config, {
    cacheDir: `${process.env.HOME}/.cache/qdd`,
    debug: false,
    concurrency: 10,
    production: false,
    noCache: false
  });
  delete require.cache[absoluteConfig];
  process.argv = [
    process.execPath,
    __filename,
    '--cache',
    'cacheFoo',
    '--debug',
    '--concurrency',
    '15',
    '--prod',
    '--nocache'
  ];
  config = require('./lib/config.js');
  assert.deepStrictEqual(config, {
    cacheDir: 'cacheFoo',
    debug: true,
    concurrency: 15,
    production: true,
    noCache: true
  });
  delete require.cache[absoluteConfig];
  process.argv = [process.execPath, __filename, '--production'];
  process.env.QDD_CACHE = 'cacheFoo';
  process.env.QDD_DEBUG = '1';
  process.env.QDD_CONCURRENCY = '15';
  process.env.QDD_NOCACHE = '1';
  config = require('./lib/config.js');
  assert.deepStrictEqual(config, {
    cacheDir: 'cacheFoo',
    debug: true,
    concurrency: 15,
    production: true,
    noCache: true
  });
  delete require.cache[absoluteConfig];
  process.argv = [process.execPath, __filename];
  process.env = { QDD_PROD: '1' };
  assert.strictEqual(config.production, true);
  delete require.cache[absoluteConfig];
  process.env = { QDD_PRODUCTION: '1' };
  assert.strictEqual(config.production, true);
  delete require.cache[absoluteConfig];
  process.env = { NODE_ENV: 'prod' };
  assert.strictEqual(config.production, true);
  delete require.cache[absoluteConfig];
  process.env = { NODE_ENV: 'production' };
  assert.strictEqual(config.production, true);
});

test();
