const Base = require("./base");
const messageTypes = require("./messageTypes");
const co = require("co");

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

	getHomeTeachees() {
		return co(
			function*() {
				const companionship = yield this.getCompanionship();
				return companionship.getAssignments();
			}.bind(this)
		);
	}

	getAssignedCompanionship() {
		return Companionship.findByAssignmentIndividualId(
			this.attributes.individualId
		);
	}

	getHomeTeachers() {
		return co(
			function*() {
				const assignedCompanionship = yield this.getAssignedCompanionship();
				return assignedCompanionship
					? assignedCompanionship.getTeachers()
					: null;
			}.bind(this)
		);
	}

	get firstName() {
		return this.attributes.givenName1.split(" ")[0];
	}

	get routeName() {
		if (this.attributes.hasOthersInHouse) {
			return this.attributes.surname + " Family";
		}
		return this.attributes.formattedName;
	}

	get routeAddress() {
		return this.attributes.address.streetAddress;
	}

	get routePhone() {
		return this.attributes.phone ? this.attributes.phone : "<No Phone>";
	}

	getLastOutboundMessageType() {
		return co(function*() {
			const lastMessageNotNone = yield Message.findOne(
				{ source: "outbound", type: { $ne: messageTypes.TYPE_NONE } },
				{ sort: { dateCreated: -1 } }
			);
			if (lastMessageNotNone) {
				return lastMessageNotNone.type;
			} else {
				return messageTypes.TYPE_NONE;
			}
		});
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
