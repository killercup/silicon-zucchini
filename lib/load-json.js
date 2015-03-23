var mapFileContent = require('./helpers/map-file-content');

module.exports = mapFileContent.bind(null,
  JSON.parse.bind(JSON),
  new RegExp('.json$', 'i'),
  'data'
);
