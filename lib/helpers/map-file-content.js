var map = require('through2').obj;

module.exports = function mapFileContent(parser, match, field) {
  return map(function (file, enc, cb) {
    if (match.test(file.relative)) {
      file[field] = parser(String(file.contents));
    }

    cb(null, file);
  });
};
