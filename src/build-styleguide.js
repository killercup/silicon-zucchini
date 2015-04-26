var File = require('vinyl');
var path = require('path');
var stream = require('stream');
var Promise = require('bluebird');
if (process.env.DEBUG) { Promise.longStackTraces(); }
var collect = Promise.promisify(require('collect-stream'));
var l = require('lodash');
var SchemaFaker = require('json-schema-faker');

var LOG_NAME = 'Zucchini';
var log = require('debug-logger')(LOG_NAME);

var defaultSettings = require('./helpers/default-settings');
var S = require('./transforms');

module.exports = /**
 * # Build a Silicon Zucchini Styleguide
 * @param {Object}   inputs              Input streams
 * @param {String}   [inputs.schemas]    Vinyl stream of schema files
 * @param {String}   [inputs.templates]  Vinyl stream of template files
 * @param {Object}   opts                A truckload of options
 * @param {String}   [opts.destination='build']  Output folder.
 * @param {Object}   [opts.templateHelpers] Map of additonal function that will
 *   be available in templates.
 * @return {Promise} Will be resolved when all processing is done.
 */
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
};
