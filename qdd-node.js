#!/usr/bin/env node
'use strict';

const { join } = require('path');
const { spawnSync } = require('child_process');
const opts = { stdio: 'inherit' };
const args = ['-r', join(__dirname, 'qdd-loader.js'), ...process.argv.slice(2)];

spawnSync(process.execPath, args, opts);
