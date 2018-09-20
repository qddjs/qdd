'use strict';

const Module = require('module');
const fs = require('fs');
const { execSync } = require('child_process');

const cacheDir = (process.env.QDD_CACHE || `${process.env.HOME}/.cache/qdd`);

// 1. Set up the lock tree

const lockTree = require(process.cwd() + '/package-lock.json');
lockTree.requires = lockTree.dependencies;

function getDep(node, depName) {
  const deps = node.dependencies;
  return deps && deps[depName] ? deps[depName] : getDep(node.parent, depName);
}

(function augmentTree(node, parent) {
  for (const depName of Object.keys(node.dependencies || {})) {
    const dep = node.dependencies[depName];
    dep.parent = node;
    augmentTree(dep);
  }
  node.requiresNodes = {};
  for (const dep of Object.keys(node.requires || {})) {
    node.requiresNodes[dep] = getDep(node, dep);
  }
  delete node.parent; // no longer needed
})(lockTree);

// 2. Shim the module loader

let installed = false;

function cache(node) {
  const dir = cacheDir + '/' + node.integrity;
  if (!installed) {
    try {
      fs.accessSync(dir, fs.constants.F_OK);
    } catch (e) {
      execSync(`node ${__dirname}/index.js --onlycache`);
    }
    installed = true;
  }
  return dir;
}

let currentParent;

const origFindPath = Module._findPath;
Module._findPath = function (request, paths, isMain) {
  if (isMain) {
    return origFindPath(request, paths, isMain);
  }
  delete currentParent.nextTreeNode;
  const maybeOrig = origFindPath(request, paths, isMain);
  if (maybeOrig) {
    return maybeOrig;
  }
  const node = currentParent.treeNode;
  for (const name of (Object.keys(node.requiresNodes || {}))) {
    if (request === name || request.startsWith(name + '/')) {
      const newNode = node.requiresNodes[name];
      currentParent.nextTreeNode = newNode;
      return origFindPath(request.replace(name, cache(newNode)), paths, isMain);
    }
  }
};

const origResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain) {
  if (!isMain) {
    currentParent = parent;
  }
  return origResolveFilename(request, parent, isMain);
};

const origLoad = Module.prototype.load;
Module.prototype.load = function (filename) {
  this.treeNode = this.parent ?
    (this.parent.nextTreeNode || this.parent.treeNode) :
    lockTree;
  return origLoad.call(this, filename);
};
