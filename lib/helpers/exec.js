var l = require('lodash');
var Promise = require('bluebird');
var spawn = require('child_process').spawn;

module.exports = function exec(cmd, args, opts) {
  return new Promise(function (resolve, reject) {
    var config = l.defaults({}, opts, {stdio: "inherit"});
    var child = spawn(cmd, args, config);

    if (child.stdout) { child.stdout.pipe(process.stdout); }
    if (child.stderr) { child.stderr.pipe(process.stderr); }

    child.on('error', reject);
    child.on('close', function (exitCode) {
      if (exitCode === 0) {
        resolve();
      } else {
        var commandStr = cmd + (args.length ? (' ' + args.join(' ')) : '');
        reject(new Error(
          "`" + commandStr + "` failed with exit code " + exitCode
        ));
      }
    });
  });
};
