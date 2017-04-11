const co = require('co');
const messageTypes = require('../models/messageTypes');

/**
 * EQ Reporting
 * Message Response Handler
 *
 * Logic for handling SMS responses and flow for the EQ reporting app.
 */

class MessageResponseHandler {
	static getResponse(inboundMessage) {
		return co(function *() {
			const message = yield Message.createFromInbound(inboundMessage);
			const member = yield message.getMember();
			if (member) {
				return yield this.handleMemberResponse(message, member);
			} else {
				return Message.createForOutbound(
					`Sorry, I can't find your number in the Ward Directory. Contact Hamish Macpherson for assistance.`,
					messageTypes.TYPE_MEMBER_NOT_FOUND,
					messageData.From,
					message.sid
				);
			}
		}.bind(this));
	}

	static handleMemberResponse(message, member) {
		return co(function *() {
			const lastMessageType = yield member.getLastOutboundMessageType();
			return Message.createForOutbound(
				'Your last message type was: ' + lastMessageType,
				messageTypes.TYPE_NONE,
				member,
				message.id
			);
		});
	}
}

module.exports = MessageResponseHandler;

const Message = require('../models/message');