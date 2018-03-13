"use strict";

const util = require("util");
const debug = require("./debug.js");
const nodeTar = require("tar");
const untar = util.promisify(nodeTar.x);

module.exports = async function tar(filename, destDir) {
  debug(() => `untar ${filename} ${destDir}`);
  await untar({ file: filename, cwd: destDir });
};
