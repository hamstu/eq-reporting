require("dotenv").config();

const Long = require("mongodb").Long;
const Base = require("./base");
const messageTypes = require("./messageTypes");
const randText = require("../lib/speech").randText;
const { notify } = require("../lib/mailer");
const { formatReportType } = require("../lib/templateHelpers");
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
	async send(to = null) {
		const { teacherIndividualIds } = this.attributes;
		const teachers = await Member.find({
			[Member.idField]: { $in: this.teacherIndividualIds }
		});
		const teachersToSendTo = to
			? teachers.filter(t => t.attributes.individualId == to)
			: teachers;
		const families = await Member.find({
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

					👉 Reply with "Yes", "No", or "please call" if you'd like a member of the EQ Presidency to call you.
				`,
				messageTypes.TYPE_OUTBOUND_HT_REPORT_1,
				teacher,
				null,
				this.id
			);
			console.log("Sending report request to", message.toPhone);
			const promise = message.send();
			promise.then((message) => {
				this.saveSentTo(teacher);
				this.attributes.status = "sent";
				this.attributes.dateSent = new Date();
				this.save();
			})
			promise.catch((e) => {
				throw new Error('Unable to send report report request.');
			});
			return promise;
		}
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
	 * Save a response to the report.
	 *
	 * @param  {Message} message
	 * @param  {Member} member
	 * @param  {string} responseType
	 * @return {void}
	 */
	async saveReport(message, member, responseType) {
		// Attach the message to this report
		message.attributes.forReportId = this.attributes._id;
		message.save();

		const report = {
			teacherIndividualId: member.id,
			type: responseType,
			body: message.body,
			date: message.dateCreated,
			messageId: message.id,
		};

		// Add to reports
		this.attributes.reports.push(report);
		this.save();

		// Notify when the report is done...
		const finalReportMessageTypes = [
			messageTypes.REPORT_FAMILY_NEEDS,
			messageTypes.REPORT_CHALLENGES,
			messageTypes.REPORT_REQUESTED_CALL
		];
		if (finalReportMessageTypes.includes(responseType)) {

			const reportText = this.attributes.reports.map(report => {
				if (report.teacherIndividualId == member.id) {
					return commonTags.stripIndents`
						${formatReportType(report.type)}:
						${report.body}
					`;
				}
			}).join('\n\n');

			const assignments = await this.getAssignments();
			const assignmentsText = assignments.map((a) => {
				return commonTags.stripIndents`
					• ${a.routeName}
				`;
			}).join('\n');

			const teachers = await this.getTeachers();
			const teachersText = teachers.map((t) => {
				return commonTags.stripIndents`
					• ${t.formattedName}
				`;
			}).join('\n');

			const month = moment(this.month, 'M').format('MMMM');

			notify({
				subject: `${member.fullName} has submitted his home teaching report for ${month}`,
				text: commonTags.stripIndents`
					${member.fullName} has just completed his home teaching report for ${month}.

					${reportText}

					---

					👥 Companionship:
					${teachersText}

					🏡 Assignments:
					${assignmentsText}

					---

					This message was sent by Omni, the Home Teaching bot! 🤖
				`
			});
			this.attributes.status = 'completed';
			this.save();
		}
	}

	getTeachers() {
		return Member.find({
			[Member.idField]: { $in: this.teacherIndividualIds }
		});
	}

	getSeniorCompanion() {
		return Member.findOneById(this.teacherIndividualIds[0]);
	}

	getJuniorCompanion() {
		return Member.findOneById(this.teacherIndividualIds[1]);
	}

	getAssignments() {
		return Member.find({
			[Member.idField]: { $in: this.assignmentIndividualIds }
		});
	}

	async toAPI() {
		let attributes = super.toAPI();

		attributes.assignments = await this.getAssignments();

		let teachers = await this.getTeachers();
		for (let idx in teachers) {
			const companionship = await teachers[idx].getCompanionship();
			teachers[idx] = await teachers[idx].toAPI();
			teachers[idx].companionshipId = companionship.id;
			let reportsFromTeacher = this.attributes.reports.filter(r => r.teacherIndividualId == teachers[idx].individualId);
			teachers[idx].reports = reportsFromTeacher;
			teachers[idx].wasSentReport = this.attributes.sentToTeacherIds.includes(teachers[idx].individualId);
		}
		teachers.sort((a,b) => {
			return this.teacherIndividualIds.indexOf(a.individualId)
				< this.teacherIndividualIds.indexOf(b.individualId) ? -1 : 1;
		});
		attributes.teachers = teachers;

		return attributes;
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
			reports: [],
			dateCreated: new Date(),
			dateUpdated: new Date(),
			dateSent: null
		};
		const report = new Report(data);
		report.save();
		return report;
	}

	static async findOrCreate(
		month,
		year,
		teacherIndividualIds,
		assignmentIndividualIds
	) {
		const existingReport = await Report.findOne({
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
	}
}
Report.idField = "_id";
Report.collection = "reports";

module.exports = Report;

const Member = require("./member");
const Message = require("./message");
