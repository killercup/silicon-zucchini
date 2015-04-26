var fs = require('vinyl-fs');
var l = require('lodash');

var Promise = require('bluebird');
if (process.env.DEBUG) { Promise.longStackTraces(); }

var LOG_NAME = 'Zucchini';
process.env.DEBUG = process.env.DEBUG ||
  ['log', 'warn', 'error']
  .map(function (i) { return LOG_NAME + ':' + i; })
  .join(',');

var log = require('debug-logger')(LOG_NAME);
log.inspectOptions = {colors: true};

function watchMyZucchini(opts, cb) {
  fs.watch(l.flatten([opts.data, opts.schemas, opts.templates]))
  .on('change', cb);
}

module.exports = {
  build: require('./src/build-site'),
  compile: require('./src/build-site'),
  watch: watchMyZucchini,
  styleguide: require('./src/build-styleguide'),
  Helpers: require('./src/transforms')
};
