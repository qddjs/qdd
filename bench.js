const path = require('path');
const util = require('util');
const { exec: execCb } = require('child_process');
const exec = util.promisify(execCb);

const freshNpmTimes = [];
const freshQddTimes = [];
const primedNpmTimes = [];
const primedQddTimes = [];

async function freshNpm () {
  await exec(`npm cache clean --force`);
  await exec(`rm -rf testapp/node_modules`);
  const start = process.hrtime();
  await exec(`npm ci`, { cwd: path.join(__dirname, 'testapp') });
  const elapsed = process.hrtime(start);
  const time = elapsed[0] + elapsed[1] / 1e9;
  freshNpmTimes.push(time);
  console.log(' fresh cache npm ci:', time, 'seconds');
}

async function freshQdd () {
  await exec(`rm -rf ~/.cache/qdd`);
  await exec(`rm -rf testapp/node_modules`);
  const start = process.hrtime();
  await exec('node ../index.js', { cwd: path.join(__dirname, 'testapp') });
  const elapsed = process.hrtime(start);
  const time = elapsed[0] + elapsed[1] / 1e9;
  freshQddTimes.push(time);
  console.log('    fresh cache qdd:', time, 'seconds');
}

async function primedNpm () {
  await exec(`rm -rf testapp/node_modules`);
  const start = process.hrtime();
  await exec(`npm ci`, { cwd: path.join(__dirname, 'testapp') });
  const elapsed = process.hrtime(start);
  const time = elapsed[0] + elapsed[1] / 1e9;
  primedNpmTimes.push(time);
  console.log('primed cache npm ci:', time, 'seconds');
}

async function primedQdd () {
  await exec(`rm -rf testapp/node_modules`);
  const start = process.hrtime();
  await exec('node ../index.js', { cwd: path.join(__dirname, 'testapp') });
  const elapsed = process.hrtime(start);
  const time = elapsed[0] + elapsed[1] / 1e9;
  primedQddTimes.push(time);
  console.log('   primed cache qdd:', time, 'seconds');
}

const TIMES = 10;

function average (nums) {
  let total = 0;
  for (const i of nums) {
    total += i;
  }
  return total / nums.length;
}

(async () => {
  for (let i = 0; i < TIMES; i++) {
    await freshNpm();
    await freshQdd();
  }
  for (let i = 0; i < TIMES; i++) {
    await primedNpm();
    await primedQdd();
  }
  console.log(' fresh cache npm ci (avg):', average(freshNpmTimes), 'seconds');
  console.log('    fresh cache qdd (avg):', average(freshQddTimes), 'seconds');
  console.log('primed cache npm ci (avg):', average(primedNpmTimes), 'seconds');
  console.log('   primed cache qdd (avg):', average(primedQddTimes), 'seconds');
})();
