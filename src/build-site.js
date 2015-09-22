var File = require('vinyl');
var path = require('path');
var stream = require('stream');
var Promise = require('bluebird');
if (process.env.DEBUG) { Promise.longStackTraces(); }
var collect = Promise.promisify(require('collect-stream'));
var l = require('lodash');

var LOG_NAME = 'Zucchini';
var log = require('debug-logger')(LOG_NAME);

var defaultSettings = require('./helpers/default-settings');
var S = require('./transforms');

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
module.exports = function buildSiliconZucchini(input, opts) {
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
      var filePath = route.isFile ?
        route.route :
        path.join(
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
};
