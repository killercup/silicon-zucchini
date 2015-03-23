var map = require('map-stream');

module.exports = function mapFileContent(parser, match, field) {
  return map(function (file, cb) {
    if (!match.test(file.relative)) {
      return cb(null, file);
    }

    file[field] = parser(String(file.contents));

    cb(null, file);
  });
};
