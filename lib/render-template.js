var l = require('lodash');
var validate = require('is-my-json-valid');

var HANDLEBAR_STYLE = require('./helpers/handlebar-style');

module.exports = function renderTemplate(template, data, opts) {
  opts = opts || {};
  var settings = l.defaults({}, opts.settings, HANDLEBAR_STYLE, {
    variable: 'data',
    imports: {
      include: function (name, partialData) {
        var partial = opts.getTemplate(name);
        if (!partial) {
          throw new Error('Unknown template: ' + name);
        }
        return renderTemplate(partial, partialData, opts);
      }
    }
  });

  if (!template) {
    throw new Error('Template is ' + template);
  }
  if (!template.data || !template.data.content) {
    throw new Error('Template ' + template.relative + ' is invalid.');
  }

  // Validate
  if (template.data.input) {
    var validator = validate(template.data.input, {
      schemas: opts.schemas, verbose: true, greedy: true
    });
    var isValid = validator(data);
    if (!isValid) {
      throw new Error("Invalid data passed to " + template.relative + ": " +
        JSON.stringify(validator.errors)
      );
    }
  }

  var render = l.template(template.data.content, settings);
  try {
    return render(data);
  } catch (err) {
    throw new Error(
      "Error rendering template " + template.relative + ": " +
      err.message
    );
  }
};
