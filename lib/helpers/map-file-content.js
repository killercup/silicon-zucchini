var map = require('through2').obj;

module.exports = function mapFileContent(parser, match, field) {
  return map(function (file, enc, cb) {
    if (!match.test(file.relative)) {
      return cb(null, file);
    }

    try {
      var res = parser(String(file.contents));
      if (res instanceof Error) {
        throw res;
      }
      file[field] = res;
      return cb(null, file);
    } catch (err) {
      cb(err);
    }
  });
};
