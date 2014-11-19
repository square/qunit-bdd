'use strict';

var path = require('path');

module.exports = {
  name: 'qunit-bdd',

  treeForVendor: function(tree) {
    var treePath = path.join(__dirname, '..', 'lib')

    var qunitBddTree =  this.pickFiles(this.treeGenerator(treePath), {
      srcDir: '/',
      files: ['*.js'],
      destDir: '/qunit-bdd/lib'
    });

    return this.mergeTrees([tree, qunitBddTree].filter(Boolean));
  },

  included: function(app) {
    app.import('vendor/qunit-bdd/lib/qunit-bdd.js', {
      type: 'test'
    });
  }
};
