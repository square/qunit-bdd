/* jshint node:true, browser:true, undef:true */
/* global QUnit, QUNIT_BDD_OPTIONS  */

;(function(global, exports, QUnit, options) {
  if (!QUnit) {
    throw new Error('Unable to locate QUnit! Please load it before qunit-bdd.');
  }

  /**
   * Represents an execution context for tests created by calls to `describe`
   * and `context`. Contexts can be nested inside each other.
   *
   * @class
   * @private
   * @param {string} description
   * @param {?Context} parent
   */
  function Context(description, parent) {
    this.description = description;
    this.parent = parent;
    this.tests = [];
    this.before = [];
    this.after = [];
    this.lazySetup = [];
    this.lazyTeardown = [];
  }

  /**
   * Gets the full context description by prepending any parent context
   * descriptions joined by a space.
   *
   * @return {string}
   */
  Context.prototype.fullDescription = function() {
    if (this.parent) {
      var parentDescription = this.parent.fullDescription();
      if (parentDescription) {
        return parentDescription + ' ' + this.description;
      }
    }
    return this.description;
  };

  /**
   * Runs the named hook in the given direction using the given execution
   * environment. This is used to set up `lazy` values, run `before` and
   * `after` callbacks, and tear down `lazy` values.
   *
   * @private
   * @param {string} hook The name of the hook, such as "before".
   * @param {up} boolean true to run from inside-out, false to run outside-in.
   * @param {object} env `this` inside the hook callback functions.
   */
  Context.prototype.runHook = function(hook, up, env) {
    if (up) {
      this[hook].forEach(function(fn){ fn.call(env); });
      if (this.parent) {
        this.parent.runHook(hook, up, env);
      }
    } else {
      if (this.parent) {
        this.parent.runHook(hook, up, env);
      }
      this[hook].forEach(function(fn){ fn.call(env); });
    }
  };


  /**
   * Context state data. The root context handles top-level `before` and
   * `after` callbacks.
   */

  var root = new Context();
  var pendingContexts = [];
  var contextStack = [root];

  /**
   * Gets the innermost context whose body is being evaluated.
   *
   * @return {?Context}
   */
  function currentContext() {
    return contextStack[contextStack.length-1];
  }

  /**
   * Processes the current contexts by setting them up as QUnit modules.
   *
   * @private
   */
  function addTestsToQUnit() {
    pendingContexts.forEach(function(context) {
      QUnit.module(context.fullDescription(), {
        setup: function() {
          context.runHook('lazySetup', false, this);
          context.runHook('before', false, this);
        },
        teardown: function() {
          context.runHook('after', true, this);
          context.runHook('lazyTeardown', true, this);
        }
      });

      context.tests.forEach(function(test) {
        QUnit.test(test.description, test.body);
      });
    });

    pendingContexts.length = 0;
  }

  /**
   * Creates a context and adds it to the current context state.
   *
   * @param {string} description
   * @param {function(this: Context)} body
   */
  function describe(description, body) {
    var desc = new Context(description, currentContext());

    pendingContexts.push(desc);
    contextStack.push(desc);
    body.call(desc);
    contextStack.pop();

    if (contextStack.length === 1 /* i.e. only root */) {
      addTestsToQUnit();
    }
  }

  /**
   * Creates a test for the current context.
   *
   * @param {string} description
   * @param {function()} body
   */
  function it(description, body) {
    currentContext().tests.push({
      description: description,
      body: body,
      context: {}
    });
  }

  /**
   * Registers a function to run before each test in the current context and
   * all its descendant contexts.
   *
   * @param {function()} body
   */
  function before(body) {
    currentContext().before.push(body);
  }

  /**
   * Registers a function to run after each test in the current context and
   * all its descendant contexts.
   *
   * @param {function()} body
   */
  function after(body) {
    currentContext().after.push(body);
  }

  /**
   * Registers a named value to be made available in all before/after/it blocks
   * for the current context. This helper allows you to create complex values
   * that are dependent on simpler values that may be overridden in child
   * contexts.
   *
   * `value` may either be a function, in which case the value is lazily
   * determined as needed, or a non-function value, in which case the given
   * value will be used as-is. Dynamic values only have their value computed
   * once per test. Keep in mind the value will not be generated at all if the
   * value is not used.
   *
   * Example
   *
   *   describe('Person', function() {
   *     lazy('person', function(){ return new Person(this.firstName, this.lastName); });
   *
   *     describe('#name', function() {
   *       context('with both first and last name', function() {
   *         lazy('firstName, 'Jim');
   *         lazy('lastName', 'Henson');
   *
   *         it('joins first and last names on spaces', function() {
   *           expect(this.person.name).to.equal('Jim Henson');
   *         });
   *       });
   *
   *       context('with only first name', function() {
   *         lazy('firstName, 'Jim');
   *
   *         it('uses only the first name', function() {
   *           expect(this.person.name).to.equal('Jim');
   *         });
   *       });
   *     });
   *   });
   *
   * @param {string} name
   * @param {*} value
   */
  function lazy(name, value) {
    var cached, getter;
    if (typeof value === 'function') {
      getter = value;
      cached = false;
    } else {
      cached = true;
    }

    currentContext().lazySetup.push(function() {
      Object.defineProperty(this, name, {
        enumerable: false,
        configurable: true,
        get: function() {
          if (!cached) {
            value = getter.call(this);
            cached = true;
          }
          return value;
        }
      });
    });

    currentContext().lazyTeardown.push(function(context) {
      Object.defineProperty(this, name, {
        enumerable: false,
        configurable: true,
        value: void 0
      });
    });
  }

  /**
   * Represents an assertion created by calling `expect`.
   *
   * @class
   * @private
   * @param {*} actual
   */
  function Assertion(actual) {
    this._actual = actual;
    this._flags = {};
    /**
     * Syntactic sugar to help readability:
     *
     *   // This doesn't read very nicely.
     *   expect(1).equal(1);
     *
     *   // But this does.
     *   expect(1).to.equal(1);
     *
     * @return {Assertion}
     */
    this.to = this;
    /**
     * Syntactic sugar to help readability:
     *
     *   // This doesn't read very nicely.
     *   expect(true).true();
     *
     *   // But this does.
     *   expect(true).to.be.true();
     *
     * @return {Assertion}
     */
    this.be = this;
    Object.defineProperties(this, {
      /**
       * Negates the meaning of this assertion.
       *
       *   expect(1).not.to.equal(2);
       *
       * @return {Assertion}
       */
      not: {
        get: function() {
          this._flags.negate = !this._flags.negate;
          return this;
        }
      }
    });
  }

  /**
   * Asserts that the actual and expected values are (or are not) equal. This
   * method checks using strict equality (===) and delegates to
   * QUnit.(not)strictEqual.
   *
   * @param {*} expected
   * @param {?string} message
   */
  Assertion.prototype.equal = function(expected, message) {
    if (this._flags.negate) {
      QUnit.notStrictEqual(this._actual, expected, message);
    } else {
      QUnit.strictEqual(this._actual, expected, message);
    }
  };

  /**
   * Asserts that the actual and expected values are (or are not) deeply equal.
   * This method checks that object keys and values match up, recursively. This
   * method delegates to QUnit.(not)deepEqual.
   *
   * @param {*} expected
   * @param {?string} message
   */
  Assertion.prototype.eql = function(expected, message) {
    if (this._flags.negate) {
      QUnit.notDeepEqual(this._actual, expected, message);
    } else {
      QUnit.deepEqual(this._actual, expected, message);
    }
  };

  /**
   * Asserts that the actual value is (or is not) undefined.
   */
  Assertion.prototype.undefined = function() {
    this.equal(void 0);
  };

  /**
   * Asserts that the actual value is (or is not) null.
   */
  Assertion.prototype.null = function() {
    this.equal(null);
  };

  /**
   * Asserts that the actual value is (or is not) false.
   */
  Assertion.prototype.false = function() {
    this.equal(false);
  };

  /**
   * Asserts that the actual value is (or is not) true.
   */
  Assertion.prototype.true = function() {
    this.equal(true);
  };

  /**
   * Asserts that the actual value is (or is not) null or undefined.
   */
  Assertion.prototype.defined = function(message) {
    if (this._flags.negate) {
      QUnit.push(
        this._actual === null || this._actual === undefined,
        this._actual, undefined, message);
    } else {
      QUnit.push(
        this._actual !== null && this._actual !== undefined,
        this._actual, undefined, message);
    }
  };

  /**
   * Creates a new Assertion.
   *
   * @param {*} actual
   * @return {Assertion}
   */
  function expect(actual) {
    return new Assertion(actual);
  }

  /**
   * Fails a test unconditionally with the given message.
   *
   * @param {string} message
   */
  function fail(message) {
    QUnit.ok(false, message);
  }

  /**
   * GLOBALS configures which API methods should be globally exported, if any.
   * In a CommonJS environment API methods will by default not be made global.
   * In other environments they will be exported by default.
   *
   * To configure this behavior you can set QUNIT_BDD_OPTIONS.GLOBALS to true,
   * false, or an object with function names as keys and boolean values. For
   * example, to disable only the `lazy` function globally:
   *
   *   QUNIT_BDD_OPTIONS.GLOBALS = { lazy: false };
   */
  var GLOBALS = options.GLOBALS;
  if (GLOBALS === undefined) {
    GLOBALS = !exports;
  }

  function doExports(map) {
    for (var key in map) {
      if (map.hasOwnProperty(key)) {
        if (exports) {
          exports[key] = map[key];
        }
        if (GLOBALS === true ||
            (typeof GLOBALS === 'object' &&
             GLOBALS[key] !== false)) {
          global[key] = map[key];
        }
      }
    }
  }

  doExports({
    describe: describe,
    context: describe,
    it: it,
    before: before,
    after: after,
    lazy: lazy,
    expect: expect,
    fail: fail
  });
}).call(this,
  // global
  (typeof global !== 'undefined') ? global :
  (typeof window !== 'undefined') ? window : this,
  // exports
  (typeof module !== 'undefined' &&
   typeof exports !== 'undefined' &&
   module.exports === exports) ? exports : null,
  // QUnit
  (typeof QUnit !== 'undefined') && QUnit,
  // options
  (typeof QUNIT_BDD_OPTIONS !== 'undefined') &&
   QUNIT_BDD_OPTIONS || this.QUNIT_BDD_OPTIONS || {}
);
