var validate = require('is-my-json-valid');

module.exports = function dataValidate(item, opts) {
  var validator = validate(item.data.schema, {
    schemas: opts.schemas, verbose: true, greedy: true
  });
  var isValid = validator(item.data);
  if (!isValid) {
    throw new Error("Invalid data in " + item.relative + ": " +
      validator.errors.map(function (err) {
        return '`' + err.field + '` ' + err.message;
      })
    );
  }
};
