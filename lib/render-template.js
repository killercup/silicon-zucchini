var l = require('lodash');

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
    console.log(data);
    throw new Error('Template is ' + template);
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
