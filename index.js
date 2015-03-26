var fs = require('vinyl-fs');
var path = require('path');
var Promise = require('bluebird');
Promise.longStackTraces();
var collect = Promise.promisify(require('collect-stream'));
var writeFile = Promise.promisify(require('fs-extra').outputFile);
var del = Promise.promisify(require('del'));
var l = require('lodash');

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
  ;
}

function getTemplates(src) {
  return fs.src(src)
  .pipe(S.loadCsonFrontmatter())
  .pipe(S.templateValidate())
  ;
}

function defaultSettings(opts) {
  return l.defaults({}, opts, {
    data: './data/**/*.{json,cson,md}',
    schemas: './src/schemas/**/*.{json,cson}',
    templates: './src/**/*.html',
    processData: l.identity,
    createRoutes: l.identity,
    destination: 'build',
    templateHelpers: {}
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

  return Promise.all([
    collect(settings.processData(getData(settings.data))),
    collect(getSchemas(settings.schemas))
    .then(function (schemas) {
      schemas.forEach(function (schema) {
        if (!schema.data.id) {
          throw new Error("Schema `" + schema.relative + "` has no ID");
        }
      });
      return l.indexBy(l.pluck(schemas, 'data'), 'id');
    }),
    collect(getTemplates(settings.templates)),
    del(settings.destination)
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
    var routesByPath = l.indexBy(routes, 'route');

    return Promise.map(routes, function (route) {
      var filePath = path.join(settings.destination, route.route, 'index.html');

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
        return writeFile(filePath, html);
      })
      .then(function () {
        log.info('✓', filePath);
      })
      .catch(function (err) {
        err.relative = filePath;
        throw err;
      });
    });
  });
}

function compileAZucchini(opts) {
  return buildSiliconZucchini(opts)
  .catch(function (err) {
    err = l.isArray(err) ? err : [err];
    err.forEach(function (e) {
      log.error('✘', e.relative || '', e.message);
    });
    throw err;
  });
}

function watchMyZucchini(opts, cb) {
  fs.watch(l.flatten([opts.data, opts.schemas, opts.templates]))
  .on('change', cb);
}

function serveZucchini(opts) {
  var settings = l.defaults({}, defaultSettings(opts), {
    port: 3000,
    livereload: 35729
  });

  settings.templateHelpers.livereload = true;

  var Static = require('node-static');
  var files = new Static.Server(opts.destination);
  var livereload = require('livereload').createServer({
    port: settings.livereload,
    applyCSSLive: true
  });

  var server = require('http').createServer(function (req, res) {
    req.on('end', function () {
      files.serve(req, res);
    }).resume();
  });

  compileAZucchini(settings)
  .then(function () {
    log.debug('Begin watching');
    livereload.watch(settings.destination);
    server.listen(settings.port, function () {
      log.info(
        'Now serving built stuff on http://localhost:' + settings.port
      );
    });

    watchMyZucchini(settings, function (ev) {
      log.info(
        ev.type === 'changed' ? '✎' : '★',
        path.relative(process.cwd(), ev.path)
      );
      compileAZucchini(settings);
    });
  })
  .catch(log.error);
}

module.exports = {
  build: buildSiliconZucchini,
  compile: compileAZucchini,
  watch: watchMyZucchini,
  serve: serveZucchini,
  Helpers: S
};
