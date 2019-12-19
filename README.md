## qunit-bdd

BDD-style testing for QUnit.

> **NOTE:** This library should be considered deprecated in favor of using [Mocha](https://mochajs.org/), which offers a similar BDD API. You're welcome to use it, but please do not expect a response to issues or pull requests.

```js
describe('keys', function() {
  describe('.camelize', function() {
    it('camelizes top-level keys', function() {
      expect(camelize({ ohai_there: 'friend' })).to.eql({ ohaiThere: 'friend' });
    });

    it('camelizes nested keys', function() {
      expect(camelize({ foo_bar: { bar_baz: 'baz' } }))
        .to.eql({ fooBar: { barBaz: 'baz' } });
    });

    it('camelizes array objects', function() {
      expect(camelize([{ foo_bar: { bar_baz: 'baz' } }, { ohai_there: 'friend' }]))
        .to.eql([{ fooBar: { barBaz: 'baz' } }, { ohaiThere: 'friend' }]);
    });
  });
});
```

### Installation

```bash
# Install via Yarn.
$ yarn add --dev qunit-bdd

# Install via NPM.
$ npm install [--save-dev] qunit-bdd

# Install from Git.
$ git clone https://github.com/square/qunit-bdd.git
$ cp qunit-bdd/lib/qunit-bdd.js my-project/vendor/qunit-bdd.js
```

### Requirements

[QUnit](https://qunitjs.com/) must be installed alongside this package.

| qunit-bdd | Supported QUnit Versions |
| --- | --- |
| v1.x | v1.x |
| v2.x | v2.0 - v2.5.1 |
| v3.x | v2.6+ |

### Usage

qunit-bdd has `describe` and `context`, just like Mocha and Jasmine. It also
provides an assertion syntax similar to expect.js.

```js
describe('Math', function() {
  describe('#pow', function() {
    it('raises the first argument to the power of the second argument', function() {
      expect(Math.pow(0, 6)).to.equal(0, '0**x == 0');
      expect(Math.pow(1, 99)).to.equal(1, '1**x == 1');
      expect(Math.pow(99, 0)).to.equal(1, 'x**0 == 1');
      expect(Math.pow(2, 3)).to.equal(8, 'positive exponent works');
      expect(Math.pow(4, -1)).to.equal(2, 'negative exponent works');
    });
  });
});
```

qunit-bdd also has `before` and `after` to run blocks of code before an after
each test run within a context:

```js
// This example uses sinon.js, not included with qunit-bdd.
describe('Profile Page', function() {
  before(function() {
    this.alertStub = sinon.stub(window, 'alert');
  });

  it('alerts on errors', function() {
    doSomethingToCauseAnError();
    expect(this.alertStub.calledWith('UH OH!')).to.be.true();
  });

  after(function() {
    this.alertStub.restore();
  });
});
```

Additionally, qunit-bdd ships with support for RSpec-style per-context `let`
values, called `lazy` values in qunit-bdd. This is very useful when you want to
declare how to set up a complex object in a top-level context, overriding parts
of that setup in nested contexts:

```js
describe('Person', function() {
  lazy('person', function() {
    return new Person({
      firstName: this.firstName,
      lastName: this.lastName,
      dob: this.dob,
      address: this.address
    });
  });

  lazy('address', function() {
    return {
      street1: this.street1,
      street2: this.street2,
      city: this.city,
      state: this.state,
      postal: this.postal
    };
  });

  // Defaults for dependent values could be put here (e.g. firstName, street1, etc).

  describe('#canVote', function() {
    context('when the person is not yet 18', function() {
      lazy('dob', function(){ return new Date(); });

      it('is false', function() {
        expect(this.person.canVote()).to.be.false();
      });
    });

    context('when the person is over 18', function() {
      lazy('dob', function(){ return new Date(0); });

      it('is true', function() {
        expect(this.person.canVote()).to.be.true();
      });
    });
  });
});
```

The benefit to this approach over setting up your test objects in `before` is
that you can override parts of the built objects declaratively in nested
contexts, something you might have used a bunch of helper functions to do with
QUnit's default `module`/`test` functions.

You can also use `helper` to define helper functions that have access to
everything defined on the test context. This is useful for reusing a
piece of code between tests that have different setups. Example:

```js
describe('APIRequest', function() {
  before(function() {
    this.url = "http://api.endpoint.com";
    this.apiController = new ApiController();
    this.moreTestState = {};
  });

  helper('fireApiRequest', function() {
    // full access to everything on current context.
    this.apiController.ajax(this.url, this.moreTestState);
  });

  it('works', function() {
    // ... test-specific setup
    this.fireApiRequest();
  });

  it('works in another context', function() {
    // ... test-specific setup
    this.fireApiRequest();
  });
});
```

#### Async

qunit-bdd supports `async` functions as `before`, `after`, or `it` callbacks.
You may also return `Promise` objects from `before`, `after`, and `it` blocks as
a means of writing async tests. We rely on QUnit's own mechanism for this
functionality, which means we require at leastd QUnit v1.16. Here's a basic
example:

```js
describe('delay', function() {
  it('returns a promise that resolves after Nms', async function() {
    await delay(10);
    ok(true, 'promise resolved!');
  });
});
```

You can write this using explicit `Promise` syntax if you prefer:

```js
describe('delay', function() {
  it('returns a promise that resolves after Nms', function() {
    return delay(10).then(() => {
      ok(true, 'promise resolved!');
    });
  });
});
```

### Configuration

It's still QUnit, so you can write some tests using the `module`/`test` style,
complete with the usual `ok`/`equal`/`deepEqual` assertions, if you find it
more appropriate sometimes. Also, you can export as much or as little of
qunit-bdd to the global scope as you like:

```js
// Turn off `lazy` and `context` exports.
// Make sure to set this before loading qunit-bdd.js.
QUNIT_BDD_OPTIONS = {
  GLOBALS: {
    lazy: false,  // don't use lazy
    expect: false // use the regular QUnit assertions (or another set altogether)
  }
};
```

#### Randomness

By default your tests will run in the order in which they are defined. This is
usually desirable for interactive development and debugging. But for continuous
integration you may want to run your tests in a random order to reveal any
hidden dependencies between your tests that may be causing them not to work as
expected. To turn this on, set `QUNIT_BDD_OPTIONS.randomize` to `true`. Doing
so will first shuffle your `describe`s, then shuffle the `it`s within.

If you want to use a particular randomizer, pass a function that takes an array
and returns a shuffled array instead of `true`.  For example, here's how to
configure qunit-bdd to use [chance.js][chance.js] with a random (but
repeatable, for reproducing failures locally) seed:

```js
var seed = Math.floor(Math.random() * 1000);
console.log('Random test order seed:', seed);
var chance = new Chance(seed);
QUNIT_BDD_OPTIONS = {
  randomize: function(array) {
    return chance.shuffle(array);
  }
};
```

#### Skipping Tests

You can also configure which tests are run, which can aid in debugging. To skip
a particular test (or context), use `it.skip()` instead of `it()` (or
`describe.skip()` instead of `describe()`). To run *only* a particular test (or
context), use `it.only()` instead of `it` (or `describe.only()` instead of
`describe()`).

#### Expectations / Assertions

You can configure the built-in assertion `expect()` function to add your own
custom assertions or override the built-in ones:

```js
expect.configure({
  // expect(2).to.be.even();
  even: function() {
    QUnit.ok(!(this._actual % 2), 'expected ' + this._actual + ' to be even');
  }
});
```

Note that the `expect()` function can still be used as you would while writing
QUnit tests the normal way, i.e. as `expect(4)` to set the number of expected
assertions.

### Status

[![Greenkeeper badge](https://badges.greenkeeper.io/square/qunit-bdd.svg)](https://greenkeeper.io/)

### Community

Come chat on our [Google Group][google-group] page or use the
[qunit-bdd][stack-overflow] tag on Stack Overflow.

### Contributing

#### Setup

First, install the development dependencies:

```
$ yarn
```

Then, try running the tests:

```
$ yarn test
```

#### Development

As you make changes you may find it useful to have everything automatically
compiled and ready to test interactively in the browser. You can do that using
the `develop` script:

```
$ yarn run develop
```

Then go to http://localhost:8000/test in your browser (run with `PORT={port}`
to override the default port).

#### Pull Requests

Contributions via pull requests are very welcome! Follow the steps in
Developing above, then add your feature or bugfix with tests to cover it, push
to a branch, and open a pull request.

Any contributors to the master qunit-bdd repository must sign the [Individual
Contributor License Agreement (CLA)][cla]. It's a short form that covers our
bases and makes sure you're eligible to contribute.

[cla]: https://spreadsheets.google.com/spreadsheet/viewform?formkey=dDViT2xzUHAwRkI3X3k5Z0lQM091OGc6MQ&ndplr=1

When you have a change you'd like to see in the master repository, [send a pull
request](https://github.com/square/qunit-bdd/pulls). Before we merge your
request, we'll make sure you're in the list of people who have signed a CLA.

[chance.js]: http://chancejs.com/
[google-group]: https://groups.google.com/forum/#!forum/qunit-bdd
[stack-overflow]: http://stackoverflow.com/questions/tagged/qunit-bdd

### Why?

QUnit is a well-tested testing framework used by projects such as jQuery and
Ember. It works very well for unit-style testing with fairly simple inputs and
outputs. It is less well suited to acceptance or integration testing, where you
often want to test slight variations of the same thing. The nested context of
the BDD style translate well to this sort of need.

You might be wondering, "Why not just use Pavlov?" That is a reasonable
question. Pavlov has been around for some time and has reached the point, much
like QUnit itself, where not much changes. Both are stable and reliable.
Unfortunately, Pavlov has a number of assumptions that did not work well with
how we test applications at Square. We wanted the ability to use multiple
`before` and `after` blocks per `describe` (for shared examples). We wanted
async to be a first-class citizen, not something to be avoided. Pavlov runs
`before` blocks synchronously from the outermost to the innermost `describe`.
We needed to be able to pause until the `before` in an outer describe finished
before running the `before` in the next inner `describe`. Finally, we wanted an
equivalent to RSpec's `let` to give us a more declarative style for our objects
under test, complete with easy overrides in nested contexts. This is `lazy` in
qunit-bdd.
