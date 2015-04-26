var map = require('through2').obj;
var validate = require('is-my-json-valid');

var TEMPLATE_METADATA_SCHEMA = {
  type: 'object',
  required: ['name'],
  properties: {
    'title': { type: 'string', maxLength: 255 },
    'styleguide': { type: 'boolean' },
    'input': { type: 'object' }
  }
};

module.exports = function validateMetadata() {
  return map(function (file, enc, cb) {
    var validator = validate(TEMPLATE_METADATA_SCHEMA, {
      verbose: true, greedy: true
    });
    var isValid = validator(file.data);
    if (!isValid) {
      return cb(new Error("Invalid metadata in `" + file.relative + "`: " +
        validator.errors.map(function (err) {
          return '`' + err.field + '` ' + err.message;
        })
      ));
    }
    cb(null, file);
  });
};
