var map = require('through2').obj;
var validate = require('is-my-json-valid');

// var JSON_SCHEMA_SCHEMA = require('./helpers/json-schema.schema.json');
var JSON_SCHEMA_SCHEMA = {
  type: 'object',
  required: ['id', 'type'],
  properties: {
    id: {type: 'string'},
    title: {type: 'string'},
    type: {type: 'string'},
    properties: {type: 'object'},
    required: {type: 'array', items: {type: 'string'}}
  }
};

module.exports = function schemasValidate(opts) {
  opts = opts || {};
  var requireId = !!opts.requireId;

  return map(function (file, enc, cb) {
    JSON_SCHEMA_SCHEMA.required = requireId ? ['id'] : [];
    var validator = validate(JSON_SCHEMA_SCHEMA, {
      verbose: true, greedy: true
    });
    var isValid = validator(file.data);
    if (!isValid) {
      return cb(new Error("Invalid schema in `" + file.relative + "`: " +
        validator.errors.map(function (err) {
          return '`' + err.field + '` ' + err.message;
        })
      ));
    }

    cb(null, file);
  });
};
