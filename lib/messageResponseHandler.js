const co = require("co");
const messageTypes = require("../models/messageTypes");
const speech = require("./speech");
const commonTags = require("common-tags");
const randText = require("./speech").randText;
const moment = require('moment');

/**
 * EQ Reporting
 * Message Response Handler
 *
 * Logic for handling SMS responses and flow for the EQ reporting app.
 */

/**
 * This decision map array determines the repsonses to messages from the member.
 * Matches are checked in a top-down order.
 *
 * @type {Array}
 */
const decisionMap = [
	// 'Yes' to Home Teaching Report 1 (Did you visit anyone?)
	{
		numberMatchedMember: true,
		lastMessageType: messageTypes.TYPE_OUTBOUND_HT_REPORT_1,
		match: text => speech.isAffirmative(text),
		response: () => ({
			body: co.wrap(function*({ message, member, lastReport, lastMessage }) {
				const thanks = randText('happyOpener');
				const month = moment(lastReport.month, 'M').format('MMMM');
				return commonTags.stripIndents`
					${thanks} ${member.firstName}! ✨
					Of those ${lastReport.assignmentIndividualIds.length} families assigned to you, who were you able to contact and/or visit in ${month}?
				`;
			}),
			type: messageTypes.TYPE_OUTBOUND_HT_REPORT_2
		})
	},

	// 'No' to Home Teaching Report 1 (Did you visit anyone?)
	{
		numberMatchedMember: true,
		lastMessageType: messageTypes.TYPE_OUTBOUND_HT_REPORT_1,
		match: text => !speech.isAffirmative(text),
		response: ({ member }) => ({
			body: co.wrap(function*({ member }) {
				return 'Sorry, you were negative. Report complete.';
			}),
			type: messageTypes.TYPE_OUTBOUND_HT_REPORT_COMPLETE
		})
	},

	{
		numberMatchedMember: true,
		match: /((route)|(routes)|(my route)|(show my route)|(assignment)|(my assignment))(\?)?(\s)*$/i,
		response: ({ member }) => ({
			body: co.wrap(function*({ member }) {
				const companionship = yield member.getCompanionship();
				return yield companionship.getFormattedRoute(
					member.individualId
				);
			})
		})
	},

	{
		numberMatchedMember: true,
		lastMessageType: messageTypes.TYPE_ANY,
		response: ({ member, message }) => ({
			body: `Sorry ${member.firstName}, I don't understand "${message.body}"`
		})
	},

	{
		numberMatchedMember: false,
		lastMessageType: messageTypes.TYPE_ANY,
		response: ({ message }) => ({
			body: `Sorry, we can\'t find your number (${message.fromPhone}) in the ward directory.`,
			type: messageTypes.TYPE_MEMBER_NOT_FOUND
		})
	}
];

class MessageResponseHandler {
	static getResponse(inboundMessage) {
		return co(
			function*() {
				const message = yield Message.createFromInbound(inboundMessage);
				const member = yield message.getMember();
				const lastMessage = member
					? yield member.getLastOutboundMessage()
					: null; // TODO: Get last type for non members?
				const lastMessageType = (lastMessage && lastMessage.type) ? lastMessage.type : messageTypes.TYPE_NONE;
				const lastReport = member
					? yield member.getLastReport()
					: null;
				const {
					responseMethod,
					extraData
				} = this.getResponseMethodAndData(
					message,
					lastMessageType,
					member
				);
				const responseData = responseMethod({
					message,
					member,
					lastReport,
					lastMessage,
					lastMessageType
				});
				const responseBody = responseData.body;
				const body = typeof responseData.body === "function"
					? yield responseData.body({
							message,
							member,
							lastReport,
							lastMessage,
							lastMessageType
						})
					: responseData.body;
				if (responseData) {
					return Message.createForOutbound(
						body,
						responseData.type || messageTypes.TYPE_NONE,
						member ? member : message.fromPhone,
						message.id
					);
				}
				return null;
			}.bind(this)
		);
	}

	static getResponseMethodAndData(message, lastMessageType, member) {
		const numberMatchedMember = member !== undefined && member !== null;
		var matchedNode = null;
		var extraData = {};
		for (let node of decisionMap) {
			if (
				(node.numberMatchedMember === null ||
					node.numberMatchedMember === numberMatchedMember) &&
				(node.lastMessageType === messageTypes.TYPE_ANY ||
					node.lastMessageType === lastMessageType) &&
				this.matchText(node.match, message.body)
			) {
				matchedNode = node;
				break;
			}
		}
		if (matchedNode) {
			return { responseMethod: matchedNode.response, extraData };
		}
		return {
			responseMethod: () => ({ body: "Sorry, something went wrong." }),
			extraData
		};
	}

	static matchText(matcher, text) {
		console.log("Running match", matcher, text);
		if (!matcher) {
			return true;
		} else if (typeof matcher === "function") {
			return matcher(text);
		} else if (
			typeof matcher === "object" &&
			matcher.constructor.name == "RegExp"
		) {
			return matcher.exec(text);
		} else if (typeof matcher === "string") {
			return (
				text.trim().toLocaleLowerCase() ==
				matcher.trim().toLocaleLowerCase()
			);
		}
		return false;
	}
}

module.exports = MessageResponseHandler;

const Message = require("../models/message");
