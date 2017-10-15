const Base = require("./base");
const messageTypes = require("./messageTypes");

/**
 * EQ Reporting
 * Member Class
 *
 * Member class for Mongo documents.
 */
class Member extends Base {
	constructor(...args) {
		super(...args);
		this.cachedRelations.visits = null;
	}
	getCompanionship() {
		if (
			!this.attributes.priesthoodOffice ||
			this.attributes.gender == "FEMALE"
		) {
			return null;
		}
		return Companionship.findByTeacherIndividualId(
			this.attributes.individualId
		);
	}

	async getHomeTeachees() {
		const companionship = await this.getCompanionship();
		return companionship.getAssignments();
	}

	getAssignedCompanionship() {
		return Companionship.findByAssignmentIndividualId(
			this.attributes.individualId
		);
	}

	async getHomeTeachers() {
		const assignedCompanionship = await this.getAssignedCompanionship();
		return assignedCompanionship
			? assignedCompanionship.getTeachers()
			: null;
	}

	get firstName() {
		return this.attributes.givenName1.split(" ")[0];
	}

	get fullName() {
		return `${this.firstName} ${this.attributes.surname}`;
	}

	get spouseFirstName() {
		return this.attributes.spouseName ? this.attributes.spouseName.split(" ")[0] : "";
	}

	get routeName() {
		return this.getRouteName();
	}

	getRouteName(formal = true) {
		if (this.attributes.spouseName) {
			return formal
				? `${this.attributes.surname}, ${this.firstName} and ${this.spouseFirstName}`
				: `${this.firstName} and ${this.spouseFirstName} ${this.attributes.surname}`;
		}
		return formal
			? this.attributes.formattedName
			: `${this.firstName} ${this.attributes.surname}`;
	}

	get routeAddress() {
		return this.attributes.address.streetAddress;
	}

	get routePhone() {
		return this.attributes.phone ? this.attributes.phone : "<No Phone>";
	}

	async getLastOutboundMessage() {
		const lastMessageNotNone = await Message.findOne(
			{
				source: "outbound",
				type: { $ne: messageTypes.TYPE_NONE },
				toIndividualId: this.attributes.individualId
			},
			{ sort: { dateCreated: -1 } }
		);
		return lastMessageNotNone;
	}

	async getLastReport() {
		const lastReport = await Report.findOne(
			{ sentToTeacherIds: this.attributes.individualId },
			{ sort: { dateCreated: -1 } }
		);
		return lastReport;
	}

	async toAPI() {
		let attributes = super.toAPI();
		attributes.visits = this.cachedRelations.visits ? this.cachedRelations.visits : [];
		attributes.routeName = this.routeName;
		attributes.firstName = this.firstName;
		return attributes;
	}

	static findOneByPhone(phone) {
		if (!phone) {
			return null;
		}
		return this.findOne({ phone: phone });
	}
}
Member.idField = "individualId";
Member.collection = "members";

module.exports = Member;

const Companionship = require("./companionship");
const Message = require("./message");
const Report = require("./report");
