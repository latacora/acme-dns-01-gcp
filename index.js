'use strict';
// Imports the Google Cloud client library
// Wherever this code is running will need to access credentials for GCP
// https://cloud.google.com/docs/authentication/production#finding_credentials_automatically
// You can run this on your local machine as long as you have a way to get the google-cloud libs credentials

const { DNS } = require('@google-cloud/dns');

module.exports.create = function (config) {
	const projectId = config.projectId;
	const dns = new DNS({
		projectId
	});
	const zonename = config.zonename;

	// set and delete need to acquire the same lock for each of the commands
	const domainLock = {};
	async function acquireLock(dnsHostname) {
		// try to acquire lock
		//
		console.log(`acquiring lock for ${dnsHostname}.`);
		let lockValue = domainLock[dnsHostname];

		// if dnsHostname hasn't been defined then we need to create the key
		if (lockValue === void(0)) {
			domainLock[dnsHostname] = true;
			lockValue = true;
		}

		while (!lockValue) {
			console.log('wait 1 second');
			await new Promise((resolve) => setTimeout(resolve, 1000));
			lockValue = domainLock[dnsHostname];
		}
		console.log(`lock for ${dnsHostname} acquired`);
		domainLock[dnsHostname] = false;
		//do some stuff with the value you want locked. in this case dns stuff

		return true;
	}

	async function releaseLock(dnsHostname) {
		// just assume that we have the lock and we're going to change the lock value to true
		domainLock[dnsHostname] = true;
		console.log(`lock for ${dnsHostname} released`);

		return true;
	}

	return {
		init: async function (opts) {
			console.log('init function called...');
			return null;
		},
		zones: async function (data) {
			console.log('zones function called...');
			try {
				const zone = dns.zone(zonename);
				const metadataResponse = await zone.getMetadata();
				const dnsName = metadataResponse[0]['dnsName'];
				return [dnsName.slice(0, -1)]; // to remove the "." on the end
			} catch (err) {
				console.error('ERROR in zones:', err);
				return null;
			}
		},
		set: async function (data) {
			console.log('set function called...');
			var ch = data.challenge;

			var recordDnsName = ch.dnsHost + '.';

			var txt = ch.dnsAuthorization;

			await acquireLock(recordDnsName);

			const zone = dns.zone(zonename);
			// wildcard shares same dnsHost with non-wildcard so check if record exists and if so, add the txt

			let record;
			try {
				const query = {
					name: recordDnsName,
					type: 'TXT'
				};

				const [recordResponse] = await zone.getRecords(query);
				if (recordResponse.length == 0) {
					//nothing found
					console.log('no records found for recordDnsName: ', recordDnsName);
					console.log('creating new record entry....');
					data = [txt];
				} else {
					console.log('we found existing records');
					let existingRecord = recordResponse[0];
					data = existingRecord.data.slice();

					//google dns response wraps the text values in an additional set of quotes. the google dns seems to drop them when you put a new record set but I'm unsure about the specifics
					//I'm going to assume that strings are wrapped in quotes and drop the first and last char of each value.

					data = data.map((x) => x.slice(1, -1));
					console.log('old data in set: ', data);
					if (data.includes(txt)) {
						console.log(
							'authorization code has already been added to the txt record for :' +
								recordDnsName +
								' Something is probably wrong.'
						);
						console.log('exiting...');
						return null;
					}

					data.push(txt); // add the authorization code to data array
					console.log('new data in set: ', data);
					// there isn't a way to "update" a record set, so we have to delete then add it back. I guess we'll just add a timer to wait between the delete and add steps
					const [createChangeResponse] = await existingRecord.delete();
					let [deleteChangeMetadata] = await createChangeResponse.getMetadata();

					let a = 0;
					let changeStatus = deleteChangeMetadata.status;

					while (changeStatus != 'done') {
						if (a >= 10) {
							throw 'timeout for dns record delete. You probably need to fix something manually now.';
						}
						console.log(
							'delete status pending, will try up to 10 times. currently at attempt: ' +
								a
						);
						await new Promise((r) => setTimeout(r, 5000));
						let [changeMetadata] = await createChangeResponse.getMetadata();
						changeStatus = changeMetadata.status;
						a++;
					}
					console.log('record delete should be done');
				}

				const record = zone.record('txt', {
					name: recordDnsName,
					ttl: 300,
					data
				});
				let [change] = await zone.addRecords(record);

				let a = 0;
				let changeStatus = change.metadata.status;
				let changeId = change.metadata.id;

				while (changeStatus != 'done') {
					if (a >= 10) {
						throw 'timeout for dns record set. You probably need to fix something manually now.';
					}
					console.log(
						'add status pending, will try up to 10 times. currently at attempt: ' +
							a
					);
					await new Promise((r) => setTimeout(r, 5000));
					let [changeMetadata] = await change.getMetadata();
					changeStatus = changeMetadata.status;
					a++;
				}
				console.log('record set should be done');
				console.log('record updated or added');
				return changeId;
			} catch (err) {
				console.error('Error trying to add a record');
				//
				console.error('ERROR in set:', err);
				return null;
			} finally {
				await releaseLock(recordDnsName);
			}
		},
		get: async function (data) {
			console.log('get function called...');
			var ch = data.challenge;
			let dnsAuthorization = ch.dnsAuthorization;
			var recordDnsName = ch.dnsPrefix + '.' + ch.dnsZone + '.';
			const zone = dns.zone(zonename);
			const query = {
				name: recordDnsName,
				type: 'TXT'
			};
			try {
				console.log('Trying to get txt record for ' + recordDnsName);
				const [recordsResponse] = await zone.getRecords(query);
				if (recordsResponse.length == 0) {
					//just to make  it explicit
					return null;
				}
				let existingRecord = recordsResponse[0].data;
				let data = existingRecord.slice();

				//google dns response wraps the text values in an additional set of quotes. the google dns seems to drop them when you put a new record set but I'm unsure about the specifics
				//I'm going to assume that strings are wrapped in quotes and drop the first and last char of each value.

				data = data.map((x) => x.slice(1, -1));
				if (!data.includes(dnsAuthorization)) {
					console.log('We didnt find the dnsAuthorization text in the records');
					console.log('exiting...');
					return null;
				}

				// Slice because data from the google dns comes with quotes which are actually part of the string and not the object representation
				return {
					dnsAuthorization
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
			var ch = data.challenge;
			var dnsAuthorization = ch.dnsAuthorization;
			var recordDnsName = ch.dnsHost + '.';
			await acquireLock(recordDnsName);
			try {
				const zone = dns.zone(zonename);
				const query = {
					name: recordDnsName,
					type: 'TXT'
				};
				console.log('Getting the records in REMOVE');

				const [recordResponse] = await zone.getRecords(query);
				if (recordResponse.length == 0) {
					//nothing found
					console.log('no records found for recordDnsName: ', recordDnsName);
					console.log('deleting record entry....');
					return null;
				}

				console.log('attempting to delete record...');

				// check the data response
				let record = recordResponse[0];
				let existingRecord = record.data;
				let data = existingRecord.slice();

				//google dns response wraps the text values in an additional set of quotes. the google dns seems to drop them when you put a new record set but I'm unsure about the specifics
				//I'm going to assume that strings are wrapped in quotes and drop the first and last char of each value.

				data = data.map((x) => x.slice(1, -1));
				// check to see if dnsAuthorization is in data
				if (!data.includes(dnsAuthorization)) {
					console.log('We didnt find the dnsAuthorization text in the records');
					console.log('exiting...');
					return null;
				}
				const [createChangeResponse] = await record.delete();
				let [deleteChangeMetadata] = await createChangeResponse.getMetadata();

				let a = 0;
				let changeStatus = deleteChangeMetadata.status;

				while (changeStatus != 'done') {
					if (a >= 10) {
						throw 'timeout for dns record delete. You probably need to fix something manually now.';
					}
					console.log(
						'delete status pending, will try up to 10 times. currently at attempt: ' +
							a
					);
					await new Promise((r) => setTimeout(r, 5000));
					let [changeMetadata] = await createChangeResponse.getMetadata();
					changeStatus = changeMetadata.status;
					a++;
				}
				console.log('old record delete should be done');

				// if dnsAuthorization is the only value (length == 1) we can just delete the whole record and we know that dnsAuthorization is in the list
				if (data.length === 1) {
					console.log('delete record task completed');
					return true;
				} else {
					// remove the dnsAuthorization value from the data records and add the updated record
					let filteredData = data.filter((x) => x !== dnsAuthorization);
					const record = zone.record('txt', {
						name: recordDnsName,
						ttl: 300,
						data: filteredData
					});
					let [change] = await zone.addRecords(record);
					let a = 0;
					let changeStatus = change.metadata.status;
					let changeId = change.metadata.id;

					while (changeStatus != 'done') {
						if (a >= 10) {
							throw 'timeout for dns record set. You probably need to fix something manually now.';
						}
						console.log(
							'add status pending, will try up to 10 times. currently at attempt: ' +
								a
						);
						await new Promise((r) => setTimeout(r, 5000));
						let [changeMetadata] = await change.getMetadata();
						changeStatus = changeMetadata.status;
						a++;
					}
					console.log(
						'updated record set should be done with dnsAuthorization removed'
					);
				}
				return true;
			} catch (err) {
				console.error('ERROR: ', err);
				return null;
			} finally {
				await releaseLock(recordDnsName);
			}
		}
	};
};
