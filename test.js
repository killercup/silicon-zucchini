var l = require('lodash');
var fs = require('fs');
var path = require('path');
var equalDirs = require('assert-dir-equal');
var exec = require('./lib/helpers/exec');

var EXAMPLES_PATH = './examples';

/* eslint no-sync:0 */
var examples = fs.readdirSync(EXAMPLES_PATH).filter(function (entry) {
  return fs.statSync(path.join(EXAMPLES_PATH, entry)).isDirectory();
});

describe("Silicon Zucchini", function () {
  examples.forEach(function (example) {
    it("Example " + example, function () {
      var examplePath = path.resolve(EXAMPLES_PATH, example);
      return exec('node', ['build.js'], {
        cwd: examplePath, env: l.defaults({DEBUG: 'false'}, process.env)
      })
      .then(function () {
        return equalDirs(
          path.join(examplePath, 'expected'),
          path.join(examplePath, 'build')
        );
      });
    });
  });
});
