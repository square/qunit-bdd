/* global QUnit */
/* eslint-env browser */
QUnit.config.urlConfig.push({
  id: 'randomize',
  label: 'Randomize test order within modules'
});

// eslint-disable-next-line no-unused-vars
var QUNIT_BDD_OPTIONS = {
  randomize: QUnit.urlParams.randomize
};
