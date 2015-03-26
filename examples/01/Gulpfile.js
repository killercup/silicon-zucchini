var l = require('lodash');
var gulp = require('gulp');
var path = require('path');
var del = require('del');

var SiliconZucchini = require('../../');
var S = SiliconZucchini.Helpers;

var ZUCCHINI_SETTINGS = {
  data: './data/**/*.{json,cson,md}',
  schemas: './src/schemas/**/*.{json,cson}',
  templates: './src/**/*.html',
  destination: 'build',

  processData: setDataDefaults,
  createRoutes: createRoutes,

  templateHelpers: {
    l: l,
    S: require('underscore.string')
  }
};

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

gulp.task('clean', function (cb) {
  del(ZUCCHINI_SETTINGS.destination, cb);
});

gulp.task('build', ['clean'], function () {
  return SiliconZucchini.compile(ZUCCHINI_SETTINGS)
  .pipe(gulp.dest('build'));
});

gulp.task('watch', ['clean'], function () {
  return SiliconZucchini.watch(ZUCCHINI_SETTINGS);
});

gulp.task('styleguilde', function () {
  SiliconZucchini.styleguide(ZUCCHINI_SETTINGS);
});

gulp.task('default', ['build']);
