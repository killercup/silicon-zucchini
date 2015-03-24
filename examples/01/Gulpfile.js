var l = require('lodash');
var gulp = require('gulp');
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
      return p.data.permalink ||
        S.stripFileExt(p.relative).replace(/^pages/, '');
    }
  }))
  ;
}

function createRoutes(data, schemas, getTemplate) {
  return [
    {
      data: {
        title: 'Articles',
        articles: l.pluck(S.filterByPath('^articles/', data), 'data')
      },
      route: 'artikel',
      layout: getTemplate('templates/articles.html')
    },
    S.filterByPath('^articles/', data).map(function (article) {
      return {
        data: article.data,
        route: path.join('artikel', article.data.slug),
        layout: getTemplate(article.data.layout || 'templates/article.html')
      };
    }),
    S.filterByPath('^pages/', data).map(function (page) {
      return {
        data: page.data,
        route: page.data.permalink,
        layout: getTemplate(page.data.layout || 'templates/page.html')
      };
    })
  ];
}

var ZUCCHINI_SETTINGS = {
  processData: setDataDefaults,
  createRoutes: createRoutes,
  destination: 'build',
  templateHelpers: {
    l: l,
    S: require('underscore.string')
  }
};

gulp.task('build', function () {
  return SiliconZucchini.compile(ZUCCHINI_SETTINGS);
});

gulp.task('watch', function () {
  return SiliconZucchini.watch(ZUCCHINI_SETTINGS);
});

gulp.task('styleguilde', function () {
  SiliconZucchini.styleguide(ZUCCHINI_SETTINGS);
});

gulp.task('default', ['build']);
