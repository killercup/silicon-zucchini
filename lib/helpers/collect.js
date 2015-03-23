var Promise = require('bluebird');
var map = require('map-stream');

/**
 * # Collect a Stream to a Promise
 *
 * @param  {stream}  stream  Some stream yielding values
 * @return {Promise<Array>}  Promise containg a list of all stream values
 */
module.exports = function collect(stream) {
  var collection = [];

  return new Promise(function (resolve, reject) {
    stream
    .pipe(map(function (data, cb) {
      collection.push(data);
      cb(null, data);
    }))
    .on('error', reject)
    .on('end', function () { resolve(collection); })
    .on('complete', function () { resolve(collection); })
    .on('finish', function () { resolve(collection); });
  });
};
