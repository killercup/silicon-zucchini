var l = require('lodash');

module.exports = function routesToPageTree(routes) {
  return l.reduce(routes, function (tree, page) {
    var cursor = tree;
    var path = page.route === '/' ? '' : page.route;

    var segments = path.split('/');
    if (segments.length > 1) {
      l.initial(segments).forEach(function (segment) {
        if (cursor[segment]) {
          cursor = cursor[segment].children;
        }
        else {
          cursor[segment] = {children: {}};
          cursor = cursor[segment].children;
        }
      });
    }

    var basename = l.last(segments);
    if (basename === '') { basename = '/'; }
    cursor[basename] = l.defaults(
      {data: page.data},
      cursor[basename],
      {children: {}}
    );

    return tree;
  }, {});
};
