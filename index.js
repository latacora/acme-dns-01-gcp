'use strict';
/*global Promise*/
var crypto = require('crypto');

module.exports.create = function () {
  throw new Error("greenlock-challenge-test is a test fixture for greenlock-challenge-* plugins, not a plugin itself");
};

// ignore all of this, it's just to normalize Promise vs node-style callback thunk vs synchronous
function promiseCheckAndCatch(obj, name) {
  var promisify = require('util').promisify;
  // don't loose this-ness, just in case that's important
  var fn = obj[name].bind(obj);
  var promiser;

  // function signature must match, or an error will be thrown
  if (1 === fn.length) {
    // wrap so that synchronous errors are caught (alsa handles synchronous results)
    promiser = function (opts) {
      return Promise.resolve().then(function () {
        return fn(opts);
      });
    };
  } else if (2 === fn.length) {
    // wrap as a promise
    promiser = promisify(fn);
  } else {
    return Promise.reject(new Error("'challenge." + name + "' should accept either one argument, the options,"
      + " and return a Promise or accept two arguments, the options and a node-style callback thunk"));
  }

  function shouldntBeNull(result) {
    if ('undefined' === typeof result) {
      throw new Error("'challenge.'" + name + "' should never return `undefined`. Please explicitly return null"
        + " (or fix the place where a value should have been returned but wasn't).");
    }
  }

  return function (opts) {
    return promiser(opts).then(shouldntBeNull);
  };
}

// Here's the meat, where the tests are happening:
function run(challenger, opts) {
  var ch = opts.challenge;
  if ('http-01' === ch.type && ch.wildname) {
    throw new Error("http-01 cannot be used for wildcard domains");
  }

  var set = promiseCheckAndCatch(challenger, 'set');
  if ('function' !== typeof challenger.get) {
    throw new Error("'challenge.get' should be implemented for the sake of testing."
      + " It should be implemented as the internal method for fetching the challenge"
      + " (i.e. reading from a database, file system or API, not return internal),"
      + " not the external check (the http call, dns query, etc), which will already be done as part of this test.");
  }
  var get = promiseCheckAndCatch(challenger, 'get');
  var remove = promiseCheckAndCatch(challenger, 'remove');

  // The first time we just check it against itself
  // this will cause the prompt to appear
  return set(opts).then(function () {
    // this will cause the final completion message to appear
    var query = { type: ch.type };
    if ('http-01' === ch.type) {
      query.identifier = ch.identifier;
      query.token = ch.token;
      // For testing only
      query.url = ch.token;
    } else if ('dns-01' === ch.type) {
      query.identifier = { type: 'dns', value: ch.dnsHost };
      // For testing only
      query.altname = ch.altname;
      query.dnsAuthorization = ch.dnsAuthorization;
    } else {
      query = JSON.parse(JSON.stringify(ch));
      query.comment = "unknown challenge type, supplying everything";
    }
    return get({ challenge: query }).then(function (result) {
      if ('http-01' === ch.type) {
        if (ch.keyAuthorization !== result.keyAuthorization
          // cross-checking on purpose
          || (ch.altname !== result.identifier.value || ch.identifier.value !== result.altname)
        ) {
          throw new Error("challenge.get() for http-01 should return the same altname, identifier.value,"
            + " and keyAuthorization as were saved with challenge.set()");
        }
      } else if ('dns-01' === ch.type) {
        if (ch.dnsAuthorization !== result.dnsAuthorization
          || ch.identifier.value !== result.identifier.value
        ) {
          throw new Error("challenge.get() for dns-01 should return the same identifier.value,"
            + " and dnsAuthorization as were saved with challenge.set()");
        }
      } else {
        if (ch.identifier.value !== result.identifier.value) {
          throw new Error("challenge.get() should always return the same identifier.value,"
            + " and dnsAuthorization as were saved with challenge.set()");
        }
        if ('tls-alpn-01' === ch.type) {
          console.warn("'tls-alpn-01' support is in development"
            + " (or developed and we haven't update this yet). Please contact us.");
        } else {
          console.warn("We don't know how to test '" + ch.type + "'... are you sure that's a thing?");
        }
      }
    }).then(function () {
      return remove(opts).then(function () {
        return get(opts).then(function (result) {
          if (result) {
            throw new Error("challenge.remove() should have made it not possible for challenge.get() to return a value");
          }
          if (null !== result) {
            throw new Error("challenge.get() should return null when the value is not set");
          }
        });
      });
    });
  }).then(function () {
    console.info("All soft tests: PASS");
    console.warn("Hard tests (actually checking http URLs and dns records) is implemented in acme-v2.");
    console.warn("We'll copy them over here as well, but that's a TODO for next week.");
  });
}

module.exports.test = function (type, altname, challenger) {
  var expires = new Date(Date.now() + (10*60*1000)).toISOString();
  var token = crypto.randomBytes('8').toString('hex');
  var thumb = crypto.randomBytes('16').toString('hex');
  var keyAuth = token + '.' + crypto.randomBytes('16').toString('hex');
  var dnsAuth = crypto.createHash('sha256').update(keyAuth).digest('base64')
    .replace(/\+/, '-').replace(/\//, '_').replace(/=/, '');

  var challenge = {
    type: type
  , identifier: { type: 'dns', value: null }  // completed below
  , wildcard: false                           // completed below
  , expires: expires
  , token: token
  , thumbprint: thumb
  , keyAuthorization: keyAuth
  , url: null                                 // completed below
  , dnsHost: '_acme-challenge.'               // completed below
  , dnsAuthorization: dnsAuth
  , altname: altname
  };
  if ('*.' === altname.slice(0, 2)) {
    challenge.wildcard = true;
    altname = altname.slice(2);
  }
  challenge.identifier.value = altname;
  challenge.url = 'http://' + altname + '/.well-known/acme-challenge/' + challenge.token;
  challenge.dnsHost += altname;

  run(challenger, { challenge: challenge }).then(function () {
    console.info("PASS");
  }).catch(function (err) {
    console.error("FAIL");
    console.error(err);
    process.exit(20);
  });
};
