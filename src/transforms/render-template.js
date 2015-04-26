var l = require('lodash');
var validate = require('is-my-json-valid');

var LOG_NAME = 'Zucchini';
var log = require('debug-logger')(LOG_NAME);

var HANDLEBAR_STYLE = require('../helpers/handlebar-style');

module.exports = function renderTemplate(template, data, opts) {
  if (!template) {
    throw new Error('Template is ' + template);
  }

  opts = opts || {};
  var settings = l.defaults({}, opts.settings, HANDLEBAR_STYLE, {
    variable: 'data',
    imports: {}
  });

  settings.imports.include = function includePartial(name, partialData) {
    var partial = opts.getTemplate(name);
    if (!partial) {
      throw new Error('Unknown template: ' + name);
    }
    return renderTemplate(partial, partialData, opts);
  };

  if (!template.data || !template.data.content) {
    throw new Error('Template `' + template.relative + '` is invalid.');
  }

  // Validate input data
  if (template.data.input) {
    var validator = validate(template.data.input, {
      schemas: opts.schemas, verbose: true, greedy: true
    });
    var isValid = validator(data);
    if (!isValid) {
      log.trace("Invalid data:", data);
      throw new Error("Invalid data passed to `" + template.relative + "`: " +
        validator.errors.map(function (err) {
          return '`' + err.field + '` ' + err.message;
        })
      );
    }
  }

  var render = l.template(template.data.content, settings);
  try {
    return render(data);
  } catch (err) {
    log.debug(data);
    log.debug(render);
    throw new Error(
      "Error rendering template " + template.relative + ": " +
      err.message
    );
  }
};
