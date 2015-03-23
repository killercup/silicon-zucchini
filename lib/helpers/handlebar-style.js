module.exports = {
  interpolate: /{{([\s\S]+?)}}/g,
  evaluate: /{%([\s\S]+?)%}/g,
  escape: /{{-([\s\S]+?)}}/g
};
