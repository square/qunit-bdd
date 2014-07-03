'use strict';

var path = require('path');
var fs   = require('fs');

module.exports = {
  name: 'qunit-bdd',

  treeFor: function(name) {
    this._requireBuildPackages();

    if(name !== 'vendor') return;

    var treePath = path.join(__dirname, '..', 'lib')

    if (fs.existsSync(treePath)) {
      return this.pickFiles(this.treeGenerator(treePath), {
        srcDir: '/',
        files: ['*.js'],
        destDir: '/qunit-bdd/lib'
      });
    }
  },

  included: function(app) {
    this.app = app;
    this.app.import('vendor/qunit-bdd/lib/qunit-bdd.js', {
      type: 'test'
    });
  }
};
