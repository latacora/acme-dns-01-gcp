'use strict';

require('dotenv').config()

var tester = require('acme-dns-01-test');

var type = 'dns-01';


// You will need access to GCP.
console.log("Tests will require that you have access to gcp from the testing machine. Authetication strategy following the steps detailed in https://cloud.google.com/docs/authentication/production#finding_credentials_automatically");
console.log("Be sure you've created a .env file with the GCP_PROJECT_ID and GCP_ZONE_ID values")


var projectId = process.env.GCP_PROJECT_ID
var zonename = process.env.GCP_ZONE_ID
var credentials = process.env.CREDENTIALS_FILEPATH

var challenger = require('./').create({projectId, zonename, credentials});

// The dry-run tests can pass on, literally, 'example.com'
// but the integration tests require that you have control over the domain
// You should replace example.com with something you have control over. sub-domains seems to work too.
var zone = process.env.DOMAIN_NAME ? process.env.DOMAIN_NAME : "example.com";
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
