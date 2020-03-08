const path = require('path');
const util = require('util');
const { exec: execCb } = require('child_process');
const exec = util.promisify(execCb);

const { mkTestDir } = require('./test/util.js');

const QDD = path.resolve(__dirname, 'index.js');

const freshNpmTimes = [];
const freshYarnTimes = [];
const freshQddTimes = [];
const primedNpmTimes = [];
const primedYarnTimes = [];
const primedQddTimes = [];

async function timeCmd(cmd, cacheDir) {
  if (cacheDir) {
    await exec(`rm -rf ${cacheDir}`);
  }
  await exec(`rm -rf node_modules`)
  const start = process.hrtime();
  await exec(cmd);
  const elapsed = process.hrtime(start);
  return elapsed[0] + elapsed[1] / 1e9;
}

async function freshNpm () {
  const time = await timeCmd(
    `npm ci --ignore-scripts --cache .npm-cache`,
    '.npm-cache'
  );
  freshNpmTimes.push(time);
  console.log(' fresh cache npm ci:', time, 'seconds');
}

async function freshYarn () {
  const time = await timeCmd(
    `yarn --ignore-scripts --cache-folder .yarn-cache`,
    '.yarn-cache'
  );
  freshYarnTimes.push(time);
  console.log('   fresh cache yarn:', time, 'seconds');
}

async function freshQdd () {
  const time = await timeCmd(
    `node ${QDD} --cache .qdd-cache`,
    '.qdd-cache'
  );
  freshQddTimes.push(time);
  console.log('    fresh cache qdd:', time, 'seconds');
}

async function primedNpm () {
  const time = await timeCmd(
    `npm ci --ignore-scripts --cache .npm-cache`
  );
  primedNpmTimes.push(time);
  console.log('primed cache npm ci:', time, 'seconds');
}

async function primedYarn () {
  const time = await timeCmd(
    `yarn --ignore-scripts --cache-folder .yarn-cache`
  );
  primedYarnTimes.push(time);
  console.log('  primed cache yarn:', time, 'seconds');
}

async function primedQdd () {
  const time = await timeCmd(
    `node ${QDD} --cache .qdd-cache`
  );
  primedQddTimes.push(time);
  console.log('   primed cache qdd:', time, 'seconds');
}

const TIMES = Number(process.env.ITERATIONS) || 10;

function average (nums) {
  let total = 0;
  for (const i of nums) {
    total += i;
  }
  return total / nums.length;
}

(async () => {
  const cleanup = await mkTestDir('bench');
  for (let i = 0; i < TIMES; i++) {
    await freshNpm();
    await freshYarn();
    await freshQdd();
  }
  for (let i = 0; i < TIMES; i++) {
    await primedNpm();
    await primedYarn();
    await primedQdd();
  }
  await cleanup();
  console.log(' fresh cache npm ci (avg):', average(freshNpmTimes), 'seconds');
  console.log('   fresh cache yarn (avg):', average(freshYarnTimes), 'seconds');
  console.log('    fresh cache qdd (avg):', average(freshQddTimes), 'seconds');
  console.log('primed cache npm ci (avg):', average(primedNpmTimes), 'seconds');
  console.log('  primed cache yarn (avg):', average(primedYarnTimes), 'seconds');
  console.log('   primed cache qdd (avg):', average(primedQddTimes), 'seconds');
})();
