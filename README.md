This is a fork. Contact Root for questions regarding Greenlock.js, ACME.js and building Let's Encrypt Plugins

# Let's Encrypt + DNS = acme-dns-01-gcp

This is how to create an ACME challenge module for acme-dns-01-gcp with ACME.js:

```js
acme.certificates.create({
	account,
	accountKey,
	csr,
	domains,
	challenges: {
		'dns-01': require('acme-dns-01-gcp').create({
			projectId: 'Project Id of GCP project where Cloud DNS lives',
			zonename: 'Cloud DNS zone name',
			credentials: 'OPTIONAL: Path to service account credentials'
		})
	}
});
```

Environment Variables for testing:  
Required:  
* GCP_PROJECT_ID - Google Cloud project id  
* GCP_ZONE_ID - Google Cloud DNS zone name  
* DOMAIN_NAME=placeholder.com  
Optional:  
* CREDENTIALS_FILEPATH=/path/to/service/account/credentials.json - Use to specify a service account credentials file on your local machine. Otherwise, the default GCP authentication strategy will be used.  

An ACME acme-dns-01-gcp for Let's Encrypt integrations.

| [ACME HTTP-01](https://git.rootprojects.org/root/acme-http-01-test.js)
| [ACME DNS-01](https://git.rootprojects.org/root/acme-dns-01-test.js)
| [Greenlock Express](https://git.rootprojects.org/root/greenlock-express.js)
| [Greenlock.js](https://git.rootprojects.org/root/greenlock.js)
| [ACME.js](https://git.rootprojects.org/root/acme.js)

This was specificially designed for [ACME.js](https://git.coolaj86.com/coolaj86/acme-v2.js)
and [Greenlock.js](https://git.coolaj86.com/coolaj86/greenlock-express.js),
but will be generically useful to any JavaScript DNS plugin for Let's Encrypt.

```bash
npm install acme-dns-01-gcp
```  

<!--

```bash
npx acme-dns-01-test --module /path/to/module.js --foo-user --bar--token
```

-->

# How Let's Encrypt works with DNS

In order to validate **wildcard**, **localhost**, and **private domains** through Let's Encrypt,
you must use set some special TXT records in your domain's DNS.

This is called the **ACME DNS-01 Challenge**

For example:

```txt
dig TXT example.com

;; QUESTION SECTION:
;_acme-challenge.example.com.		IN	TXT

;; ANSWER SECTION:
_acme-challenge.example.com.	300	IN	TXT	"xxxxxxx"
_acme-challenge.example.com.	300	IN	TXT	"xxxxxxx"
```

## ACME DNS-01 Challenge Process

The ACME DNS-01 Challenge process works like this:

1. The ACME client order's an SSL Certificate from Let's Encrypt
2. Let's Encrypt asks for validation of the domains on the certificate
3. The ACME client asks to use DNS record verification
4. Let's Encrypt gives a DNS authorization token
5. The ACME client manipulates the token and sets TXT record with the result
6. Let's Encrypt checks the TXT record from DNS clients in diverse locations
7. The ACME client gets a certificate if the validate passes

# Using a Let's Encrypt DNS plugin

Each plugin will define some options, such as an api key, or username and password
that are specific to that plugin.

Other than that, they're all used the same.

## ACME.js + Let's Encrypt DNS-01

This is how an ACME challenge module is with ACME.js:

```js
acme.certificates.create({
	accountKey,
	csr,
	domains,
	challenges: {
		'dns-01': require('acme-dns-01-MODULE_NAME').create({
			fooUser: 'A_PLUGIN_SPECIFIC_OPTION',
			barToken: 'A_PLUGIN_SPECIFIC_OPTION'
		})
	}
});
```

## Greenlock + Let's Encrypt DNS-01

This is how modules are used with Greenlock / Greenlock Express

**Global** default:

```js
greenlock.manager.defaults({
	challenges: {
		'dns-01': {
			module: 'acme-dns-01-_MODULE_NAME',
			fooUser: 'A_PLUGIN_SPECIFIC_OPTION',
			barToken: 'A_PLUGIN_SPECIFIC_OPTION'
		}
	}
});
```

**Per-Site** config:

```js
greenlock.add({
	subject: 'example.com',
	altnames: ['example.com', '*.example.com', 'foo.bar.example.com'],
	challenges: {
		'dns-01': {
			module: 'acme-dns-01-YOUR_MODULE_NAME',
			fooUser: 'A_PLUGIN_SPECIFIC_OPTION',
			barToken: 'A_PLUGIN_SPECIFIC_OPTION'
		}
	}
});
```

# The Easy Way to Build a Plugin

This repo includes **unit test suite** which makes it _very_ easy to create a plugin.

You can start with a **template file** that will fail all of the tests, and just
build until you pass all of the tests.

After that, you can **test the Greenlock CLI** to see if
you actually get a valid SSL certificate.

## Overview

There are only a few methods to implement - just basic CRUD operations.

For most serivices these are very simple to implement
(see the **reference implementations** down below).

Some enterprise-y services are more difficult as they may have special
rules about zones (Google Cloud) or intricate authentication schemes (AWS).

```
init({ request })

zones({ dnsHosts })

set({ challenge: { dnsZone, dnsPrefix, dnsHost, keyAuthorizationDigest } })

get({ challenge: { dnsZone, dnsPrefix, dnsHost, keyAuthorizationDigest } })

remove({ challenge: { dnsZone, dnsPrefix, dnsHost, keyAuthorizationDigest } })
```

## Plugin Outline

This is an even better starter template below,
but this outline shows the bare bones of a plugin.

```
'use strict';

var MyModule = module.exports;

MyModule.create = function (options) {

    var m = {};

    m.init = async function ({ request }) {
        // (optional) initialize your module
    }

    m.zones = async function ({ dnsHosts }) {
        // return a list of "Zones" or "Apex Domains" (i.e. example.com, NOT foo.example.com)
    }

    m.set = async function ({ challenge: { dnsZone, dnsPrefix, dnsHost, keyAuthorizationDigest } }) {
        // set a TXT record for dnsHost with keyAuthorizationDigest as the value
    }

    m.get = async function ({ challenge: { dnsZone, dnsPrefix, dnsHost, keyAuthorizationDigest } }) {
        // check that the EXACT a TXT record that was set, exists, and return it
    }

    m.remove = async function ({ challenge: { dnsZone, dnsPrefix, dnsHost, keyAuthorizationDigest } }) {
        // remove the exact TXT record that was set
    }

    return m;
}
```

## Using the Test Suite

Test setup:

```js
var tester = require('acme-dns-01-test');
var YOUR_PLUGIN = require('./YOUR-CHALLENGE-STRATEGY');

var challenger = YOUR_PLUGIN.create({
	YOUR_TOKEN_OPTION: 'SOME_API_KEY'
});
```

Run the tests:

```
var zone = 'example.com';

tester.testZone('dns-01', zone, challenger).then(function() {
	console.info('PASS');
});
```

**Note**: Special DNS services, like **DuckDNS**, only give you a **single sub-domain**,
not a full "zone". You can test them too:

Some DNS services, such as **DuckDNS**, only give you a **single sub-domain**,
not not _multiple_ records in a zone. Testing them is slightly different:

```js
var record = 'foo.example.com';

tester.testRecord('dns-01', record, challenger).then(function() {
	console.info('PASS');
});
```

## Reference Implementations

- Compatibility
  - [x] Let's Encrypt v2.1 / ACME draft 18
  - [x] Node v6+
  - [x] Chrome, Firefox, Safari, Edge, etc
- Quality
  - [x] Written in VanillaJS
  - [x] No compliers or build scripts
  - [x] Simple, minimal code, in a single file
  - [x] **Zero dependencies**

These libraries are useful as a model for any plugins that you create.

- dns-01
  - [`cli`](https://git.rootprojects.org/root/acme-dns-01-cli.js)
  - [`digitalocean`](https://git.rootprojects.org/root/acme-dns-01-digitalocean.js)
  - [`vultr`](https://git.rootprojects.org/root/acme-dns-01-vultr.js)
  - [`gandi`](https://git.rootprojects.org/root/acme-dns-01-gandi.js)
  - [`duckdns`](https://git.rootprojects.org/root/acme-dns-01-duckdns.js)
- http-01
  - [`cli`](https://git.rootprojects.org/root/acme-http-01-cli.js)
  - [`fs`](https://git.rootprojects.org/root/acme-http-01-fs.js)

You can find other implementations by searching npm for [acme-http-01-](https://www.npmjs.com/search?q=acme-http-01-)
and [acme-dns-01-](https://www.npmjs.com/search?q=acme-dns-01-).

If you are building a plugin, please let us know.
We may like to co-author and help maintain and promote your module.

<small>Note: In some cases (such as non-HTTP, or very complex APIs) you will not be able to maintain
browser compatibility. Other than than, if you keep your code simple, it will also work in browser
implementations of ACME.js.</small>

# Example

See `example.js` (it works).

## Starter Template

Here's what you could start with.

```js
var tester = require('acme-dns-01-test');

// The dry-run tests can pass on, literally, 'example.com'
// but the integration tests require that you have control over the domain
var zone = 'example.com';
var deps = {};

tester
	.testZone('dns-01', zone, {
		// Gives you the promisified `request` object for HTTP APIs
		init: function(deps) {
			request = deps.request;
			return null;
		},

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

## Full Detailed Example

Here's a quick pseudo stub-out of what a test-passing plugin object might look like:

```js
var deps = {};

tester
	.testZone('dns-01', 'example.com', {
		init: function({ request }) {
			// { request: { get, post, put, delete } }

			deps.request = request;
			return null;
		},

		zones: function({ dnsHosts }) {
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

Note: `request` is actually `@root/request`, but the API is the same as the standard `request`.

Avoid using 3rd party API libraries where you can - they tend to bloat your dependencies and
add security risk. Instead, just use the API documentation and cURL examples.

### Two notes:

Note 1:

The `API.get()`, `API.set()`, and `API.remove()` is where you do your magic up to upload a file to the correct
location on an http serever, set DNS records, or add the appropriate data to the database that handles such things.

Note 2:

- When `altname` is `foo.example.com` the `dnsHost` will be `_acme-challenge.foo.example.com`
- When `altname` is `*.foo.example.com` the `dnsHost` will _still_ be `_acme-challenge.foo.example.com`!!
- When `altname` is `bar.foo.example.com` the `dnsHost` will be `_acme-challenge.bar.foo.example.com`

# We Build Let's Encrypt Plugins for You

Want to get the experts involved? [Contact Root](acme-plugins@therootcompany.com)

We can take it on ourselves, work within your team, or guide an outsourced team.

Turaround is typically a few days for simple modules with publicly available APIs.
