const Message = require("../models/message");
const Member = require("../models/member");
const Companionship = require("../models/companionship");
const Report = require("../models/report");

const moment = require('moment');

function asyncWrap(fn) {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

const AdminController = {
	index: (req, res) => {
		res.render("index");
	},
	companionships: asyncWrap(async (req, res) => {
		let companionships = await Companionship.find({});
		for (let idx in companionships) {
			companionships[idx] = await companionships[idx].toAPI();
		}
		res.render("companionships", { companionships });
	}),
	reports: asyncWrap(async (req, res) => {
		let reports = await Report.find({});
		for (let idx in reports) {
			reports[idx] = await reports[idx].toAPI();
		}
		res.render("reports", { reports });
	}),
	sendCompanionshipReport: asyncWrap(async (req, res) => {
		const { companionshipId } = req.params;
		const { to } = req.query;

		const companionship = await Companionship.findOneById(Number(companionshipId));
		const report = await Report.findOrCreate(
			parseInt(moment().subtract(1, 'month').format('M')),
			parseInt(moment().subtract(1, 'month').format('YYYY')),
			companionship.teacherIndividualIds,
			companionship.assignmentIndividualIds
		);
		try {
			const result = await report.send(to);
			res.json({ success: true });
		} catch (e) {
			res.json({ success: false, message: e.message });
		}
	})
};

module.exports = AdminController;
