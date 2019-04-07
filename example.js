'use strict';

//var tester = require('greenlock-challenge-test');
var tester = require('./');

var type = 'http-01';
var challenger = require('greenlock-challenge-http').create({});
//var type = 'dns-01';
//var challenger = require('greenlock-challenge-dns').create({});
//var challenger = require('./YOUR-CHALLENGE-STRATEGY').create({});
//var type = 'YOUR-TYPE-01';

// The dry-run tests can pass on, literally, 'example.com'
// but the integration tests require that you have control over the domain
var domain = 'example.com';
//var domain = '*.example.com';

tester.test(type, domain, challenger).then(function () {
  console.info("PASS");
}).catch(function (err) {
  console.error("FAIL");
  console.error(err);
  process.exit(20);
});
