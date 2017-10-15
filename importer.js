/**
 * EQ Reporting
 * Importer
 *
 * This script imports the scraped data into the local database.
 * (See scraper.js)
 *
 */
require("dotenv").config();

const MongoClient = require("mongodb").MongoClient;
const Long = require("mongodb").Long;
const members = require("./scraped/members.json");
const companionships = require("./scraped/companionships.json");
const moment = require("moment");

let db;

async function collectionExists(name) {
	const collections = await db.listCollections().toArray();
	return collections.some((collection) => collection.name === name);
}

const importMembers = () => {
	for (let family of members.families) {
		var { headOfHouse, spouse, children, address, phone } = family;
		var hasOthersInHouse = !!(spouse || children.length);
		var familyPhone = normalizePhone(phone);
		var all = [headOfHouse, spouse, ...children].filter(item => item);

		var preparedHouseholdDocs = all.map(individual => {
			if (individual) {
				individual.address = address;
				individual.isHeadOfHouse =
					individual.individualId == headOfHouse.individualId;
				individual.hasOthersInHouse = hasOthersInHouse;
				individual.dateCreated = new Date();
				individual.dateUpdated = new Date();
				individual.birthdate = moment(individual.birthdate).toDate();
				individual.spouseName = (individual.isHeadOfHouse && spouse) ? spouse.givenName1 : null;

				let individualPhone = normalizePhone(individual.phone);
				individual.phone = individualPhone
					? individualPhone
					: familyPhone;
				console.log('Adding', individual.formattedName, individual.phone);

				/* Ensure Id fields are converted to Integers */
				for (let key of Object.keys(individual)) {
					if (key.endsWith("Id")) {
						individual[key] = individual[key] == 0
							? null
							: Long(individual[key]);
					}
				}

				return individual;
			}
		});
		insertDocuments("members", preparedHouseholdDocs);
	}
};

const normalizePhone = phone => {
	if (!phone || phone == "") {
		return null;
	}
	if (phone[0] == "+") phone = phone.slice(1);
	if (phone[0] == 1) phone = phone.slice(1);
	var newPhone = phone.replace(/\D/g, "");
	return `+1${newPhone}`;
};

const importCompanionships = () => {
	let companionshipsToAdd = [];
	for (district of companionships) {
		for (companionship of district.companionships) {
			companionship.teacherIndividualIds = companionship.teachers.map(t =>
				Long(t.individualId)
			);
			companionship.assignmentIndividualIds = companionship.assignments.map(
				a => Long(a.individualId)
			);
			companionship.dateStarted = moment(
				companionship.startDate
			).toDate();
			delete companionship.startDate;
			delete companionship.teachers;
			companionshipsToAdd.push(companionship);
		}
	}
	insertDocuments("companionships", companionshipsToAdd);
};

const createIndexes = () => {
	db
		.collection("members")
		.createIndex({ individualId: 1 }, { background: true, w: 1 });
};

const insertDocuments = (collection, documents) => {
	var collection = db.collection(collection);
	collection.insertMany(documents);
};

async function start() {
	db = await MongoClient.connect(
		`${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DB}`
	);

	if (await collectionExists('members')) {
		await db.collection("members").dropIndexes();
		await db.collection("members").drop();
	}
	if (await collectionExists('companionships')) {
		await db.collection("companionships").dropIndexes();
		await db.collection("companionships").drop();
	}

	importMembers();
	importCompanionships();
	createIndexes();

	db.close();
}

start();
