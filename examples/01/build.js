var l = require('lodash');
var path = require('path');

var SiliconZucchini = require('../../');
var S = SiliconZucchini.Helpers;

function setDataDefaults(dataStream) {
  return dataStream
  .pipe(S.dataDefaults('^articles/', {
    schema: {$ref: '#article'},
    slug: function (a) {
      return a.data.slug || S.slug(a.data.title).toLowerCase();
    }
  }))
  .pipe(S.dataDefaults('^pages/', {
    schema: {$ref: '#page'},
    permalink: function (p) {
      return p.data.permalink || S.stripFileExt(p.relative);
    }
  }))
  ;
}

function createRoutes(data, schemas, getTemplate) {
  return [
    {
      data: {articles: l.pluck(S.filterByPath('^articles/', data), 'data')},
      route: 'artikel',
      layout: getTemplate('templates/articles.html')
    },
    S.filterByPath('^articles/', data).map(function (article) {
      return {
        data: article.data,
        route: path.join('artikel', article.data.slug),
        layout: getTemplate('templates/article.html')
      };
    }),
    S.filterByPath('^pages/', data).map(function (page) {
      return {
        data: page.data,
        route: page.data.permalink,
        layout: getTemplate('templates/page.html')
      };
    })
  ];
}

SiliconZucchini.serve({
  processData: setDataDefaults,
  createRoutes: createRoutes,
  destination: 'build',
  templateHelpers: {
    l: l
  }
});
