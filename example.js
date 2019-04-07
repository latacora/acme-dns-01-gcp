'use strict';

var tester = require('greenlock-challenge-test');

var challenger = require('greenlock-challenge-http').create({});
//var challenger = require('greenlock-challenge-dns').create({});
//var challenger = require('./YOUR-CHALLENGE-STRATEGY').create({});

// The dry-run tests can pass on, literally, 'example.com'
// but the integration tests require that you have control over the domain
var domain = 'example.com';

tester.test('http-01', domain, challenger).then(function () {
  console.info("PASS");
});
