var mapFileContent = require('../helpers/map-file-content');
var CSON = require('cson');

module.exports = mapFileContent.bind(null,
  CSON.parse.bind(CSON),
  new RegExp('.cson$', 'i'),
  'data'
);
