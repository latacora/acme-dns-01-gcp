'use strict';

//var tester = require('acme-dns-01-test');
var tester = require('./');

var type = 'dns-01';
var challenger = require('acme-dns-01-cli').create({});

// The dry-run tests can pass on, literally, 'example.com'
// but the integration tests require that you have control over the domain
var zone = 'example.com';

tester
	// Will test these domain records
	// - example.com
	// - foo.example.com
	// - *.foo.example.com
	.testZone(type, zone, challenger)
	.then(function() {
		console.info('ALL PASSED');
	})
	.catch(function(err) {
		console.error('FAIL');
		console.error(err);
		process.exit(20);
	});
