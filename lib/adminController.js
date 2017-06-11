const wrap = require("co-express");
const Message = require("../models/message");
const Member = require("../models/member");
const Companionship = require("../models/companionship");
const Report = require("../models/report");

const AdminController = {
	index: wrap(function*(req, res) {
		res.render("index");
	}),
	companionships: wrap(function*(req, res) {
		//let messages = yield Message.find({}, { sort: { 'dateCreated': -1 } });
		//let userIds = new Set(messages.map(m => m.individualId));
		//let members = []; //yield Member.find({ individualId: { "$in": [...userIds] } });

		let companionships = yield Companionship.find({});
		for (let idx in companionships) {
			companionships[idx] = yield companionships[idx].toAPI();
		}
		res.render("companionships", { /* messages, members, */ companionships });
	}),
	sendCompanionshipReport: wrap(function*(req, res) {
		const { companionshipId } = req.params;
		const { to } = req.query;

		const companionship = yield Companionship.findOneById(Number(companionshipId));
		const report = yield Report.findOrCreate(
			4,
			2017,
			companionship.teacherIndividualIds,
			companionship.assignmentIndividualIds
		);
		report.send(to);
		res.sendStatus(200);
	})
};

module.exports = AdminController;