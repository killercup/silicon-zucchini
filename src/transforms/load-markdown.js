var map = require('through2').obj;
var l = require('lodash');
var markdown = require('markdown-it');

var MATCH = /\.md$/i;

module.exports = function loadMarkdown(opts) {
  var settings = l.defaults({}, opts, {
    settings: {
      html: true,
      xhtmlOut: true,
      linkify: true
    },
    plugins: [],
    field: ''
  });

  var md = markdown(settings.settings);
  settings.plugins.forEach(function (plugin) {
    md = md.use(plugin);
  });

  return map(function (file, enc, cb) {
    if (MATCH.test(file.relative)) {
      file.data.content = md.render(file.data.content).trim();
    }
    cb(null, file);
  });
};
