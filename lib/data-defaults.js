var l = require('lodash');
var map = require('through2').obj;
var Promise = require('bluebird');

function callProps(context, obj) {
  return l.mapValues(obj, function (value) {
    if (l.isFunction(value)) {
      return value(context);
    }
    return value;
  });
}

module.exports = function setDefaults(pattern, values) {
  pattern = new RegExp(pattern, 'i');

  return map(function (file, enc, cb) {
    if (!pattern.test(file.relative)) {
      return cb(null, file);
    }

    file.data = l.defaults({}, file.data, callProps(file, values));
    cb(null, file);
  });
};
