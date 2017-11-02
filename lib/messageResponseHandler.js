/**
 * EQ Reporting
 * Message Response Handler
 *
 * Logic for handling SMS responses and flow for the EQ reporting app.
 */

const messageTypes = require("../models/messageTypes");
const speech = require("./speech");
const commonTags = require("common-tags");
const randText = require("./speech").randText;
const moment = require('moment');

const commandsResponse = commonTags.stripIndents`
\n
	"route" 👉 See your Home Teaching Assignment
	"report" 👉 Make a new home teaching report for the last month

	... More commands coming soon!
`;

/**
 * This decision map array determines the repsonses to messages from the member.
 * Matches are checked in a top-down order.
 *
 * @type {Array}
 */
const decisionMap = [
	// Replied to 'any needs or concerns?'
	// => Report complete
	{
		numberMatchedMember: true,
		lastMessageType: messageTypes.TYPE_OUTBOUND_HT_REPORT_3,
		response: () => ({
			async body({ message, member, lastReport, lastMessage }) {
				// Be sure to save their response!
				lastReport.saveReport(message, member, messageTypes.REPORT_FAMILY_NEEDS);

				const thanks = randText('happyOpener');
				const noted = randText('noted');
				const closer = randText('closer');

				return commonTags.stripIndents`
					${thanks} ${member.firstName}, ${noted}! ✨

					${closer} 👋
					— Omni

					PS. Text me 'hello' to see what other cool things I can do!
				`;
			},
			type: messageTypes.TYPE_OUTBOUND_HT_REPORT_COMPLETE
		})
	},
	// Reply to who did you visit?
	// => Do they have any needs?
	{
		numberMatchedMember: true,
		lastMessageType: messageTypes.TYPE_OUTBOUND_HT_REPORT_2,
		response: () => ({
			async body({ message, member, lastReport, lastMessage }) {
				// Be sure to save their response!
				lastReport.saveReport(message, member, messageTypes.REPORT_VISITED_FAMILIES);

				return commonTags.stripIndents`
					Final question; Do your families have any special needs or concerns that the EQ Presidency or Bishop should be aware of?

					👉 Reply with a single message containing the details of their needs or concerns, or "none" if not applicable.
				`;
			},
			type: messageTypes.TYPE_OUTBOUND_HT_REPORT_3
		})
	},

	// 'Phone call' to Home Teaching Report 1 (Did you visit anyone?)
	// => Okay, someone will call you
	{
		numberMatchedMember: true,
		lastMessageType: messageTypes.TYPE_OUTBOUND_HT_REPORT_1,
		match: /^\s*((phone)|(call)|(phone call)|(call me)|(please call)|(please call me)|(please phone me))\s*$/i,
		response: ({ member }) => ({
			async body({ message, member, lastReport }) {
				lastReport.saveReport(message, member, messageTypes.REPORT_REQUESTED_CALL);
				return commonTags.stripIndents`
					Thanks ${member.firstName}. Someone in the presidency will reach out to you shortly.
					— Omni

					PS. Text me 'hello' to see what other cool things I can do!
				`;
			},
			type: messageTypes.TYPE_OUTBOUND_HT_REPORT_COMPLETE
		})
	},

	// 'No' to Home Teaching Report 1 (Did you visit anyone?)
	// => What's your challenge?
	{
		numberMatchedMember: true,
		lastMessageType: messageTypes.TYPE_OUTBOUND_HT_REPORT_1,
		match: /^\s*((no)|(nope)|(zero)|(none)|(did not))\s*$/i,
		response: ({ member }) => ({
			async body({ message, member, lastReport }) {
				lastReport.saveReport(message, member, messageTypes.REPORT_VISITED);
				return commonTags.stripIndents`
					Thanks for the reply ${member.firstName}.

					If you don't mind sharing; what's the biggest challenge for you in doing your Home Teaching?

					👉 Please reply with a single message containing anything you'd like to share, or reply "Skip".
				`;
			},
			type: messageTypes.TYPE_OUTBOUND_HT_REPORT_10
		})
	},

	// 'Yes' to Home Teaching Report 1 (Did you visit anyone?) (i.e., not a 'no')
	// => Who did you visit?
	{
		numberMatchedMember: true,
		lastMessageType: messageTypes.TYPE_OUTBOUND_HT_REPORT_1,
		response: () => ({
			async body({ message, member, lastReport, lastMessage }) {
				lastReport.saveReport(message, member, messageTypes.REPORT_VISITED);
				const thanks = randText('happyOpener');
				const month = moment(lastReport.month, 'M').format('MMMM');
				return commonTags.stripIndents`
					${thanks} ${member.firstName}! ✨
					Of those ${lastReport.assignmentIndividualIds.length} families assigned to you, who were you able to contact and/or visit in ${month}? Remember, everything counts!

					👉 Please reply with a single message. If you already included this information in your last message, then please reply "Skip".
				`;
			},
			type: messageTypes.TYPE_OUTBOUND_HT_REPORT_2
		})
	},

	// Response to what's your challenge in doing HT?
	// => Complete
	{
		numberMatchedMember: true,
		lastMessageType: messageTypes.TYPE_OUTBOUND_HT_REPORT_10,
		response: ({ member }) => ({
			async body({ message, member, lastReport, lastMessage }) {
				lastReport.saveReport(message, member, messageTypes.REPORT_CHALLENGES);

				const thanks = randText('happyOpener');
				const noted = randText('noted');
				const closer = randText('closer');

				return commonTags.stripIndents`
					Thanks ${member.firstName}, ${noted}.
					— Omni

					PS. Text me 'hello' to see what other cool things I can do!
				`;
			},
			type: messageTypes.TYPE_OUTBOUND_HT_REPORT_COMPLETE
		})
	},

	{
		numberMatchedMember: true,
		match: /((route)|(routes)|(my route)|(show my route)|(assignment)|(my assignment))(\?)?(\s)*$/i,
		response: ({ member }) => ({
			async body({ member }) {
				const companionship = await member.getCompanionship();
				return await companionship.getFormattedRoute(
					member.individualId
				);
			}
		})
	},

	{
		numberMatchedMember: true,
		match: /^report$/i,
		response: ({ member }) => ({
			async body({ member }) {
				const companionship = await member.getCompanionship();
				const report = await Report.findOrCreate(
					parseInt(moment().subtract(1, 'month').format('M')),
					parseInt(moment().subtract(1, 'month').format('YYYY')),
					companionship.teacherIndividualIds,
					companionship.assignmentIndividualIds
				);
				const result = await report.send(member.individualId);

				// Don't return anything, since a report SMS was triggered...
			},
		})
	},

	{
		numberMatchedMember: true,
		match: /^hello$/i,
		response: ({ member, message }) => ({
			body: `🤖 Why hello there ${member.firstName}! Here are some things you can text me. \n\n` +
				commandsResponse
		})
	},

	{
		numberMatchedMember: true,
		response: ({ member, message }) => ({
			body: `{${randText('error')}} ${member.firstName}, I don't understand your last message, here are some things you can text me: \n\n` +
				commandsResponse
		})
	},

	{
		numberMatchedMember: false,
		response: ({ message }) => ({
			body: `Sorry, we can\'t find your number (${message.fromPhone}) in the ward directory.`,
			type: messageTypes.TYPE_MEMBER_NOT_FOUND
		})
	}
];

class MessageResponseHandler {
	static async getResponse(inboundMessage) {
		const message = await Message.createFromInbound(inboundMessage);
		const member = await message.getMember();
		const lastMessage = member
			? await member.getLastOutboundMessage()
			: null; // TODO: Get last type for non members?
		const lastMessageType = (lastMessage && lastMessage.type) ? lastMessage.type : messageTypes.TYPE_NONE;
		const lastReport = member
			? await member.getLastReport()
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
			? await responseData.body({
					message,
					member,
					lastReport,
					lastMessage,
					lastMessageType
				})
			: responseData.body;
		if (body) {
			return Message.createForOutbound(
				body,
				responseData.type || messageTypes.TYPE_NONE,
				member ? member : message.fromPhone,
				message.id
			);
		}
		return null;
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
const Report = require("../models/report");
