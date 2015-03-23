var path = require('path');

module.exports = function stripFileExt(filePath) {
  return filePath.replace(path.extname(filePath), '');
};
