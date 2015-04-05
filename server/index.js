var path = require('path');
var fs = require('fs');
var vfs = require('vinyl-fs');
var express = require('express');
var tree = require('gulp-file-tree');

var Promise = require('bluebird');
var collect = Promise.promisify(require('collect-stream'));

var S = require('../lib');

var server = express();

function serveStaticFile(route, source) {

}

module.exports = function (settings) {
  server.get('/files', function (req, res, next) {
    collect(
      vfs.src(settings.data, {read: false})
      .pipe(tree())
    )
    .then(function (data) {
      if (!data || !data.length) {
        return res.status(200).send({tree: null});
      }

      res.status(200).send({tree: JSON.parse(String(data[0].contents))});
    })
    .catch(next);
  });

  server.get('/files/*', function (req, res, next) {
    var filePath = path.join(settings.data_dir, req.params[0]);

    collect(
      vfs.src(filePath)
      .pipe(S.loadCsonFrontmatter())
      .pipe(S.loadCson())
      .pipe(S.loadJson())
    )
    .then(function (data) {
      if (!data || !data.length) {
        return res.status(404).send({file: null});
      }

      var file = data[0];
      res.status(200).send({file: {
        path: file.relative,
        content: file.data || String(file.contents)
      }});
    })
    .catch(next);
  });

  server.get('/schemas', function (req, res, next) {
    collect(
      vfs.src(settings.schemas)
      .pipe(S.loadCsonFrontmatter())
      .pipe(S.loadCson())
      .pipe(S.loadJson())
    )
    .then(function (schemas) {
      res.status(200).send({
        schemas: schemas.map(function (s) { return s.data; })
      });
    })
    .catch(next);
  });

  server.get('/static/jsoneditor.min.js', function (req, res) {
    fs.createReadStream(path.join(__dirname,
      '../node_modules/json-editor/dist/jsoneditor.min.js'
    )).pipe(res);
  });

  server.use(express.static(path.join(__dirname, './public')));

  return server;
};
