<div align="center">
<img src="./qdd-logo.svg"/>
</div>

[![Build Status](https://travis-ci.org/bengl/qdd.svg?branch=master)](https://travis-ci.org/bengl/qdd)
[![Coverage Status](https://coveralls.io/repos/github/bengl/qdd/badge.svg?branch=master)](https://coveralls.io/github/bengl/qdd?branch=master)


**`qdd`** is short for **q**uickly **d**ownload **d**ependencies. That's all it
does. It's meant as a replacement for `npm ci` in situations where you don't
need install scripts. (This means no compiled/native-addon modules either.)

This corner is cut in order to deliver modules to you at high speed. See the
Benchmarks section below for more details.

This tool, `qdd`, is not meant as a replacement for `npm` or even for `npm ci`.
`npm` is a full-featured JavaScript project management tool, and `qdd` is not.
`npm ci` isn't a full-featured tool, but still is subject to some overhead in
order to maintain levels of compatibility that we're completely ignoring.

All software is about tradeoffs. In this case, we're making the tradeoff that
this tool is only useful if all your dependencies are `install`-script-free.
This is a prette severe limitation, but in many situations, this is still good
enough to get the job done.

## Example

```
npm i -g qdd
# And now, in a directory with a package-lock.json
qdd
```

## Can I Use It?

To get an idea whether `qdd` might be appropriate for your project, check that
the following are true:

* Your project operates just fine if you pass `--ignore-scripts` to `npm` or
  `yarn` when you install dependencies.
* You don't rely on `bundleDependencies`.
* None of your dependencies are from git URLs or other non-registry sources.
* Your operating system is UNIXey (*).

> (*) Note: For the moment, Windows is not supported. This will change real
> soon, I swear!

## Usage

In a directory containing a `package-lock.json`, run `qdd` on its own to
install the dependencies into `$PWD/node_modules/`. **The `node_modules`
directory must not exist prior to running `qdd`. It will not be deleted
automatically, as it would in `npm ci`.**

If the first argument passed to `qdd` does not start with a `-`, then the
command will be passed through to `npm`, as found on the `$PATH`. This is useful
for situations where you want to use `qdd` in place of `npm` as your project 
management tool. For example, you can install a single package into your project
with `qdd install package-name`.

### Options

Options may either be given as environment variables of the form `QDD_OPTION` or
as command line arguments of the form `--option [value]`. For boolean values,
set the environment variable to `1` or use the command line argument without a
`value` to set the option to true (defualt is false).

* `prod|production` (boolean): Skip installing `devDependencies`.
  * Setting the environment variable `NODE_ENV=prod` or `NODE_ENV=production`
    will also turn this on.
* `concurrency` (number): Number of sockets to download with. (Default 10.)
* `debug` (boolean): Get some very verbose logging to stderr.
* `cache` (path string): Location to store the cache. (Default
  `$HOME/.cache/qdd`.)
* `nocache` (boolean): Do not use the disk cache at all.
* `onlycache` (boolean): Do not install in `node_modules`, and only use the disk
  cache.

## Experimental Features

Alongside `qdd`, `qdd-node` is also installed. This will run your application
just as `node` would, except the loader will check qdd's cache directory. All
node options are supported. This works nicely with `qdd --onlycache`, which
skips installing into `node_modules`. Note that that would not really be
necessary because if the cache is missing a package, then `qdd --onlycache` will
be run for you implicitly and then the module will be loaded. To specify the
cache directory for `qdd-node`, set the `QDD_CACHE` environment variable to
absolute path for the cache directory.

To summarize, if your app is qdd-compatible (see "Can I Use It?" section above),
then you can simply run it with `qdd-node` instead of `node`, and don't bother
with the installation step. If your cache is fresh, it will take some time to
install the packages into the cache, but otherwise this should be fairly
quick.

Since this is an experimental feature, the following limitations apply:

* `qdd-node` must be run in the same directory as `package-lock.json`.
* EcmaScript Module loading is not working.

## Benchmarks

You can run the benchmarks with `npm run bench`. This will run both `npm ci` and
`qdd`, both with primed caches and fresh caches, 10x for each case, and output
the averages. You can set the number of iterations with an `ITERATIONS`
environment variable.

On my machine (a Lenovo X1 Carbon from mid 2016), this gives the following
output:

```
 fresh cache npm ci (avg): 7.5899417363 seconds
    fresh cache qdd (avg): 3.9653772702 seconds
primed cache npm ci (avg): 5.4712137427 seconds
   primed cache qdd (avg): 0.4172178746 seconds
```

It's pretty quick, but remember that speed like this comes with tradeoffs.

## Contributing

See CONTRIBUTING.md.

This project uses the Developer's Certificate of Origin. See DCO.txt.

## Code of Conduct

See CODE_OF_CONDUCT.md.

## License

MIT License. See LICENSE.txt.
