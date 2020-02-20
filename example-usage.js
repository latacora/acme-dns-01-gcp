'use strict';
const googleDns = require("./acme-dns-01-gcp");
async function get_cert() {
  var maintainerEmail = "rtomlinson@latacora.com"
  var subscriberEmail = "rtomlinson@latacora.com"
  var customerEmail = "rtomlinson@latacora.com"

  var pkg = require("./package.json")
  var packageAgent = "test-" + pkg.name + "/" + pkg.version
  const errors = [];
  function notify(ev, msg) {
      	if ('error' === ev || 'warning' === ev) {
      		errors.push(ev.toUpperCase() + ' ' + msg.message);
      		return;
      	}
      	// be brief on all others
      	console.log(ev, msg.altname || '', msg.status || '');
  }

  var ACME = require("acme")
  var acme = ACME.create({ maintainerEmail, packageAgent, notify });

  //var directoryUrl = 'https://acme-staging-v02.api.letsencrypt.org/directory';
  var directoryUrl = 'https://acme-v02.api.letsencrypt.org/directory'

  await acme.init(directoryUrl);

  var Keypairs = require('@root/keypairs');
  var accountKeypair = await Keypairs.generate({ kty: 'EC', format: 'jwk' });
  var accountKey = accountKeypair.private;

  var agreeToTerms = true;

  // Create Let's Encrypt Account
  var accountOptions = { subscriberEmail, agreeToTerms, accountKey };

  console.info('registering new ACME account...');

  var account = await acme.accounts.create({
  	subscriberEmail,
  	agreeToTerms,
  	accountKey
  });
  console.info('created account with id', account.key.kid);


  // You can generate it fresh
  var serverKeypair = await Keypairs.generate({ kty: 'RSA', format: 'jwk' });


  var serverKey = serverKeypair.private;
  var serverPem = await Keypairs.export({ jwk: serverKey });
  var fs = require("fs");
  await fs.promises.writeFile('./privkey.pem', serverPem, 'ascii');
  var punycode = require('punycode');
  
  var domains = ['example.com'];
  
  domains = domains.map(function(name) {
  	return punycode.toASCII(name);
  });

  var CSR = require('@root/csr');
  var PEM = require('@root/pem');

  var encoding = 'der';
  var typ = 'CERTIFICATE REQUEST';

  var csrDer = await CSR.csr({ jwk: serverKey, domains, encoding });
  var csr = PEM.packBlock({ type: typ, bytes: csrDer });
 

  console.log("csr created");
  console.log(csr);
  const projectId = "placeholder-project-id";
  const zonename = "placeholder-zonename";
  var challenges = {
  	'dns-01': {
		...googleDns.create({projectId, zonename}),
		propagationDelay: 120000
	}
  };
  
  
  // Validate Domains
  var certificateOptions = { account, accountKey, csr, domains, challenges };
  var pems = await acme.certificates.create(certificateOptions);

  console.log("cert created. writing to disk");
  // Get SSL Certificate
  var fullchain = pems.cert + '\n' + pems.chain + '\n';
  await fs.promises.writeFile('pubkeycert.pem', pems.cert, 'ascii');
  await fs.promises.writeFile('fullchain.pem', fullchain, 'ascii');


  console.info('wrote ./fullchain.pem');
  return "Completed!";
}

get_cert().then(function(success) {
	console.log(success);
});
