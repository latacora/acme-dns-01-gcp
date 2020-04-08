'use strict';
// Imports the Google Cloud client library
// Wherever this code is running will need to access credentials for GCP
// https://cloud.google.com/docs/authentication/production#finding_credentials_automatically
// You can run this on your local machine as long as you have a way to get the google-cloud libs credentials
const { DNS } = require('@google-cloud/dns');

//this function exists because of the acme.js library for creating the dns record names.
function generateDnsNameForWildcard(prefix, domainName) {
	return prefix.split('.')[0] + '.' + domainName;
}

module.exports.create = function (config) {
	const projectId = config.projectId;
	const dns = new DNS({
		projectId
	});
	const zonename = config.zonename;

	return {
		init: async function (opts) {
			console.log('init function called...');
			return null;
		},
		zones: async function (data) {
			console.log('zones function called...');
			try {
				const zone = dns.zone(zonename);
				const [records] = await zone.getRecords();
				return records.map((record) => record.name);
			} catch (err) {
				console.error('ERROR in zones:', err);
				return null;
			}
		},
		set: async function (data) {
			console.log('set function called...');

			var ch = data.challenge;

			var recordDnsName;
			if (ch.wildcard) {
				recordDnsName =
					generateDnsNameForWildcard(ch.dnsHost, ch.altname) + '.';
					
			} else {
				recordDnsName = ch.dnsHost + '.';
			}

			var txt = ch.dnsAuthorization;

			const zone = dns.zone(zonename);

			const record = zone.record('txt', {
				name: recordDnsName,
				ttl: 86400,
				data: txt
			});
			try {
				//check if record already exists or in the process of being added
				//need to implement this late cause of possible race conditions i think
				let [allRecords] = await zone.getRecords();
				const recordExists = allRecords.find(function (record) {
					return record.name === recordDnsName;
				});
				if (recordExists) {
					return null;
				}
				console.log("adding records...");

				let [change] = await zone.addRecords(record);
				console.log('sleeping to wait for record add action 10sec...');
				await new Promise((r) => setTimeout(r, 10000));
				let a = 0;
				let changeStatus = change.metadata.status;
				let changeId = change.metadata.id;

				while (a < 10 && changeStatus == 'pending') {
					a++;
					console.log(
						'status pending, will try up to 10 times. currently at attempt: ' +
							a
					);
					await new Promise((r) => setTimeout(r, 5000));
					let [changeMetadata] = await change.getMetadata();
					changeStatus = changeMetadata.status;
				}
				console.log('record set should be done');
				return change;
			} catch (err) {
				console.error('Error trying to add a record');
				//
				console.error('ERROR in set:', err);
				return null;
			}
		},
		get: async function (data) {
			console.log('get function called...');
			var ch = data.challenge;
			var recordDnsName;
			if (ch.wildcard) {
				recordDnsName =
					generateDnsNameForWildcard(ch.identifier.value, ch.altname) + '.';
			} else {
				recordDnsName = ch.identifier.value + '.';
			}

			const zone = dns.zone(zonename);
			const query = {
				name: recordDnsName,
				type: 'TXT'
			};
			try {
				console.log('Trying to get txt record for ' + recordDnsName);
				const records = await zone.getRecords(query);
				if (records[0].length == 0) {
					//just to make  it explicit
					return null;
				}
				let data = records[0][0].data[0];
				// Slice because data from the google dns comes with quotes which are actually part of the string and not the object representation
				return {
					dnsAuthorization: data.slice(1, -1)
				};
			} catch (err) {
				console.error('Error trying to GET the txt record');
				console.error(err);
				return null;
			}
			// TODO use :name_like
			// https://developer.dnsimple.com/v2/zones/records/
		},
		remove: async function (data) {
			console.log('remove function called...');
			let record;
			var ch = data.challenge;
			var recordDnsName;
			if (ch.wildcard) {
				recordDnsName =
					generateDnsNameForWildcard(ch.dnsHost, ch.altname) + '.';
			} else {
				recordDnsName = ch.dnsHost + '.';
			}

			try {
				const zone = dns.zone(zonename);
				const query = {
					name: recordDnsName,
					type: 'TXT'
				};
				console.log('Getting the records in REMOVE');
				//There's some weird race-condition bug here that I can't consistently reproduce
				//Error: Error: Failed DNS-01 Pre-Flight Dry Run.
				//dig TXT '_acme-challenge.placeholder.com' does not return 'DqPO62S1j4s--KIY3wzYL7Ums8UvI_-BrNB7bFETJ88'
				//I think the side-effect is that sometimes the dns record doesn't get deleted which is a problem.
				const records = await zone.getRecords(query);
				record = records[0][0];
				if (!record) {
					return null;
				}
				console.log('attempting to delete record...');
				const createChangeResponse = await record.delete();
				await new Promise((r) => setTimeout(r, 6000));
				return true;
			} catch (err) {
				console.error('ERROR: ', err);
				return null;
			}
		}
	};
};
