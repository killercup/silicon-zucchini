var fs = require('vinyl-fs');
var File = require('vinyl');
var path = require('path');
var stream = require('stream');
var Promise = require('bluebird');
if (process.env.DEBUG) { Promise.longStackTraces(); }
var collect = Promise.promisify(require('collect-stream'));
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

/**
 * ## Helpers
 */

function defaultSettings(inputs, opts) {
  return l.defaults({}, inputs, opts, {
    data: './data/**/*.{json,cson,md}',
    schemas: './src/schemas/**/*.{json,cson}',
    templates: './src/**/*.html',
    createRoutes: function () { throw new Error("No Routes implemented!"); },
    destination: 'build',
    templateHelpers: {},
    styleguide: 'styleguide'
  });
}

/**
 * # Build a Silicon Zucchini
 * @param {Object}   input               Input streams
 * @param {String}   [input.data]        Vinyl stream of data files
 * @param {String}   [input.schemas]     Vinyl stream of schema files
 * @param {String}   [input.templates]   Vinyl stream of template files
 * @param {Object}   opts                A truckload of options
 * @param {Function} [opts.createRoutes] Callback to create a route object.
 *   Input parameters are `data: [{}], schemas: [{}], getTemplate: Function`.
 *   Needs to return an array of Route objects or arrays (it will be flattened).
 *   Route objects have the shape `{data: {}, route: String, layout: String}`.
 * @param {String}   [opts.destination='build']  Output folder.
 * @param {Object}   [opts.templateHelpers] Map of additonal function that will
 *   be available in templates.
 * @return {Promise} Will be resolved when all processing is done.
 */
function buildSiliconZucchini(input, opts) {
  var settings = defaultSettings(input, opts);

  var output = new stream.Readable({ objectMode: true });
  output._read = l.noop; /* eslint no-underscore-dangle: 0 */

  Promise.all([
    collect(settings.data),
    collect(settings.schemas)
    .then(function (schemas) {
      return l.indexBy(l.pluck(schemas, 'data'), 'id');
    }),
    collect(settings.templates)
  ])
  .tap(function (inputs) {
    inputs[0].map(function (item) {
      return S.dataValidate(item, {schemas: inputs[1]});
    });
  })
  .spread(function (data, schemas, templates) {
    var getTemplate = S.findTemplate.bind(null, templates);
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
            routes: S.routesToPageTree(routes),
            routesByPath: routesByPath,
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
        err.message = "Error rendering `" + filePath + "`: " + err.message;
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

function watchMyZucchini(opts, cb) {
  fs.watch(l.flatten([opts.data, opts.schemas, opts.templates]))
  .on('change', cb);
}

function buildZucchiniGuide(inputs, opts) {
  var settings = defaultSettings(inputs, opts);
  var filePath = path.join(settings.styleguide, 'index.html');

  var output = new stream.Readable({ objectMode: true });
  output._read = l.noop; /* eslint no-underscore-dangle: 0 */

  Promise.all([
    collect(settings.schemas)
    .then(function (schemas) {
      return l.pluck(schemas, 'data');
    }),
    collect(settings.templates)
  ])
  .spread(function (schemas, templates) {
    var getTemplate = S.findTemplate.bind(null, templates);

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

      var html;
      try {
        html = S.renderTemplate(template, sampleData, {
          schemas: schemas, getTemplate: getTemplate,
          settings: {imports: l.defaults({
            routes: {},
            currentRoute: '',
            path: path
          }, settings.templateHelpers)}
        });
      } catch (err) {
        err.message = "Error rendering `" + template.relative +
          "`: " + err.message;
        throw err;
      }

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
      {title: "Styelguide", components: components},
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
  compile: buildSiliconZucchini,
  watch: watchMyZucchini,
  styleguide: buildZucchiniGuide,
  Helpers: S
};
