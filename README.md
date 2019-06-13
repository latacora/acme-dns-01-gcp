# [acme-dns-01-test](https://git.rootprojects.org/root/acme-dns-01-test.js.git) | a [Root](https://rootprojects.org) project

An ACME dns-01 test harness for Let's Encrypt integrations.

This was specificially designed for [ACME.js](https://git.coolaj86.com/coolaj86/acme-v2.js) and [Greenlock.js](https://git.coolaj86.com/coolaj86/greenlock-express.js), but will be generically useful to any ACME module.

Passing the tests is very easy. There are just four functions to implement:

- `zones()` - list domain zones (i.e. example.co.uk, example.com)
- `set()` - set a TXT record in a zone (i.e. `_acme-challenge.foo` in `example.com`)
- `get()` - confirm that the record was set
- `remove()` - clean up after the ACME challenge passes

The tests account for single-domain certificates (`example.com`) as well as multiple domain certs (SAN / AltName),
wildcards (`*.example.com`), and valid private / localhost certificates. No worries on your end, just pass the tests. 👌

**Node v6 Support**: Please build community plugins using node v6 / vanillajs
to ensure that all acme.js and greenlock.js users are fully supported.

## Install

```bash
npm install --save-dev acme-dns-01-test@3.x
```

## Usage

```js
var tester = require('acme-dns-01-test');

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

- dns-01
  - [`acme-dns-01-cli`](https://git.rootprojects.org/root/acme-dns-01-cli.js)
  - [`acme-dns-01-digitalocean`](https://git.rootprojects.org/root/acme-dns-01-digitalocean.js)
- http-01
  - [`acme-http-01-cli`](https://git.rootprojects.org/root/acme-http-01-cli.js)
  - [`acme-http-01-fs`](https://git.rootprojects.org/root/acme-http-01-fs.js)

You can find other implementations by searching npm for [acme-http-01-](https://www.npmjs.com/search?q=acme-http-01-)
and [acme-dns-01-](https://www.npmjs.com/search?q=acme-dns-01-).

If you are building a plugin, please let us know.
We may like to co-author and help maintain and promote your module.

## Example

See `example.js` (it works).

## Starter Template

Here's what you could start with.

```js
var tester = require('acme-dns-01-test');

// The dry-run tests can pass on, literally, 'example.com'
// but the integration tests require that you have control over the domain
var zone = 'example.com';

tester
	.testZone('dns-01', zone, {
		// Should return an array of zone domain name strings
		// (APIs that don't implement zones, such as DuckDNS, should return an empty array)
		zones: function(opts) {
			console.log('dnsHosts:', opts.dnsHosts);
			throw new Error('_zone not implemented');
		},

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
		// (Note: gets different options than set or remove)
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

For `type` dns-01:

    // `dnsHost` is the domain/subdomain/host
    // `dnsAuthorization` is the value of the TXT record
    // `dnsPrefix` is the record-only part, if `zones()` is implemented
    // `dnsZone` is the zone-only part, if `zones()` is implemented

For `type` http-01:

    // `altname` is the name of the domain
    // `token` is the name of the file ( .well-known/acme-challenge/`token` )
    // `keyAuthorization` is the contents of the file

See [acme-http-01-test.js](https://git.rootprojects.org/root/acme-dns-01-test.js.git).

## Detailed Overview

Here's a quick pseudo stub-out of what a test-passing plugin object might look like:

```js
tester
	.testZone('dns-01', 'example.com', {
		zones: function(opts) {
			// { dnsHosts: [
			//     '_acme-challenge.foo.example.com',
			//     '_acme-challenge.bar.example.com'
			//  ] }

			return YourApi(
				'GET',
				// Most Domain Zone apis don't have a search or filter option,
				// but `opts` includes list of dnsHosts is provided just in case.
				'https://exampledns.com/api/dns/zones?search=' + opts.dnsHosts.join(',')
			).then(function(result) {
				return result.zones.map(function(zone) {
					return zone.name;
				});
			});
		},

		set: function(opts) {
			var ch = opts.challenge;
			// { type: 'dns-01'
			// , identifier: { type: 'dns', value: 'foo.example.com' }
			// , wildcard: false
			// , dnsHost: '_acme-challenge.foo.example.com'
			// , dnsPrefix: '_acme-challenge.foo'
			// , dnsZone: 'example.com'
			// , dnsAuthorization: 'zzzz' }

			return YourApi(
				'POST',
				'https://exampledns.com/api/dns/txt/' + ch.dnsZone + '/' + ch.dnsPrefix,
				{ value: ch.dnsAuthorization }
			);
		},

		get: function(query) {
			var ch = query.challenge;
			// { type: 'dns-01'
			// , identifier: { type: 'dns', value: 'foo.example.com' }
			// , altname: '...'
			// , dnsHost: '...'
			// , wildcard: false }
			// Note: query.identifier.value is different for http-01 than for dns-01
			//       because of how a DNS query is different from an HTTP request

			return YourApi(
				'GET',
				'https://exampledns.com/api/dns/txt/' + ch.dnsZone + '/' + ch.dnsPrefix
			).then(function(secret) {
				return { dnsAuthorization: secret };
			});
		},

		remove: function(opts) {
			var ch = opts.challenge;
			// same options as in `set()` (which are not the same as `get()`

			return YourApi(
				'DELETE',
				'https://exampledns.com/api/dns/txt/' + ch.dnsZone + '/' + ch.dnsPrefix
			);
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
