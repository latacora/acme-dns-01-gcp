'use strict';

//var tester = require('acme-challenge-test');
var tester = require('./');

//var type = 'http-01';
//var challenger = require('acme-http-01-cli').create({});
var type = 'dns-01';
var challenger = require('acme-dns-01-cli').create({});
//var challenger = require('./YOUR-CHALLENGE-STRATEGY').create({});
//var type = 'YOUR-TYPE-01';

// The dry-run tests can pass on, literally, 'example.com'
// but the integration tests require that you have control over the domain
var zone = 'example.com';

tester
	.test(type, zone, challenger)
	.then(function() {
		console.info('ALL PASSED');
	})
	.catch(function(err) {
		console.error('FAIL');
		console.error(err);
		process.exit(20);
	});
