# qdd

## Example

```
npm i -g qdd
# And now, in a directory with a package-lock.json
qdd
```

## Description

**`qdd`** is short for **qu**ickly **d**ownload **d**ependencies. That's all it
does. It's meant as a replacement for `npm ci` in situations where:

* You don't need install scripts. (Note: this means no compiled modules.)
* You don't need the `node_modules/.bin` directory.

These two corners are cut in order to deliver modules to you at high speed. See
the Benchmarks section below for more details.

This tool, `qdd`, is not meant as a replacement for `npm` or even for `npm ci`.
`npm` is a full-featured JavaScript project management tool, and `qdd` is not.
`npm ci` isn't a full-featured tool, but still is subject to some overhead in
order to maintain levels of compatibility that we're completely ignoring.

All software is about tradeoffs. In this case, we're making the tradeoff that
this tool is only useful if all your dependencies are `install`-script-free, and
that you don't need the `.bin` directory. These are some pretty severe
limitations, but in many situations, this is still good enough to get the job
done.

## Can I Use It?

To get an idea whether `qdd` might be appropriate for your project, check that
the following are true:

* You don't rely on any dependencies' executables in your project's `"scripts"`
  in `package.json`.
* Your project operates just fine if you pass `--ignore-scripts` to `npm` or
  `yarn` when you install dependencies.
* Your operating system is UNIXey (*).

> (*) Note: For the moment, Windows is not supported. This will change real
> soon, I swear!

## Usage

In a directory containing a `package-lock.json`, run `qdd` on its own to
install the dependencies into `$PWD/node_modules/`. **The `node_modules`
directory must not exist prior to running `qdd`. It will not be deleted
automatically, as it would in `npm ci`.**

To skip installing `devDependencies`, set the environment variable `QDD_PROD`
to `1`.

`qdd` will download dependencies with 10 sockets by default. You can change
this number by setting the environment variable `QDD_CONCURRENCY`.

You can get some (very) verbose logging of what's happening inside `qdd` by
setting the environment variable `QDD_DEBUG` to `1`.

## Benchmarks

You can run the benchmarks with `npm run bench`. This will run both `npm ci` and
`qdd`, both with primed caches and fresh caches, 10x for each case, and output
the averages.

On my machine (a Lenovo X1 Carbon from mid 2016), this gives the following
output:

```
 fresh cache npm ci (avg): 7.504142213100001 seconds
    fresh cache qdd (avg): 5.1525584211 seconds
primed cache npm ci (avg): 5.377409749099999 seconds
   primed cache qdd (avg): 0.722392005 seconds
```

It's pretty quick, but remember that speed like this comes with tradeoffs.

## Contributing

See CONTRIBUTING.md.

This project uses the Developer's Certificate of Origin. See DCO.txt.

## Code of Conduct

See CODE_OF_CONDUCT.md.

## License

MIT License. See LICENSE.txt.
