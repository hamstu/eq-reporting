require("dotenv").config();

const Long = require("mongodb").Long;
const Base = require("./base");
const messageTypes = require("./messageTypes");
const co = require("co");
const randText = require("../lib/speech").randText;
const commonTags = require("common-tags");
const moment = require('moment');

/**
 * EQ Reporting
 * Report Class
 */
class Report extends Base {
	/**
	 * send()
	 *
	 * Send a request for a report.
	 *
	 * @param {Number}   (optional) The teacher ID to send to (will not send to their companion.)
	 *                              Leave empty to send to all.
	 * @return {void}
	 */
	send(to = null) {
		return co(
			function*() {
				const { teacherIndividualIds } = this.attributes;
				const teachers = yield Member.find({
					[Member.idField]: { $in: this.teacherIndividualIds }
				});
				const teachersToSendTo = to
					? teachers.filter(t => t.attributes.individualId == to)
					: teachers;
				const families = yield Member.find({
					[Member.idField]: { $in: this.assignmentIndividualIds }
				});
				const names = families.map(f => f.getRouteName(false));
				const nameList = commonTags.commaListsAnd`${names}`;
				for (let teacher of teachersToSendTo) {
					let companion;
					for (let comp of teachers) {
						if (comp.individualId != teacher.individualId) {
							companion = comp;
						}
					}
					const greeting = randText('greeting');
					const attr = randText('attribute');
					const month = moment(this.month, 'M').format('MMMM');
					const homeTeachEmoji = randText('emoji');
					const questionEmoji = randText('emoji');
					const companionDetails = companion
						? `Your companion is ${companion.fullName} (${companion.phone}).`
						: 'You do not have a companion.';
					const message = Message.createForOutbound(
						commonTags.stripIndents`
							${greeting} ${teacher.firstName}! This is Omni – your ${attr} Chilliwack Home Teaching Bot. 🤖

							${homeTeachEmoji} It looks like you Home Teach ${families.length} families: ${nameList}. ${companionDetails}

							${questionEmoji} Were you able to contact or visit with any of these families in the month of ${month}?
						`,
						messageTypes.TYPE_OUTBOUND_HT_REPORT_1,
						teacher,
						null,
						this.id
					);
					console.log("Sending report request to", message.toPhone);
					message.send().then((message) => {
						this.saveSentTo(teacher);
						this.attributes.status = "sent";
						this.attributes.dateSent = new Date();
						this.save();
					});
				}
			}.bind(this)
		);
	}

	/**
	 * Save a teacher that was sent a report message.
	 *
	 * @param  {Teacher} teacher
	 * @return {void}
	 */
	saveSentTo(teacher) {
		if (this.attributes.sentToTeacherIds.indexOf(teacher.id) === -1) {
			this.attributes.sentToTeacherIds = [...this.attributes.sentToTeacherIds, teacher.id];
			this.save();
		}
	}

	/**
	 * create()
	 *
	 * Create a Report to be filled in.
	 *
	 * @param  {int}	month
	 * @param  {int} 	year
	 * @param  {array} 	teacherIndividualIds
	 * @param  {array}	assignmentIndividualIds
	 *
	 * @return {Report}
	 */
	static create(month, year, teacherIndividualIds, assignmentIndividualIds) {
		const data = {
			month,
			year,
			teacherIndividualIds,
			assignmentIndividualIds,
			sentToTeacherIds: [],
			status: "new",
			response: null,
			dateCreated: new Date(),
			dateUpdated: new Date(),
			dateSent: null
		};
		const report = new Report(data);
		report.save();
		return report;
	}

	static findOrCreate(
		month,
		year,
		teacherIndividualIds,
		assignmentIndividualIds
	) {
		return co(function*() {
			const existingReport = yield Report.findOne({
				month,
				year,
				teacherIndividualIds,
				assignmentIndividualIds
			});
			return existingReport
				? existingReport
				: Report.create(
						month,
						year,
						teacherIndividualIds,
						assignmentIndividualIds
					);
		});
	}
}
Report.idField = "_id";
Report.collection = "reports";

module.exports = Report;

const Member = require("./member");
const Message = require("./message");
