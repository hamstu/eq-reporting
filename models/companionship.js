const Base = require('./base');

/**
 * EQ Reporting
 * Companionship Class
 *
 * Companionship class for Mongo documents.
 */
class Companionship extends Base {
	getTeachers() {
		return Member.find({ [Member.idField]: {'$in': this.teacherIndividualIds } });
	}

	getAssignments() {
		return Member.find({ [Member.idField]: {'$in': this.assignmentIndividualIds } });
	}

	static findByTeacherIndividualId(id) {
		return this.findOne({ teacherIndividualIds: Number(id) });
	}

	static findByAssignmentIndividualId(id) {
		return this.findOne({ assignmentIndividualIds: Number(id) });
	}
}
Companionship.idField = 'id';
Companionship.collection = 'companionships';

module.exports = Companionship;

const Member = require('./member');