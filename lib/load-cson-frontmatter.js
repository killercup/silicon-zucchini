var l = require('lodash');
var map = require('through2').obj;
var CSON = require('cson');

module.exports = function loadCsonFrontmatter(opts) {
  var options = l.defaults({}, opts, {
    remove: false,
    match: false
  });

  var optionalByteOrderMark = '\\ufeff?';
  var pattern = '^('
    + optionalByteOrderMark
    + '((= yaml =)|(---))'
    + '$([\\s\\S]*?)'
    + '\\2'
    + '$'
    + (process.platform === 'win32' ? '\\r?' : '')
    + '(?:\\n)?)';
  var regex = new RegExp(pattern, 'm');

  return map(function (file, enc, cb) {
    if (options.match && !file.relative.match(options.match)) {
      return cb(null, file);
    }

    var string = String(file.contents);
    var match = regex.exec(string);

    if (!match) { return cb(null, file); }

    var cson = match[match.length - 1].replace(/^\s+|\s+$/g, '');
    var data = CSON.parse(cson) || {};
    data.content = string.replace(match[0], '').trim();
    file.data = data;

    if (options.remove) {
      file.contents = new Buffer(data.content);
    }

    cb(null, file);
  });
};
