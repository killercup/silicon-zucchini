var l = require('lodash');
var map = require('through2').obj;

module.exports = function uniqFields(fields, regex) {
  if (!l.isArray(fields)) {
    throw new Error("uniqFields paramter needs to be an array");
  }
  var data = {};
  fields.forEach(function (field) { data[field] = []; });

  if (regex) {
    regex = new RegExp(regex, 'i');
  }

  return map(function (file, enc, cb) {
    if (!file.data || (regex && !regex.test(file.relative))) {
      return cb(null, file);
    }

    fields.forEach(function (field) {
      var val = file.data[field];
      var match = l.find(data[field], {val: val});
      if (match) {
        return cb(new Error(
          "Value of field `" + field + "` (`" + val + "`) in file `" +
          file.relative + "` is not unique but a duplicate with file `" +
          match.path + "`."
        ));
      }
      data[field].push({val: val, path: file.relative});
    });

    return cb(null, file);
  });
};
