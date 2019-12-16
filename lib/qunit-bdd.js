/* eslint-env browser */

void function(global, exports, QUnit, options) {
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
   * @param {?object} options
   */
  function Context(description, parent, options) {
    this.description = description;
    this.parent = parent;
    this.skipped = (options && options.skipped) || (parent && parent.skipped);
    this.tests = [];
    this.before = [];
    this.after = [];
    this.lazySetup = [];
    this.lazyTeardown = [];
  }

  function wrapHookCallback(fn, hook) {
    // QUnit calls hooks with `assert` as the param and the `testEnvironment` as the `this` context
    return function(assert) {
      if (QUnit.config.notrycatch) {
        return fn.call(this, assert);
      } else {
        try {
          return fn.call(this, assert);
        } catch (e) {
          if (e.stack) {
            console.error(e.stack);
          }
          QUnit.pushFailure(
            'Exception while running qunit-bdd `' + hook + '` hook: ' +
            (e.message || e),
            QUnit.config.current.stack
          );
        }
      }
    };
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
   * Queues the named hook in the given direction using the given execution
   * environment. This is used to set up `lazy` values, run `before` and
   * `after` callbacks, and tear down `lazy` values.
   *
   * See `addTestsToQUnit` for an explanation of how QUnit's queue is used to
   * handle these hooks and async.
   *
   * @private
   * @param {string} hook The name of the hook, such as "before".
   * @param {boolean} options.insideFirst true to run from inside-out, false to run outside-in.
   * @param {QUnit.Assert} assert
   */
  Context.prototype.gatherHook = function(hook, options) {
    var queue = [];
    if (options.insideFirst) {
      this.gatherHooksInsideFirstHelper(hook, queue);
      return queue.reverse();
    } else {
      this.gatherHooksOutsideFirstHelper(hook, queue);
    }
    return queue;
  };

  Context.prototype.gatherHooksInsideFirstHelper = function(hook, queue) {
    var parent = this.parent;

    this[hook].forEach(function(fn) {
      queue.push(wrapHookCallback(fn, hook));
    });

    if (parent) {
      parent.gatherHooksInsideFirstHelper(hook, queue);
    }
  };

  Context.prototype.gatherHooksOutsideFirstHelper = function(hook, queue) {
    var parent = this.parent;

    if (parent) {
      parent.gatherHooksOutsideFirstHelper(hook, queue);
    }

    this[hook].forEach(function(fn) {
      queue.push(wrapHookCallback(fn, hook));
    });
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
   * @private
   * @return {?Context}
   */
  function currentContext() {
    return contextStack[contextStack.length - 1];
  }

  /**
   * Processes the current contexts by setting them up as QUnit modules.
   *
   * @private
   */
  function addTestsToQUnit() {
    if (options.randomize) {
      pendingContexts = randomize(pendingContexts);
    }

    pendingContexts.forEach(function(context) {
      QUnit.module(context.fullDescription());

      var tests = context.tests;

      if (options.randomize) {
        tests = randomize(tests.slice());
      }

      var currentModule = QUnit.config.currentModule;
      var currentHooks = currentModule.hooks;

      var beforeHooks = context.gatherHook('before', { insideFirst: false }, QUnit.assert);
      var afterHooks = context.gatherHook('after', { insideFirst: true }, QUnit.assert);
      var lazySetupHooks = context.gatherHook('lazySetup', { insideFirst: false }, QUnit.assert);
      var lazyTeardownHooks = context.gatherHook('lazyTeardown', { insideFirst: true }, QUnit.assert);

      currentHooks.beforeEach = (currentHooks.beforeEach || []).concat(beforeHooks);
      currentHooks.afterEach = (currentHooks.afterEach || []).concat(afterHooks);

      currentHooks.beforeEach = (lazySetupHooks || []).concat(currentHooks.beforeEach || []);
      currentHooks.afterEach = (currentHooks.afterEach || []).concat(lazyTeardownHooks || []);

      tests.forEach(function(test) {
        function body(assert) {
          return test.body.call(this, assert);
        }

        if (test.body.skipped) {
          QUnit.skip(test.description, body);
        } else {
          QUnit.test(test.description, body);
        }
      });
    });

    pendingContexts.length = 0;
  }

  /**
   * Shuffle the entries of `array` randomly.
   *
   * @private
   * @param {Array.<T>} array
   * @return {Array.<T>}
   */
  function shuffle(array) {
    var j, x, i = array.length;
    while (i) {
       j = Math.floor(Math.random() * i);
       x = array[--i];
       array[i] = array[j];
       array[j] = x;
    }
    return array;
  }
  var randomize = (typeof options.randomize === 'function') ?
    options.randomize :
    shuffle;

  function assertDSLMethodCallable(method) {
    if (QUnit.config.current) {
      throw new Error('cannot call `' + method + '` within a running test');
    }
  }

  // Add test suites just before QUnit starts running.
  QUnit.begin(addTestsToQUnit);

  /**
   * Creates a context and adds it to the current context state.
   *
   * @param {string} description
   * @param {function(this: Context)} body
   * @param {?object} options
   */
  function describe(description, body, options) {
    assertDSLMethodCallable('describe');

    var desc = new Context(description, currentContext(), options);

    pendingContexts.push(desc);
    contextStack.push(desc);
    body.call(desc);
    contextStack.pop();
  }

  /**
   * Creates a context and adds it to the current context state.
   *
   * @param {string} description
   * @param {function(this: Context)} body
   * @param {?object} options
   * @alias describe
   */
  function context(description, body, options) {
    assertDSLMethodCallable('context');
    describe(description, body, options);
  }

  /**
   * Creates a test for the current context.
   *
   * @param {string} description
   * @param {function()} body
   * @param {boolean} skipped
   */
  function it(description, body, /* internal */ skipped) {
    assertDSLMethodCallable('it');

    var context = currentContext();
    if (context.skipped || skipped) {
      description += ' (SKIPPED)';
      body = skippedTestBody;
    }
    context.tests.push({
      description: description,
      body: body
    });
  }

  /**
   * All skipped tests do the same thing so we can reuse the body function,
   * which is what this is for.
   *
   * @private
   */
  var skippedTestBody = function(assert) {
    assert.expect(0);

    if (typeof document !== 'undefined') {
      var testRow = document.getElementById(QUnit.config.current.id);
      if (testRow && testRow.style) {
        testRow.style.opacity = 0.5;
      }
    }
  };
  skippedTestBody.skipped = true;

  /**
   * Allows leaving a `describe` in place but having QUnit skip all the tests,
   * as if you'd annotated all of them with `.skip` instead.
   *
   * @param {string} description
   * @param {function()} body
   */
  describe.skip = makeSkip(describe);

  /**
   * Configures QUnit to run only tests defined within this `describe`.
   *
   * @param {string} description
   * @param {function()} body
   */
  describe.only = makeOnly(describe);


  /**
   * Allows leaving a `context` in place but having QUnit skip all the tests,
   * as if you'd annotated all of them with `.skip` instead.
   *
   * @param {string} description
   * @param {function()} body
   */
  context.skip = makeSkip(context);

  /**
   * Configures QUnit to run only tests defined within this `context`.
   *
   * @param {string} description
   * @param {function()} body
   */
  context.only = makeOnly(context);

  /**
   * @param {function(string, function(), *)} method
   * @returns {function(string, function())}
   */
  function makeSkip(method) {
    return function(description, body) {
      method(description, body, { skipped: true });
    };
  }

  /**
   * @param {function(string, function(), *)} method
   * @returns {function(string, function())}
   */
  function makeOnly(method) {
    return function(description, body) {
      var module = currentContext().fullDescription();
      if (module) {
        module += ' ' + description;
      } else {
        module = description;
      }
      QUnit.config.module = module;
      method(description, body);
    };
  }

  /**
   * Allows leaving a test intact but without it being run. It will be marked
   * as skipped both in the name of the test and, if running with a DOM, by
   * marking the test results.
   *
   * @param {string} description
   * @param {function()} body
   */
  it.skip = function(description, body) {
    it(description, body, true);
  };

  /**
   * Allows running only a specific test by using `it.only` instead of `it`.
   * This is the same as running with a specific module/filter combination, but
   * is more practical in situations where accessing the QUnit UI or URL is
   * difficult.
   *
   * @param {string} description
   * @param {function()} body
   */
  it.only = function(description, body) {
    QUnit.config.module = currentContext().fullDescription();
    QUnit.config.filter = description;
    it(description, body);
  };

  /**
   * Registers a function to run before each test in the current context and
   * all its descendant contexts.
   *
   * @param {function()} body
   */
  function before(body) {
    assertDSLMethodCallable('before');
    currentContext().before.push(body);
  }

  /**
   * Registers a function to run after each test in the current context and
   * all its descendant contexts.
   *
   * @param {function()} body
   */
  function after(body) {
    assertDSLMethodCallable('after');
    currentContext().after.push(body);
  }

  /**
   * Registers a helper function on the current context.
   *
   * Example
   *
   *   describe('api', function() {
   *     before(function() {
   *       this.apiController = {};
   *     });
   *
   *     helper('fireApiRequest', function() {
   *       // full access to everything on `this` context.
   *       // this.apiController.doSomething()...
   *     });
   *
   *     it('works', function() {
   *       this.fireApiRequest();
   *     });
   *
   *     it('works another way', function() {
   *       this.fireApiRequest();
   *     });
   *   });
   *
   * @param {function()} body
   */
  function helper(name, fn) {
    assertDSLMethodCallable('helper');
    lazy(name, function() { return fn; });
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
   *     lazy('person', function() {
   *       return new Person(this.firstName, this.lastName);
   *     });
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
    assertDSLMethodCallable('lazy');

    var cached = false;
    var getter;

    if (typeof value === 'function') {
      getter = value;
    } else {
      getter = function() { return value; };
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
        },
        set: function(newValue) {
          cached = true;
          value = newValue;
        }
      });
    });

    currentContext().lazyTeardown.push(function() {
      cached = false;
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
   * @param {QUnit.Assert} assert
   */
  function Assertion(actual, assert) {
    this._actual = actual;
    this._flags = {};
    this.assert = assert;
  }

  /**
   * Creates a new Assertion.
   *
   * @param {*} actual
   * @return {Assertion}
   */
  function expect(actual) {
    var assertion = new Assertion(actual, QUnit.config.current.assert);

    Object.defineProperty(assertion, '_previousExpectedAssertions', {
      value: QUnit.config.current.expected,
      enumerable: false
    });

    if (typeof actual === 'number') {
      QUnit.config.current.expected = actual;
    }

    return assertion;
  }

  /**
   * Add your own assertions or customize built-in ones here.
   *
   *   expect.configure({
   *     // expect(2).to.be.even();
   *     even: function() {
   *       QUnit.ok(
   *         !(this._actual % 2),
   *         'expected ' + this._actual + ' to be even'
   *       );
   *     }
   *   });
   *
   * @param {object} assertions
   */
  expect.configure = function(assertions) {
    Object.getOwnPropertyNames(assertions).forEach(function(key) {
      var descriptor = Object.getOwnPropertyDescriptor(assertions, key);
      if (descriptor) {
        descriptor.configurable = true;
        if (descriptor.get) {
          descriptor.get = assertionWrapper(key, descriptor.get);
        } else if (typeof descriptor.value === 'function') {
          descriptor.value = assertionWrapper(key, descriptor.value);
        }
        Object.defineProperty(Assertion.prototype, key, descriptor);
      }
    });
  };

  /**
   * Creates a wrapper function that restores any expect count that might have
   * been set before we overrode it.
   *
   * @param {Function} fn
   * @return {Function}
   */
  function assertionWrapper(key, fn) {
    return function() {
      var previousExpectedAssertions = this._previousExpectedAssertions;
      QUnit.config.current.expected = previousExpectedAssertions;
      return fn.apply(this, arguments);
    };
  }

  expect.configure(Object.defineProperties({}, {
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
    },

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
    to: {
      get: function() {
        return this;
      }
    },

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
    be: {
      get: function() {
        return this;
      }
    },

    /**
     * Asserts that the actual and expected values are (or are not) equal. This
     * method checks using strict equality (===) and delegates to
     * QUnit.(not)strictEqual.
     *
     * @param {*} expected
     * @param {?string} message
     */
    equal: {
      value: function(expected, message) {
        if (this._flags.negate) {
          this.assert.notStrictEqual(this._actual, expected, message);
        } else {
          this.assert.strictEqual(this._actual, expected, message);
        }
      }
    },

    /**
     * Asserts that the actual and expected values are (or are not) deeply equal.
     * This method checks that object keys and values match up, recursively. This
     * method delegates to QUnit.(not)deepEqual.
     *
     * @param {*} expected
     * @param {?string} message
     */
    eql: {
      value: function(expected, message) {
        if (this._flags.negate) {
          this.assert.notDeepEqual(this._actual, expected, message);
        } else {
          this.assert.deepEqual(this._actual, expected, message);
        }
      }
    },

    /**
     * Asserts that the actual value is (or is not) undefined.
     */
    undefined: {
      value: function(message) {
        this.equal(void 0, message);
      }
    },

    /**
     * Asserts that the actual value is (or is not) null.
     */
    null: {
      value: function(message) {
        this.equal(null, message);
      }
    },

    /**
     * Asserts that the actual value is (or is not) false.
     */
    false: {
      value: function(message) {
        this.equal(false, message);
      }
    },

    /**
     * Asserts that the actual value is (or is not) true.
     */
    true: {
      value: function(message) {
        this.equal(true, message);
      }
    },

    /**
     * Asserts that the actual value is (or is not) null or undefined.
     */
    defined: {
      value: function(message) {
        if (this._flags.negate) {
          this.assert.pushResult({
            result: this._actual === null || this._actual === undefined,
            actual: this._actual,
            message
          });
        } else {
          this.assert.pushResult({
            result: this._actual !== null && this._actual !== undefined,
            actual: this._actual,
            message
          });
        }
      }
    }
  }));

  /**
   * Fails a test unconditionally with the given message.
   *
   * @param {string} message
   */
  function fail(message) {
    QUnit.config.current.assert.ok(false, message);
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
    context: context,
    it: it,
    before: before,
    after: after,
    lazy: lazy,
    expect: expect,
    fail: fail,
    helper: helper
  });
}.call(this,
  /* global global window module exports QUnit QUNIT_BDD_OPTIONS */

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
