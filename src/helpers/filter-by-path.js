module.exports = function filterByPath(pattern, list) {
  var regex = RegExp(pattern, 'i');
  return list.filter(function (item) {
    return regex.test(item.relative);
  });
};
