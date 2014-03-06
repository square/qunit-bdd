## qunit-bdd

BDD-style testing for QUnit.

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

```
# Install via NPM.
$ npm install [--save-dev] qunit-bdd

# Install via Bower.
$ bower install [-D] qunit-bdd

# Install from Git.
$ git clone https://github.com/square/qunit-bdd.git
$ cp qunit-bdd/lib/qunit-bdd.js my-project/vendor/qunit-bdd.js
```

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

### QUnit

It's still QUnit, so you can write some tests using the `module`/`test` style,
complete with the usual `ok`/`equal`/`deepEqual` assertions, if you find it
more appropriate sometimes. Also, you can export as much or as little of
qunit-bdd to the global scope as you like:

```js
// Turn off `lazy` and `context` exports.
QUNIT_BDD_OPTIONS = {
  GLOBAL: {
    lazy: false,
    context: false
  }
};
```

Make sure to set this before loading qunit-bdd.js.

### Contributing

#### Setup

First, install the development dependencies:

```
$ npm install
```

You may need to install the `grunt` command-line utility:

```
$ [sudo] npm install -g grunt-cli
```

Then, try running the tests:

```
$ npm test
```

### Development

As you make changes you may find it useful to have everything automatically
compiled and ready to test interactively in the browser. You can do that using
the `develop` grunt test:

```
$ grunt develop
```

Then go to http://localhost:8000/test in your browser (run with `PORT={port}`
to override the default port).

### Pull Requests

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
