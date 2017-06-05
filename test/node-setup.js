/* eslint-env node */

'use strict';

var sinon = require('sinon');

global.sinon = sinon;

var QUnitBDD = require('../lib/qunit-bdd');

for (var key in QUnitBDD) {
  if (Object.prototype.hasOwnProperty.call(QUnitBDD, key)) {
    global[key] = QUnitBDD[key];
  }
}
