const path = require('path');
const util = require('util');
const { exec: execCb } = require('child_process');
const exec = util.promisify(execCb);

const { mkTestDir } = require('./test/util.js');

const QDD = path.resolve(__dirname, 'index.js');

class Installer {
  constructor(name, run) {
    this.name = name;
    this.cache = `.${name.replace(' ', '-')}-cache`;
    this.run = run.replace('CACHE', this.cache);
    this.tab = ' '.repeat(7 - name.length);
    this.freshTimes = [];
    this.primedTimes = [];
  }
  
  clearCache () {
    return exec(`rm -rf ${this.cache}`);
  }

  averageFresh() {
    if (!this._averageFresh) {
      this._averageFresh = average(this.freshTimes);
    }
    return this._averageFresh;
  }

  averagePrimed() {
    if (!this._averagePrimed) {
      this._averagePrimed = average(this.primedTimes);
    }
    return this._averagePrimed;
  }

  install () {
    return exec(this.run);
  }
}

const installers = [
  new Installer('npm ci', `npm ci --ignore-scripts --cache CACHE`),
  new Installer('yarn', `yarn --ignore-scripts --cache-folder CACHE`),
  new Installer('pnpm', `pnpm install --ignore-scripts --store CACHE --no-lock`),
  new Installer('qdd', `node ${QDD} --cache CACHE`)
]

async function run(installer) {
  await exec(`rm -rf node_modules`);
  const start = process.hrtime();
  await installer.install();
  const elapsed = process.hrtime(start);
  return elapsed[0] + elapsed[1] / 1e9;
}

async function freshRun(installer) {
  await installer.clearCache();
  const time = await run(installer);
  installer.freshTimes.push(time);
  console.log(`${installer.tab} fresh cache ${installer.name}:`, time, 'seconds');
}

async function primedRun(installer) {
  const time = await run(installer);
  installer.primedTimes.push(time);
  console.log(`${installer.tab}primed cache ${installer.name}:`, time, 'seconds');
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
    for (const installer of installers) {
      await freshRun(installer);
    }
  }
  for (let i = 0; i < TIMES; i++) {
    for (const installer of installers) {
      await primedRun(installer);
    }
  }
  await cleanup();
  console.log(' ------ ');
  for (const installer of installers) {
    console.log(
      `${installer.tab}  fresh cache ${installer.name} (avg):`,
      installer.averageFresh(),
      'seconds'
    );
  }
  for (const installer of installers) {
    console.log(
      `${installer.tab} primed cache ${installer.name} (avg):`,
      installer.averagePrimed(),
      'seconds'
    );
  }

})().catch(e => {
  console.error(e.stack);
  process.exit(1);
});
