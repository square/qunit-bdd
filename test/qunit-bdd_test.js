/* global describe, context, it, before, after, lazy, helper, expect, fail, ok */
/* global QUnit, sinon */
/* global window */
/* eslint-env node, es6 */

/**
 * To anyone attempting to debug these tests:
 *
 * Please note that these tests depend on test pollution to ensure the correct
 * behavior of `before`, `after`, `it`, `describe`, `it.skip`, etc. I would
 * like for this not to be the case, but I didn't see any good way around it.
 * What this means is that you should not run the tests in isolation, but as a
 * whole test suite. Fortunately the tests are really fast so this shouldn't be
 * much of a problem.
 */

describe('describe', function() {
  var parentExecutionContext = this;

  // Ensure node and browser tests are running against the expected QUnit Version.
  it('uses QUnit 2.9', function() {
    expect(QUnit.version).to.equal('2.9.3');
  });

  it('runs its child tests in a QUnit module', function() {
    expect(3 + 4).to.equal(7);
  });

  describe('execution context', function() {
    var executionContext = this;

    it('has a description matching the description passed to describe/context', function() {
      expect(executionContext.description).to.equal('execution context');
    });

    it('has a full description which contains all parent descriptions prepended', function() {
      expect(executionContext.fullDescription()).to.equal('describe execution context');
    });

    it('has a reference to the parent execution context', function() {
      expect(executionContext.parent).to.equal(parentExecutionContext);
    });
  });

  describe.skip('.skip', function() {
    it('skips all tests in the context', function() {
      fail('this should not run');
    });

    describe('with a nested context not using .skip', function() {
      it('skips all tests in this context too', function() {
        fail('this should not run');
      });
    });
  });

  describe('.only', function() {
    it('configures QUnit to filter by module', function() {
      var module = QUnit.config.module;
      var current = QUnit.config.current;

      try {
        // Allow `describe` inside an `it`, which is usually forbidden.
        QUnit.config.current = null;

        describe.only('fake context with describe.only', function() {});
      } finally {
        // Restore the current test before running assertions.
        QUnit.config.current = current;
      }

      expect(QUnit.config.module).to.equal('fake context with describe.only');

      QUnit.config.module = module;
    });
  });
});

describe('it.skip', function() {
  var beforeCount = 0;
  var afterCount = 0;

  before(function() {
    beforeCount++;
  });

  after(function() {
    afterCount++;
  });

  it.skip('skips the test and marks it as skipped', function() {
    fail('this should not run');
  });

  it('has only run `before` once at this point', function() {
    expect(beforeCount).to.equal(1);
    expect(afterCount).to.equal(0);
  });
});

describe('it.only', function() {
  it('configures QUnit to filter by module and test', function() {
    var module = QUnit.config.module;
    var filter = QUnit.config.filter;
    var current = QUnit.config.current;

    try {
      // Allow `describe` inside an `it`, which is usually forbidden.
      QUnit.config.current = null;

      // This really does add a test that will be run.
      describe('fake context with it.only', function() {
        it.only('it.only test', function() { QUnit.expect(0); });
      });
    } finally {
      // Restore the current test before running assertions.
      QUnit.config.current = current;
    }

    expect(QUnit.config.module).to.equal('fake context with it.only');
    expect(QUnit.config.filter).to.equal('it.only test');

    QUnit.config.module = module;
    QUnit.config.filter = filter;
  });
});

context('context', function() {
  it('is an alias for #describe', function() {
    expect(0);
  });
});

describe('fail', function() {
  it('delegates to QUnit.ok', function(assert) {
    var okStub = sinon.stub(assert, 'ok');
    fail('oh no!');
    okStub.restore();
    expect(okStub.callCount).to.equal(1);
    expect(okStub.calledWith(false, 'oh no!')).to.be.true();
  });
});

describe('expect', function() {
  describe('assert.expect delegation', function() {
    it('behaves like QUnit.expect if no accessors are called on the expect() object', function(assert) {
      expect(3);
      assert.equal(QUnit.config.current.expected, 3);
      assert.ok(true);
      assert.ok(true);
    });

    it('does not override the expected assertion count if .to or .be is called', function(assert) {
      /* jshint expr:true */
      expect(3).to.equal(3);
      assert.equal(QUnit.config.current.expected, null);
      expect(3).to;
      assert.equal(QUnit.config.current.expected, null);
      expect(3).be;
      assert.equal(QUnit.config.current.expected, null);
      /* jshint expr:false */
    });

    it('does not override the expected assertion count if default assertions are called', function(assert) {
      assert.expect(2);
      expect(1).equal(1);
      assert.equal(QUnit.config.current.expected, 2);
    });
  });

  describe('.to', function() {
    it('is purely syntactic sugar', function() {
      var expectation = expect(0);
      expect(expectation.to).to.equal(expectation);
    });
  });

  describe('.be', function() {
    it('is purely syntactic sugar', function() {
      var expectation = expect(0);
      expect(expectation.be).to.equal(expectation);
    });
  });

  describe('.equal', function() {
    it('delegates to QUnit.strictEqual', function(assert) {
      var strictEqualStub = sinon.stub(assert, 'strictEqual');
      expect(1).to.equal(2);
      strictEqualStub.restore();

      expect(strictEqualStub.callCount).to.equal(1);
      var args = strictEqualStub.firstCall.args;
      expect(args[0]).to.equal(1);
      expect(args[1]).to.equal(2);
      expect(args[2]).to.equal(undefined);
    });

    it('takes an optional message argument', function(assert) {
      var strictEqualStub = sinon.stub(assert, 'strictEqual');
      expect(1 + 1).to.equal(2, 'math works');
      strictEqualStub.restore();

      expect(strictEqualStub.firstCall.args[2]).to.equal('math works');
    });
  });

  describe('.not.equal', function() {
    it('delegates to QUnit.notStrictEqual', function(assert) {
      var notStrictEqualStub = sinon.stub(assert, 'notStrictEqual');
      expect(1).to.not.equal(2);
      notStrictEqualStub.restore();

      expect(notStrictEqualStub.callCount).to.equal(1);
      var args = notStrictEqualStub.firstCall.args;
      expect(args[0]).to.equal(1, 'actual matches');
      expect(args[1]).to.equal(2, 'expected matches');
      expect(args[2]).to.equal(undefined);
    });

    it('takes an optional message argument', function(assert) {
      var notStrictEqualStub = sinon.stub(assert, 'notStrictEqual');
      expect(1 + 1).to.not.equal(2, 'math does not work');
      notStrictEqualStub.restore();

      expect(notStrictEqualStub.firstCall.args[2]).to.equal('math does not work');
    });
  });

  describe('.eql', function() {
    it('delegates to QUnit.deepEqual', function(assert) {
      var deepEqualStub = sinon.stub(assert, 'deepEqual');
      var actual = {actual: true};
      var expected = {expected: true};
      expect(actual).to.eql(expected);
      deepEqualStub.restore();

      expect(deepEqualStub.callCount).to.equal(1, 'deepEqual called once');
      var args = deepEqualStub.firstCall.args;
      expect(args[0]).to.equal(actual, 'actual matches');
      expect(args[1]).to.equal(expected, 'expected matches');
      expect(args[2]).to.equal(undefined);
    });

    it('takes an optional message argument', function(assert) {
      var deepEqualStub = sinon.stub(assert, 'deepEqual');
      expect({a: 1}).to.eql({a: 1}, 'keys and values match');
      deepEqualStub.restore();

      expect(deepEqualStub.firstCall.args[2]).to.equal('keys and values match');
    });
  });

  describe('.defined', function() {
    it('delegates to QUnit.push by comparing to null and undefined', function(assert) {
      var pushStub = sinon.stub(assert, 'pushResult');
      expect(99).to.be.defined();
      expect(null).to.be.defined();
      expect(undefined).to.be.defined();
      pushStub.restore();

      expect(pushStub.callCount).to.equal(3, 'push called three times');
      var args;

      args = pushStub.firstCall.args;
      expect(args[0].result).to.equal(true, 'result matches');
      expect(args[0].actual).to.equal(99, 'actual matches');

      args = pushStub.secondCall.args;
      expect(args[0].result).to.equal(false, 'result matches');
      expect(args[0].actual).to.equal(null, 'actual matches');

      args = pushStub.thirdCall.args;
      expect(args[0].result).to.equal(false, 'result matches');
      expect(args[0].actual).to.equal(undefined, 'actual matches');
    });

    it('takes an optional message argument', function(assert) {
      var deepEqualStub = sinon.stub(assert, 'pushResult');
      expect(99).to.be.defined('99 luftballons');
      deepEqualStub.restore();

      expect(deepEqualStub.firstCall.args[0].message).to.equal('99 luftballons');
    });
  });

  describe('.not.defined', function() {
    it('delegates to QUnit.push by comparing to null and undefined', function(assert) {
      var pushStub = sinon.stub(assert, 'pushResult');
      expect(99).to.not.be.defined();
      expect(null).to.not.be.defined();
      expect(undefined).to.not.be.defined();
      pushStub.restore();

      expect(pushStub.callCount).to.equal(3, 'push called three times');
      var args;

      args = pushStub.firstCall.args;
      expect(args[0].result).to.equal(false, 'result matches');
      expect(args[0].actual).to.equal(99, 'actual matches');

      args = pushStub.secondCall.args;
      expect(args[0].result).to.equal(true, 'result matches');
      expect(args[0].actual).to.equal(null, 'actual matches');

      args = pushStub.thirdCall.args;
      expect(args[0].result).to.equal(true, 'result matches');
      expect(args[0].actual).to.equal(undefined, 'actual matches');
    });

    it('takes an optional message argument', function(assert) {
      var deepEqualStub = sinon.stub(assert, 'pushResult');
      expect(99).to.be.defined('99 luftballons');
      deepEqualStub.restore();

      expect(deepEqualStub.firstCall.args[0].message).to.equal('99 luftballons');
    });
  });

  describe('.undefined', function() {
    it('takes an optional message argument', function(assert) {
      var strictEqualStub = sinon.stub(assert, 'strictEqual');
      expect(undefined).to.be['undefined']('tautology');
      strictEqualStub.restore();

      expect(strictEqualStub.firstCall.args[2]).to.equal('tautology');
    });
  });

  describe('.null', function() {
    it('takes an optional message argument', function(assert) {
      var strictEqualStub = sinon.stub(assert, 'strictEqual');
      expect(null).to.be['null']('tautology');
      strictEqualStub.restore();

      expect(strictEqualStub.firstCall.args[2]).to.equal('tautology');
    });
  });

  describe('.true', function() {
    it('takes an optional message argument', function(assert) {
      var strictEqualStub = sinon.stub(assert, 'strictEqual');
      expect(true).to.be['true']('tautology');
      strictEqualStub.restore();

      expect(strictEqualStub.firstCall.args[2]).to.equal('tautology');
    });
  });

  describe('.false', function() {
    it('takes an optional message argument', function(assert) {
      var strictEqualStub = sinon.stub(assert, 'strictEqual');
      expect(false).to.be['false']('tautology');
      strictEqualStub.restore();

      expect(strictEqualStub.firstCall.args[2]).to.equal('tautology');
    });
  });

  describe('.configure', function() {
    it('allows augmenting the default expect assertion', function(assert) {
      var assertion = expect();
      assert.equal(typeof assertion.even, 'undefined');
      expect.configure({
        even: function() {
          this.assert.ok(this._actual % 2 === 0, 'expected ' + this._actual + ' to be even');
        }
      });
      expect(2).to.be.even();
      assert.equal(typeof assertion.even, 'function');
      expect.configure({ even: undefined });
      assert.equal(typeof assertion.even, 'undefined');
    });

    if (Object.defineProperty) {
      it('allows augmenting with getters, e.g. for filler words', function(assert) {
        var assertion = expect();
        assert.equal(typeof assertion.isisis, 'undefined');
        var config = {};
        Object.defineProperty(config, 'isisis', {
          enumerable: true,
          get: function() { return this; }
        });
        expect.configure(config);
        assert.equal(assertion.isisis, assertion);
        expect.configure({ isisis: undefined });
      });
    }
  });
});

var valueFromGlobalBefore;

before(function() {
  valueFromGlobalBefore = new Date();
});

describe('before', function() {
  var x;

  before(function() {
    x = [1];
  });

  it('runs before each `it` test', function() {
    expect(x).to.eql([1]);
  });

  it('runs after any global befores', function(assert) {
    assert.ok(valueFromGlobalBefore !== null && valueFromGlobalBefore !== undefined);
  });

  context('with a nested context containing a `before`', function() {
    before(function() {
      x.push(2);
    });

    before(function() {
      x.push(3);
    });

    it('runs before hooks from the outside in and top to bottom', function() {
      expect(x).to.eql([1, 2, 3]);
    });
  });
});

describe('after', function() {
  var x;
  var expected;

  it('runs after the tests', function() {
    x = [1];
    expected = [1];
  });

  context('with a nested context containing an `after`', function() {
    it('runs after hooks from the inside out and bottom to top', function() {
      x = [];
      expected = [1, 2];
    });

    after(function() {
      x.push(2);
    });

    after(function() {
      x.push(1);
    });
  });

  after(function() {
    expect(x).to.eql(expected);
  });
});

describe('lazy', function() {
  context('with a constant value', function() {
    lazy('name', 'Brian');

    it('makes the lazy value available as a property on the execution context', function() {
      expect(this.name).to.equal('Brian');
    });

    it('can be overridden', function() {
      this.name = "Alex";
      expect(this.name).to.equal('Alex');
    });
  });

  context('with a dynamic value', function() {
    lazy('name', function() { return 'Madeline'; });

    it('makes the lazy value available as a property on the execution context', function() {
      expect(this.name).to.equal('Madeline');
    });

    it('can be overridden', function() {
      this.name = "Alex";
      expect(this.name).to.equal('Alex');
    });
  });

  context('with dependent values', function() {
    var order = [];
    lazy('E', function() { order.push('E'); return this.M * Math.pow(this.C, 2); });
    lazy('M', function() { order.push('M'); return 10; });
    lazy('C', function() { order.push('C'); return 3; });

    it('makes the lazy values available in the order they are accessed', function() {
      expect(this.E).to.equal(90);
      expect(order).to.eql(['E', 'M', 'C']);
    });
  });

  context('defining a value dependent on undefined values', function() {
    lazy('name', function() { return this.firstName + ' ' + this.lastName; });

    context('with a nested context that defines those values', function() {
      lazy('firstName', 'Michael');
      lazy('lastName', 'Bluth');

      it('makes the parent context use the child-defined values', function() {
        expect(this.name).to.equal('Michael Bluth');
      });
    });
  });

  context('allows using a dependent value from a `before` callback', function() {
    var name;
    lazy('name', function() { return this.firstName + ' ' + this.lastName; });

    before(function() {
      name = this.name;
    });

    context('with a nested context that defines the dependencies', function() {
      lazy('firstName', 'Michael');
      lazy('lastName', 'Bluth');

      it('makes the parent context use the child-defined values', function() {
        expect(name).to.equal('Michael Bluth');
      });
    });
  });

  context('with a context defining a lazy used in subsequent tests', function() {
    lazy('object', function() { return {}; });

    it('does not return the same instance used by the test below', function() {
      this.object.definedAbove = true;
      expect(this.object.definedBelow).to.be.undefined();
    });

    it('does not return the same instance used by the test above', function() {
      this.object.definedBelow = true;
      expect(this.object.definedAbove).to.be.undefined();
    });
  });
});

describe('helper', function() {
  context('defines helper functions stashed on the current context', function() {
    helper('someHelper', function(num) {
      return this.anotherHelper(num + 1);
    });

    helper('anotherHelper', function(num) {
      return num + this.inc;
    });

    it('works', function(assert) {
      this.inc = 2;
      var val = this.someHelper(1);
      assert.equal(val, 4);
    });
  });
});

describe('async', function() {
  var order = [];

  before(function() {
    order.push(0);
  });

  before(function(assert) {
    var done = assert.async();
    setTimeout(function() {
      order.push(1);
      done();
    });
  });

  before(function() {
    order.push(2);
  });

  context('with an inner context', function() {
    before(function() {
      order.push(3);
    });

    context('and yet another inner context', function() {
      before(function(assert) {
        var done = assert.async();
        setTimeout(function() {
          order.push(4);
          done();
        });
      });

      it('waits for each `before` and `after` in each level to be done before moving to the next', function(assert) {
        // The assertion is in the final `after` below.
        order.push(5);
        var done = assert.async();
        setTimeout(function() {
          order.push(6);
          done();
        });
      });

      after(function() {
        order.push(7);
      });
    });
  });

  after(function () {
    // ASSERTION HERE
    expect(order).to.eql([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  after(function () {
    order.push(9);
  });

  after(function(assert) {
    var done = assert.async();
    setTimeout(function() {
      order.push(8);
      done();
    });
  });
});

describe('async with promises', function() {
  var order;

  before(function() {
    order = [];
  });

  before(function() {
    order.push(1);

    return new Promise(function(resolve) {
      setTimeout(function() {
        order.push(2);
        resolve();
      });
    });
  });

  before(function() {
    order.push(3);

    return new Promise(function(resolve) {
      setTimeout(function() {
        order.push(4);
        resolve();
      });
    });
  });

  it('waits for promises returned by test callbacks', function() {
    order.push(5);

    return new Promise(function(resolve) {
      setTimeout(function() {
        order.push(6);
        resolve();
      });
    });
  });

  after(function () {
    // ASSERTION HERE
    expect(order).to.eql([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  after(function() {
    order.push(7);

    return new Promise(function(resolve) {
      setTimeout(function() {
        order.push(8);
        resolve();
      });
    });
  });
});

describe('exceptions', function() {
  var pushFailureStub;

  helper('stubPushFailure', function() {
    if (QUnit.config.current.pushFailure) {
      pushFailureStub = sinon.stub(QUnit.config.current, 'pushFailure');
    } else {
      pushFailureStub = sinon.stub(QUnit, 'pushFailure');
    }
  });

  context('thrown in a `before`', function() {
    before(function() {
      this.stubPushFailure();
      throw new Error('deliberately uncaught exception in a `before`');
    });

    it('adds a failure', function() {
      pushFailureStub.restore();
      expect(pushFailureStub.callCount).to.equal(1);
      expect(pushFailureStub.firstCall.args).to.eql([
        'Exception while running qunit-bdd `before` hook: deliberately uncaught exception in a `before`',
        QUnit.config.current.stack
      ]);
    });
  });

  context('thrown in an `it`', function() {
    before(function() {
      this.stubPushFailure();
    });

    it('adds a failure', function() {
      throw new Error('deliberately uncaught exception in an `it`');
    });

    after(function() {
      pushFailureStub.restore();
      expect(pushFailureStub.callCount).to.equal(1);
      var args = pushFailureStub.firstCall.args[1];
      for (var i = 0, length = args.length; i < length; i++) {
        if (typeof args[i] === 'string' && args[i].indexOf('deliberately uncaught exception in an `it`')) {
          return;
        }
      }
      ok(false, args.join(' ') + ' did not contain the expected message');
    });
  });

  if (typeof window !== 'undefined' && window.location.search.indexOf('run-failures=1') >= 0) {
    context('with notrycatch on', function() {
      var notrycatch = QUnit.config.notrycatch;

      before(function() {
        QUnit.config.notrycatch = true;
      });

      context('and a nested context', function() {
        before(function() {
          throw new Error('unhandled exception not being caught!');
        });

        it('bubbles the exception up all the way to the root', function() {
          ok(false, 'we should never get here');
        });
      });

      after(function() {
        QUnit.config.notrycatch = notrycatch;
      });
    });
  }
});

describe('improper DSL usage', function() {
  it('disallows calling `describe` within a test', function(assert) {
    assert.throws(
      function() { describe('foo', function() {}) },
      /cannot call `describe` within a running test/
    );
  });

  it('disallows calling `context` within a test', function(assert) {
    assert.throws(
      function() { context('foo', function() {}) },
      /cannot call `context` within a running test/
    );
  });

  it('disallows calling `before` within a test', function(assert) {
    assert.throws(
      function() { before(function() {}) },
      /cannot call `before` within a running test/
    );
  });

  it('disallows calling `after` within a test', function(assert) {
    assert.throws(
      function() { after(function() {}) },
      /cannot call `after` within a running test/
    );
  });

  it('disallows calling `lazy` within a test', function(assert) {
    assert.throws(
      function() { lazy('foo', function() {}) },
      /cannot call `lazy` within a running test/
    );
  });

  it('disallows calling `helper` within a test', function(assert) {
    assert.throws(
      function() { helper('foo', function() {}) },
      /cannot call `helper` within a running test/
    );
  });
});
