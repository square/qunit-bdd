QUnit.config.urlConfig.push({
  id: 'randomize',
  label: 'Randomize test order within modules'
});

var QUNIT_BDD_OPTIONS = {
  randomize: QUnit.urlParams.randomize
};

// Polyfill using es6-promise.
window.Promise = window.ES6Promise;
