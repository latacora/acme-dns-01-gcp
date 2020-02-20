'use strict';

//var tester = require('acme-dns-01-test');
var tester = require('acme-dns-01-test');

var type = 'dns-01';


// You will need access to GCP.
var projectId = "gcp-project-placeholder"
var zonename = "gcp-zonename"

var challenger = require('./').create({projectId, zonename});

// The dry-run tests can pass on, literally, 'example.com'
// but the integration tests require that you have control over the domain
// You should replace example.com with something you have control over. sub-domains seems to work too.
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
