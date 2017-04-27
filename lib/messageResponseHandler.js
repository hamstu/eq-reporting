const co = require("co");
const messageTypes = require("../models/messageTypes");

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
	{
		numberMatchedMember: true,
		match: /[route|routes|my route|show my route|assignment|my assignment](\?)?$/i,
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
				const lastMessageType = member
					? yield member.getLastOutboundMessageType()
					: null; // TODO: Get last type for non members?
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
					lastMessageType
				});
				const responseBody = responseData.body;
				const body = typeof responseData.body === "function"
					? yield responseData.body({
							message,
							member,
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
