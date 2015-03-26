/**
 * ## Build Tasks
 */

var l = require('lodash');
var path = require('path');
var del = require('del');
var gulp = require('gulp');
var connect = require('gulp-connect');

var SiliconZucchini = require('../../');
var S = SiliconZucchini.Helpers;

/**
 * ## Settings
 */

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

/**
 * ## Zucchini
 */

function setDataDefaults(dataStream) {
  return dataStream
  .pipe(S.dataDefaults('^articles/', {
    schema: {$ref: '#article'},
    slug: function (a) {
      return S.slug(a.data.title).toLowerCase();
    }
  }))
  .pipe(S.dataDefaults('^pages/', {
    schema: {$ref: '#page'},
    permalink: function (p) {
      return S.stripFileExt(p.relative).replace(/^pages/, '');
    }
  }))
  .pipe(S.uniqFields(['slug'], '^articles/'))
  .pipe(S.uniqFields(['permalink'], '^pages/'))
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

/**
 * ## Work
 */

function clean(cb) {
  del(ZUCCHINI_SETTINGS.destination, cb);
}

function build() {
  return SiliconZucchini.compile(ZUCCHINI_SETTINGS)
  .pipe(gulp.dest(ZUCCHINI_SETTINGS.destination))
  .pipe(connect.reload());
}

function styleguide() {
  return SiliconZucchini.styleguide(ZUCCHINI_SETTINGS)
  .pipe(gulp.dest(ZUCCHINI_SETTINGS.destination))
  .pipe(connect.reload());
}

function watch() {
  gulp.watch(
    [
      ZUCCHINI_SETTINGS.data,
      ZUCCHINI_SETTINGS.schemas,
      ZUCCHINI_SETTINGS.templates
    ],
    gulp.parallel(build, styleguide)
  );
}

function serve() {
  connect.server({
    root: ZUCCHINI_SETTINGS.destination,
    livereload: true
  });
}

/**
 * ## Tasks
 */

gulp.task('build', gulp.series(clean, build));

gulp.task('styleguide', gulp.series(clean, styleguide));

gulp.task('watch', gulp.series(
  clean,
  gulp.parallel(build, styleguide),
  watch
));

gulp.task('default', gulp.series(
  clean,
  gulp.parallel(build, styleguide)
));

gulp.task('serve', gulp.parallel('default', serve, watch));
