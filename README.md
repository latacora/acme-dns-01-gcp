# [greenlock-challenge-test](https://git.coolaj86.com/coolaj86/greenlock-challenge-test.js.git)

| A [Root](https://rootprojects.org) Project |

The test harness you should use when writing an ACME challenge strategy
for [Greenlock](https://git.coolaj86.com/coolaj86/greenlock-express.js) v2.7+ (and v3).

All implementations MUST pass these tests, which is a very easy thing to do (just `set()`, `get()`, and `remove()`).

The tests account for single-domain certificates (`example.com`) as well as multiple domain certs (SAN / AltName),
wildcards (`*.example.com`), and valid private / localhost certificates. As someone creating a challenge strategy
that's not something you have to take special consideration for - just pass the tests.

## Install

```bash
npm install --save-dev greenlock-challenge-test@3.x
```

## Usage

```js
var tester = require('greenlock-challenge-test');

//var challenger = require('greenlock-challenge-http').create({});
//var challenger = require('greenlock-challenge-dns').create({});
var challenger = require('./YOUR-CHALLENGE-STRATEGY').create({});

// The dry-run tests can pass on, literally, 'example.com'
// but the integration tests require that you have control over the domain
var domain = 'example.com';

tester.test('http-01', domain, challenger).then(function () {
  console.info("PASS");
});
```

## Overview

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
    // , dnsAuthorization: '...' }
    // Note: query.identifier.value is different for http-01 than for dns-01

    return API.get(...).then(function () {
      // http-01
      return { identifier: { type: 'dns', value: 'example.com' }, keyAuthorization: 'xxxx.yyyy' };
      // dns-01
      //return { identifier: { type: 'dns', value: 'example.com' }, dnsAuthorization: 'zzzz' };
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

## Example

See `example.js` (it works).

Will post reference implementations here later...