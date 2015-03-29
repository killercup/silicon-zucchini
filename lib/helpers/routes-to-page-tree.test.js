/* eslint dot-notation: 0 */
var assert = require('assert');
var routesToPageTree = require('./routes-to-page-tree');

describe("Routes to page tree", function () {
  it("might actually work", function () {
    var tree = routesToPageTree([
      {data: {}, route: "artikel/beer"},
      {data: {title: 'Artikel'}, route: "artikel"},
      {data: {title: 'Start'}, route: "/"},
      {data: {}, route: "artikel/schinken"},
      {data: {}, route: "uber"}
    ]);

    assert(tree['/'], '/');
    assert(tree['uber'], '/uber');
    assert(tree['uber'].data, '/uber');
    assert(tree['artikel'], '/artikel');
    assert(tree['artikel'].data.title, 'title of /artikel');
    assert(tree['artikel'].children['schinken'], '/artikel/schinken');
  });
});
