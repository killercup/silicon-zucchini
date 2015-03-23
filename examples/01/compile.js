var fs = require('vinyl-fs');
var path = require('path');
var Promise = require('bluebird');
var collect = Promise.promisify(require('collect-stream'));
var writeFile = Promise.promisify(require('fs-extra').outputFile);
var del = Promise.promisify(require('del'));
var slug = require('slug');
var l = require('lodash');

var SiliconZucchini = require('../../');
var S = SiliconZucchini;

function getData() {
  return fs.src('./data/**/*.{json,cson,md}')
  .pipe(S.loadCson())
  .pipe(S.loadJson())
  .pipe(S.loadCsonFrontmatter())
  .pipe(S.dataDefaults('^articles/', {
    schema: 'article',
    slug: function (a) {
      return a.data.slug || slug(a.data.title).toLowerCase();
    }
  }))
  .pipe(S.dataDefaults('^pages/', {
    schema: 'page',
    permalink: function (p) {
      return p.data.permalink || S.stripFileExt(p.relative);
    }
  }))
  ;
}

function getSchemas() {
  return fs.src('./src/schemas/**/*.{json,cson}')
  .pipe(S.loadCson())
  .pipe(S.loadJson())
  ;
}

function getTemplates() {
  return fs.src('./src/**/*.html')
  .pipe(S.loadCsonFrontmatter())
  ;
}

Promise.all([
  collect(getData()),
  collect(getSchemas()),
  collect(getTemplates()),
  del('build')
])
.spread(function (data, schemas, templates) {
  data.map(function (item) {
    return S.dataValidate(item, {schemas: schemas});
  });

  function getTemplate(name) {
    return l.find(templates, function (t) {
      return t.relative === name;
    });
  }

  var routes = l.flatten([
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
  ]);

  return Promise.map(routes, function (route) {
    var html = S.renderTemplate(route.layout, route.data, {
      schemas: schemas, getTemplate: getTemplate
    });
    var filePath = path.join('build', route.route, 'index.html');
    return writeFile(filePath, html)
    .then(function () {
      console.log('✓', filePath);
    });
  });
})
.catch(function (err) {
  console.error('oh noes!', err);
});
