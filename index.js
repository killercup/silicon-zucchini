var fs = require('vinyl-fs');
var path = require('path');
var Promise = require('bluebird');
var collect = Promise.promisify(require('collect-stream'));
var writeFile = Promise.promisify(require('fs-extra').outputFile);
var del = Promise.promisify(require('del'));
var l = require('lodash');

var S = require('./lib');

function getData(src) {
  return fs.src(src)
  .pipe(S.loadCson())
  .pipe(S.loadJson())
  .pipe(S.loadCsonFrontmatter())
  .pipe(S.loadMarkdown())

  ;
}

function getSchemas(src) {
  return fs.src(src)
  .pipe(S.loadCson())
  .pipe(S.loadJson())
  ;
}

function getTemplates(src) {
  return fs.src(src)
  .pipe(S.loadCsonFrontmatter())
  ;
}

function buildSiliconZucchini(opts) {
  var settings = l.defaults({}, opts, {
    data: './data/**/*.{json,cson,md}',
    schemas: './src/schemas/**/*.{json,cson}',
    templates: './src/**/*.html',
    processData: l.identity,
    createRoutes: l.identity,
    destination: 'build',
    templateHelpers: {}
  });

  return Promise.all([
    collect(settings.processData(getData(settings.data))),
    collect(getSchemas(settings.schemas))
    .then(function (schemas) {
      return l.indexBy(l.pluck(schemas, 'data'), 'title');
    }),
    collect(getTemplates(settings.templates)),
    del('build')
  ])
  .tap(function (inputs) {
    inputs[0].map(function (item) {
      return S.dataValidate(item, {schemas: inputs[1]});
    });
  })
  .spread(function (data, schemas, templates) {
    function getTemplate(name) {
      return l.find(templates, function (t) {
        return t.relative === name;
      });
    }

    var routes = l.flatten(settings.createRoutes(data, schemas, getTemplate));

    return Promise.map(routes, function (route) {
      var filePath = path.join(settings.destination, route.route, 'index.html');

      return Promise.try(function () {
        return S.renderTemplate(route.layout, route.data, {
          schemas: schemas, getTemplate: getTemplate,
          settings: {imports: settings.templateHelpers}
        });
      })
      .then(function (html) {
        return writeFile(filePath, html);
      })
      .then(function () {
        console.log('✓', filePath);
      })
      .catch(function (err) {
        err.relative = filePath;
        throw err;
      });
    });
  })
  .catch(function (err) {
    err = l.isArray(err) ? err : [err];
    err.forEach(function (e) {
      console.error('✘', e.relative || '', e.message);
    });
  });
}

module.exports = buildSiliconZucchini;
module.exports.Helpers = S;
