require("dotenv").config();

const Mongo = require("mongodb");
const MongoClient = Mongo.MongoClient;
const co = require("co");

const Member = require("./models/member");
const Companionship = require("./models/companionship");

const LookupsClient = require('twilio').LookupsClient;
const client = new LookupsClient(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

function lookupNumber(number) {
	return new Promise((resolve, reject) => {
		client.phoneNumbers(number).get({
			type: 'carrier'
		}, function(error, number) {
			if (error) {
				reject(error);
			} else {
				resolve(number);
			}
		});
	});
}

async function main() {
	const dbUri = `${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DB}`;
	try {
		global.db = await MongoClient.connect(dbUri);
	} catch (err) {
		console.error(err);
		if (db) {
			db.close();
		}
	}

	const comps = await Companionship.find();
	let eqTeacherIds = [];
	comps.forEach(c => eqTeacherIds = eqTeacherIds.concat(c.teacherIndividualIds));
	const teachers = await Member.findByIds(eqTeacherIds);
	for (let t of teachers) {
		console.log(`Looking up number for ${t.fullName} (${t.phone})...`);
		const result = await lookupNumber(t.phone);
		console.log(`=> ${result.carrier.type}`);
		t.attributes.numberType = result.carrier.type;
		t.save();
		console.log('=> Saved');
	}
	db.close();
}

main();
