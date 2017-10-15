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

	async getFormattedRoute(forIndividualId, footer = null) {
		var formattedRoute = "";
		const sep = "⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯";
		const teachers = await this.getTeachers();
		const families = await this.getAssignmentsWithVisits();
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
	}

	async getAssignmentsWithVisits() {
		const families = await this.getAssignments();
		const assignments = this.assignments;
		var ret = [];
		for (let idx in families) {
			var family = families[idx];
			var visits = assignments[idx].visits;
			family.cachedRelations.visits = visits;
			ret.push(family);
		}
		return ret;
	}

	async toAPI() {
		let attributes = super.toAPI();

		let assignments = await this.getAssignmentsWithVisits();
		for (let idx in assignments) {
			assignments[idx] = await assignments[idx].toAPI();
		}
		attributes.assignments = assignments;

		let teachers = await this.getTeachers();
		for (let idx in teachers) {
			teachers[idx] = await teachers[idx].toAPI();
		}
		teachers.sort((a,b) => {
			return this.teacherIndividualIds.indexOf(a.individualId)
				< this.teacherIndividualIds.indexOf(b.individualId) ? -1 : 1;
		});
		attributes.teachers = teachers;

		return attributes;
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
