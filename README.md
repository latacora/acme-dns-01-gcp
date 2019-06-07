# [acme-challenge-test](https://git.rootprojects.org/root/acme-challenge-test.js.git) | a [Root](https://rootprojects.org) project

The test harness you should use when writing an ACME challenge strategy
for [ACME.js](https://git.coolaj86.com/coolaj86/acme-v2.js) and also [Greenlock](https://git.coolaj86.com/coolaj86/greenlock-express.js) v2.7+ (and v3).

All implementations MUST pass these tests, which is a very easy thing to do (just `set()`, `get()`, and `remove()`).

The tests account for single-domain certificates (`example.com`) as well as multiple domain certs (SAN / AltName),
wildcards (`*.example.com`), and valid private / localhost certificates. No worries on your end, just pass the tests. 👌

**Node v6 Support**: Please build community plugins using node v6 / vanillajs to ensure that all acme.js and greenlock.js users are fully supported.

## Install

```bash
npm install --save-dev acme-challenge-test@3.x
```

## Usage

```js
var tester = require('acme-challenge-test');

//var challenger = require('acme-http-01-cli').create({});
//var challenger = require('acme-dns-01-cli').create({});
var challenger = require('./YOUR-CHALLENGE-STRATEGY').create({
	YOUR_TOKEN_OPTION: 'SOME_API_KEY'
});

// The dry-run tests can pass on, literally, 'example.com'
// but the integration tests require that you have control over the domain
var zone = 'example.com';

tester.testZone('dns-01', zone, challenger).then(function() {
	console.info('PASS');
});
```

**Note**: If the service you are testing only handles individual records
(not multiple records in a zone), you can use `testRecord` instead:

```js
var record = 'foo.example.com';

tester.testRecord('dns-01', record, challenger).then(function() {
	console.info('PASS');
});
```

## Reference Implementations

These are plugins that use the v2.7+ (v3) API, and pass this test harness,
which you should use as a model for any plugins that you create.

- [`acme-http-01-cli`](https://git.rootprojects.org/root/acme-http-01-cli.js)
- [`acme-dns-01-cli`](https://git.rootprojects.org/root/acme-dns-01-cli.js)

You can find other implementations by searching npm for [acme-http-01-](https://www.npmjs.com/search?q=acme-http-01-)
and [acme-dns-01-](https://www.npmjs.com/search?q=acme-dns-01-).

If you are building a plugin, please let us know.
We would like to co-author and help maintain and promote your module.

## Example

See `example.js` (it works).

## Starter Template

Here's what you could start with.

```js
var tester = require('acme-challenge-test');

// The dry-run tests can pass on, literally, 'example.com'
// but the integration tests require that you have control over the domain
var domain = 'example.com';

tester
	.testRecord('http-01', domain, {
		// Should set a TXT record for dnsHost with dnsAuthorization and ttl || 300
		set: function(opts) {
			console.log('set opts:', opts);
			throw new Error('set not implemented');
		},

		// Should remove the *one* TXT record for dnsHost with dnsAuthorization
		// Should NOT remove otherrecords for dnsHost (wildcard shares dnsHost with
		// non-wildcard)
		remove: function(opts) {
			console.log('remove opts:', opts);
			throw new Error('remove not implemented');
		},

		// Should get the record via the DNS server's API
		get: function(opts) {
			console.log('get opts:', opts);
			throw new Error('get not implemented');
		}
	})
	.then(function() {
		console.info('PASS');
	});
```

## dns-01 vs http-01

For `type` http-01:

    // `altname` is the name of the domain
    // `token` is the name of the file ( .well-known/acme-challenge/`token` )
    // `keyAuthorization` is the contents of the file

For `type` dns-01:

    // `dnsHost` is the domain/subdomain/host
    // `dnsAuthorization` is the value of the TXT record

## Detailed Overview

Here's a quick pseudo stub-out of what a test-passing plugin object might look like:

```js
tester
	.testZone('dns-01', 'example.com', {
		set: function(opts) {
			var ch = opts.challenge;
			// { type: 'dns-01' // or 'http-01'
			// , identifier: { type: 'dns', value: 'example.com' }
			// , wildcard: false
			// , token: 'xxxx'
			// , keyAuthorization: 'xxxx.yyyy'
			// , dnsHost: '_acme-challenge.example.com'
			// , dnsAuthorization: 'zzzz' }

			return YourApi('POST', 'https://example.com/api/dns/txt', {
				host: ch.dnsHost,
				record: ch.dnsAuthorization
			});
		},

		get: function(query) {
			var ch = query.challenge;
			// { type: 'dns-01' // or 'http-01', 'tls-alpn-01', etc
			// , identifier: { type: 'dns', value: 'example.com' }
			//   // http-01 only
			// , token: 'xxxx'
			// , url: '...' // for testing and debugging
			//   // dns-01 only, for testing / dubgging
			// , altname: '...'
			// , dnsHost: '...'
			// , wildcard: false }
			// Note: query.identifier.value is different for http-01 than for dns-01

			return YourApi('GET', 'https://example.com/api/dns/txt', {
				host: ch.dnsHost
			}).then(function(secret) {
				// http-01
				//return { keyAuthorization: secret };
				// dns-01
				return { dnsAuthorization: secret };
			});
		},

		remove: function(opts) {
			var ch = opts.challenge;
			// same options as in `set()` (which are not the same as `get()`

			return YourApi('DELETE', 'https://example.com/api/dns/txt/' + ch.dnsHost);
		}
	})
	.then(function() {
		console.info('PASS');
	});
```

Where `YourApi` might look something like this:

```js
var YourApi = function createApi(config) {
	var request = require('@root/request');
	request = require('util').promisify(request);

	return function(method, url, body) {
		return request({
			method: method,
			url: url,
			json: body || true,
			headers: {
				Authorization: 'Bearer ' + config.apiToken
			}
		}).then(function(resp) {
			return resp.body;
		});
	};
};
```

### Two notes:

Note 1:

The `API.get()`, `API.set()`, and `API.remove()` is where you do your magic up to upload a file to the correct
location on an http serever, set DNS records, or add the appropriate data to the database that handles such things.

Note 2:

- When `altname` is `foo.example.com` the `dnsHost` will be `_acme-challenge.foo.example.com`
- When `altname` is `*.foo.example.com` the `dnsHost` will _still_ be `_acme-challenge.foo.example.com`!!
- When `altname` is `bar.foo.example.com` the `dnsHost` will be `_acme-challenge.bar.foo.example.com`
