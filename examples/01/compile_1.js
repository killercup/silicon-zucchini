var slug = require('slug');
var SiliconZucchini = require('../../');
var h = SiliconZucchini.helpers;

new SiliconZucchini()
.getData('./data')
.getSchemas('./src/schemas/**/*.{json,cson}')
.getTemplates('./src/templates/**/*.html')
.then(h.setDefaults(/^articles\//, {
  schema: 'article',
  slug: function (article) { return article.slug || slug(article.title); }
}))
.then(h.setDefaults(/^pages\//, {
  schema: 'page'
}))
.then(h.validate({field: 'schema'}))
.then(h.render(function (data, templates) {
  return [
    h.filterByFilename(data, /^articles\//).map(function (article) {
      return {
        data: article,
        route: '/artikel/' + article.slug,
        layout: templates.get('templates/article')
      };
    }),
    h.filterByFilename(data, /^pages\//).map(function (page) {
      return {
        data: page,
        route: page.permalink || '/' + page.relative
      };
    })
  ];
}))
.build();
