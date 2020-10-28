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
# [Example of using this plugin to automate certificate renewal and rotation in Google Cloud Platform Internal Load Balancers](https://github.com/latacora/cert-renewal-for-internal-gcp-lbs)

# The Easy Way to Build a Plugin

[Click here for the template on building a new plugin](https://git.rootprojects.org/root/acme-dns-01-test.js)

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
