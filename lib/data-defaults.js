var l = require('lodash');
var map = require('map-stream');
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

  return map(function (file, cb) {
    if (!pattern.test(file.relative)) {
      return cb(null, file);
    }

    Promise.props(values)
    .then(callProps.bind(null, file))
    .then(function (actualDefaults) {
      file.data = l.defaults({}, file.data, actualDefaults);
      cb(null, file);
    })
    .catch(cb);
  });
};
