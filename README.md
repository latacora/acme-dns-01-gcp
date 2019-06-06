# [acme-challenge-test](https://git.rootprojects.org/root/acme-challenge-test.js.git) | A [Root](https://rootprojects.org) Project

The test harness you should use when writing an ACME challenge strategy
for [Greenlock](https://git.coolaj86.com/coolaj86/greenlock-express.js) v2.7+ (and v3).

All implementations MUST pass these tests, which is a very easy thing to do (just `set()`, `get()`, and `remove()`).

The tests account for single-domain certificates (`example.com`) as well as multiple domain certs (SAN / AltName),
wildcards (`*.example.com`), and valid private / localhost certificates. As someone creating a challenge strategy
that's not something you have to take special consideration for - just pass the tests.

**Node v6 Support**: Please build community plugins using node v6 / vanillajs to ensure that all acme.js and greenlock.js users are fully supported.

## Install

```bash
npm install --save-dev acme-challenge-test@3.x
```

## Usage

```js
var tester = require("acme-challenge-test");

//var challenger = require('acme-http-01-cli').create({});
//var challenger = require('acme-dns-01-cli').create({});
var challenger = require("./YOUR-CHALLENGE-STRATEGY").create({});

// The dry-run tests can pass on, literally, 'example.com'
// but the integration tests require that you have control over the domain
var domain = "example.com";

tester.test("http-01", domain, challenger).then(function() {
	console.info("PASS");
});
```

## Reference Implementations

These are plugins that use the v2.7+ (v3) API, and pass this test harness,
which you should use as a model for any plugins that you create.

- [`acme-http-01-cli`](https://git.rootprojects.org/root/acme-http-01-cli.js)
- [`acme-dns-01-cli`](https://git.rootprojects.org/root/acme-dns-01-cli.js)

## Example

See `example.js` (it works).

## Starter Template

Here's what you could start with.

```js
var tester = require("acme-challenge-test");

// The dry-run tests can pass on, literally, 'example.com'
// but the integration tests require that you have control over the domain
var domain = "example.com";

tester.test("http-01", domain, {

  // Should set a TXT record for opts.dnsHost with opts.dnsAuthorization for opts.ttl || 300
  set: function (opts) {
    console.log("set opts:", opts);
    throw new Error("set not implemented");
  },
  
  // Should remove the *one* TXT record for opts.dnsHost with opts.dnsAuthorization
  // Should NOT remove otherrecords for opts.dnsHost (wildcard shares dnsHost with non-wildcard)
  remove: function (opts) {
    console.log("remove opts:", opts);
    throw new Error("remove not implemented");
  },
  
  // Should get the record via the DNS server's API
  get: function (opts) {
    console.log("get opts:", opts);
    throw new Error("get not implemented");
  }

}).then(function() {
	console.info("PASS");
});
```

## Detailed Overview

Here's a quick pseudo stub-out of what a test-passing plugin object might look like:

```js
tester.test('http-01', 'example.com', {
  set: function (opts) {
    var ch = opts.challenge;
    // { type: 'http-01' // or 'dns-01'
    // , identifier: { type: 'dns', value: 'example.com' }
    // , wildcard: false
    // , token: 'xxxx'
    // , keyAuthorization: 'xxxx.yyyy'
    // , dnsHost: '_acme-challenge.example.com'
    // , dnsAuthorization: 'zzzz' }

    return API.set(...);
  }
, get: function (query) {
    var ch = query.challenge;
    // { type: 'http-01' // or 'dns-01', 'tls-alpn-01', etc
    // , identifier: { type: 'dns', value: 'example.com' }
    //   // http-01 only
    // , token: 'xxxx'
    // , url: '...' // for testing and debugging
    //   // dns-01 only, for testing / dubgging
    // , altname: '...'
    // , dnsHost: '...'
    // , wildcard: false }
    // Note: query.identifier.value is different for http-01 than for dns-01

    return API.get(...).then(function (secret) {
      // http-01
      return { keyAuthorization: secret };
      // dns-01
      //return { dnsAuthorization: secret };
    });
  }
, remove: function (opts) {
    var ch = opts.challenge;
    // same options as in `set()` (which are not the same as `get()`

    return API.remove(...);
  }
}).then(function () {
  console.info("PASS");
});
```

Note: The `API.get()`, `API.set()`, and `API.remove()` is where you do your magic up to upload a file to the correct
location on an http serever, set DNS records, or add the appropriate data to the database that handles such things.
