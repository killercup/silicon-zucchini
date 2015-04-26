var l = require('lodash');

module.exports = function defaultSettings(inputs, opts) {
  return l.defaults({}, inputs, opts, {
    data: './data/**/*.{json,cson,md}',
    schemas: './src/schemas/**/*.{json,cson}',
    templates: './src/**/*.html',
    createRoutes: function () { throw new Error("No Routes implemented!"); },
    destination: 'build',
    templateHelpers: {},
    styleguide: 'styleguide'
  });
};
