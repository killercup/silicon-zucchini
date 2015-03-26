var fs = require('vinyl-fs');
var File = require('vinyl');
var path = require('path');
var stream = require('stream');
var Promise = require('bluebird');
if (process.env.DEBUG) { Promise.longStackTraces(); }
var collect = Promise.promisify(require('collect-stream'));
var writeFile = Promise.promisify(require('fs-extra').outputFile);
var l = require('lodash');
var SchemaFaker = require('json-schema-faker');

var LOG_NAME = 'Zucchini';
process.env.DEBUG = process.env.DEBUG ||
  ['log', 'warn', 'error']
  .map(function (i) { return LOG_NAME + ':' + i; })
  .join(',');

var log = require('debug-logger')(LOG_NAME);
log.inspectOptions = {colors: true};

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
  .pipe(S.schemasValidate({requireId: true}))
  ;
}

function getTemplates(src) {
  return fs.src(src)
  .pipe(S.loadCsonFrontmatter())
  .pipe(S.templateValidate())
  ;
}

/**
 * ## Helpers
 */

function findTemplate(templates, name) {
  return l.find(templates, function (t) {
    return t.relative === name;
  });
}

function defaultSettings(opts) {
  return l.defaults({}, opts, {
    data: './data/**/*.{json,cson,md}',
    schemas: './src/schemas/**/*.{json,cson}',
    templates: './src/**/*.html',
    processData: l.identity,
    createRoutes: l.identity,
    destination: 'build',
    templateHelpers: {},
    styleguide: 'styleguide'
  });
}

/**
 * # Build a Silicon Zucchini
 * @param {Object}    opts               A truckload of options
 * @param {String}   [opts.data]         Path glob to find data files
 * @param {String}   [opts.schemas]      Path glob to find schema files
 * @param {String}   [opts.templates]    Path glob to find template files
 * @param {Function} [opts.processData]  Takes a vinyl-fs stream of data files,
 *   manipulates that data, returns a vinyl-fs stream
 * @param {Function} [opts.createRoutes] Callback to create a route object.
 *   Input parameters are `data: [{}], schemas: [{}], getTemplate: Function`.
 *   Needs to return an array of Route objects or arrays (it will be flattened).
 *   Route objects have the shape `{data: {}, route: String, layout: String}`.
 * @param {String}   [opts.destination='build']  Output folder.
 * @param {Object}   [opts.templateHelpers] Map of additonal function that will
 *   be available in templates.
 * @return {Promise} Will be resolved when all processing is done.
 */
function buildSiliconZucchini(opts) {
  var settings = defaultSettings(opts);

  var output = new stream.Readable({ objectMode: true });
  output._read = l.noop; /* eslint no-underscore-dangle: 0 */

  Promise.all([
    collect(settings.processData(getData(settings.data))),
    collect(getSchemas(settings.schemas))
    .then(function (schemas) {
      return l.indexBy(l.pluck(schemas, 'data'), 'id');
    }),
    collect(getTemplates(settings.templates))
  ])
  .tap(function (inputs) {
    inputs[0].map(function (item) {
      return S.dataValidate(item, {schemas: inputs[1]});
    });
  })
  .spread(function (data, schemas, templates) {
    var getTemplate = findTemplate.bind(null, templates);
    var routes = l.flatten(settings.createRoutes(data, schemas, getTemplate));
    var routesByPath = l.indexBy(routes, 'route');

    return Promise.map(routes, function (route) {
      var filePath = path.join(
        route.route.replace(/^\//, ''),
        'index.html'
      );

      return Promise.try(function () {
        return S.renderTemplate(route.layout, route.data, {
          schemas: schemas, getTemplate: getTemplate,
          settings: {imports: l.defaults({
            routes: routesByPath,
            currentRoute: route,
            path: path
          }, settings.templateHelpers)}
        });
      })
      .then(function (html) {
        var file = new File({
          path: filePath,
          contents: new Buffer(html)
        });

        output.push(file);
        log.info('✓', filePath);
      })
      .catch(function (err) {
        err.relative = filePath;
        log.error('✘', filePath, err);
        throw err;
      });
    });
  })
  .then(function () {
    output.push(null);
  })
  .catch(function (err) {
    output.emit('error', err);
    output.push(null);
  });

  return output;
}

function compileAZucchini(opts) {
  return buildSiliconZucchini(opts);
}

function watchMyZucchini(opts, cb) {
  fs.watch(l.flatten([opts.data, opts.schemas, opts.templates]))
  .on('change', cb);
}

function buildZucchiniGuide(opts) {
  var settings = defaultSettings(opts);
  var filePath = path.join(settings.styleguide, 'index.html');

  var output = new stream.Readable({ objectMode: true });
  output._read = l.noop; /* eslint no-underscore-dangle: 0 */

  Promise.all([
    collect(getSchemas(settings.schemas))
    .then(function (schemas) {
      return l.pluck(schemas, 'data');
    }),
    collect(getTemplates(settings.templates))
  ])
  .spread(function (schemas, templates) {
    var getTemplate = findTemplate.bind(null, templates);

    var components = l(templates)
    .filter(function (template) {
      return template.data.styleguide !== false;
    })
    .map(function renderStyleguideComponent(template) {
      if (!template.data.input) {
        log.warn(template.relative, "has no input schema!");
        return false;
      }
      var sampleData = SchemaFaker(
        template.data.input,
        schemas.map(function (s) {
          var sx = l.clone(s);
          sx.id = '#' + sx.id;
          return sx;
        })
      );

      var html = S.renderTemplate(template, sampleData, {
        schemas: schemas, getTemplate: getTemplate,
        settings: {imports: l.defaults({
          routes: {},
          currentRoute: '',
          path: path
        }, settings.templateHelpers)}
      });

      log.info('-', template.relative);

      return {
        name: template.data.name,
        path: template.relative,
        demo: html
      };
    })
    .compact()
    .value();

    return S.renderTemplate(
      getTemplate('templates/styleguide.html'),
      {components: components},
      {
        schemas: schemas, getTemplate: getTemplate,
        settings: {imports: l.defaults({
          routes: {},
          currentRoute: '',
          path: path
        }, settings.templateHelpers)}
      }
    );
  })
  .then(function (html) {
    var file = new File({
      path: filePath,
      contents: new Buffer(html)
    });
    output.push(file);
    log.info('✓', filePath);
  })
  .catch(function (err) {
    err.relative = filePath;
    log.error('✘', filePath, err);
    throw err;
  });

  return output;
}

module.exports = {
  build: buildSiliconZucchini,
  compile: compileAZucchini,
  watch: watchMyZucchini,
  styleguide: buildZucchiniGuide,
  Helpers: S
};
