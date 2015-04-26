var l = require('lodash');

module.exports = function findTemplate(templates, name) {
  var file = l.find(templates, function (t) {
    return t.relative === name;
  });
  if (!file) {
    throw new Error("Template `" + name + "` not found.");
  }
  return file;
};
