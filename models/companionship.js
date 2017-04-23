const co = require("co");
const Base = require("./base");
const stripIndent = require("common-tags").stripIndent;
const emojiNumbers = ["⓵", "⓶", "⓷", "⓸", "⓹", "⓺"];

/**
 * EQ Reporting
 * Companionship Class
 *
 * Companionship class for Mongo documents.
 */
class Companionship extends Base {
	getTeachers() {
		return Member.find({
			[Member.idField]: { $in: this.teacherIndividualIds }
		});
	}

	getAssignments() {
		return Member.find({
			[Member.idField]: { $in: this.assignmentIndividualIds }
		});
	}

	getFormattedRoute(forIndividualId, footer = null) {
		return co(
			function*() {
				var formattedRoute = "";
				const sep = "⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯";
				const teachers = yield this.getTeachers();
				const families = yield this.getAssignmentsWithVisits();
				const forMember = teachers.filter(
					t => t.individualId == forIndividualId
				)[0];
				const companion = teachers.filter(
					t => t.individualId !== forIndividualId
				)[0];

				const header = stripIndent`
			🏠 Home Teaching Route for ${forMember.formattedName}
			🤝 Companion: ${companion.formattedName} (${companion.phone})
			${sep}`;

				const formatFamily = (family, index) => {
					let num = index + 1;
					return stripIndent`
					${emojiNumbers[index]} ${family.routeName}
					     ${family.routeAddress}
					     ${family.routePhone}`;
				};
				const formattedFamilies = families
					.map(formatFamily)
					.join("\n\n");

				footer = stripIndent`
				${sep}
				${footer ? footer : ""}`;

				return stripIndent`${header}\n${formattedFamilies}\n${footer}`;
			}.bind(this)
		);
	}

	getAssignmentsWithVisits() {
		return co(
			function*() {
				const families = yield this.getAssignments();
				const assignments = this.assignments;
				var ret = [];
				for (let idx in families) {
					var family = families[idx];
					var visits = assignments[idx].visits;
					family.cachedRelations.visits = visits;
					ret.push(family);
				}
				return ret;
			}.bind(this)
		);
	}

	static findByTeacherIndividualId(id) {
		return this.findOne({ teacherIndividualIds: Number(id) });
	}

	static findByAssignmentIndividualId(id) {
		return this.findOne({ assignmentIndividualIds: Number(id) });
	}
}
Companionship.idField = "id";
Companionship.collection = "companionships";

module.exports = Companionship;

const Member = require("./member");
