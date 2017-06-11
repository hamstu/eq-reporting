require("dotenv").config();

const Long = require("mongodb").Long;
const Base = require("./base");
const messageTypes = require("./messageTypes");
const co = require("co");
const Twilio = require("twilio")(
	process.env.TWILIO_ACCOUNT_SID,
	process.env.TWILIO_AUTH_TOKEN
);

/**
 * EQ Reporting
 * Message Class
 *
 * Message class for Mongo documents.
 */
class Message extends Base {
	/**
	 * send()
	 *
	 * Send an SMS message with Twilio.
	 *
	 * @return {Promise} Twilio Response
	 */
	send() {
		let { source, toPhone, body, isToMobile } = this.attributes;
		if (source !== "outbound") {
			throw new Error(`Cannot send message of source ${type}.`);
		}
		if (!toPhone || toPhone === "") {
			throw new Error(`Cannot send to empty phone number.`);
		}
		if (!body || body === "") {
			throw new Error(`Cannot send a message with an empty body.`);
		}
		if (toPhone.indexOf("2177445") === -1) {
			console.log('Debug mode failsafe, not sending to anyone other than Hamish.');
			toPhone = "+16042177445";
		}
		if (isToMobile !== null && isToMobile !== true) {
			return Promise.reject(new Error('Cannot send to potential landline number.'));
		}
		const promise = Twilio.messages.create({
			MessagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_ID,
			to: toPhone,
			body: body
		});
		promise.then(message => {
			this.attributes.sid = message.sid;
			this.save();
		});
		return promise;
	}
	/**
	 * getMember()
	 *
	 * Get the Member that this message is from or to.
	 * Caches value for faster consecutive lookups.
	 *
	 * @return Promise -> Member
	 */
	getMember() {
		return co(
			function*() {
				if (this.cachedRelations.member) {
					return this.cachedRelations.member;
				}
				const { source } = this.attributes;
				const key = source === "inbound"
					? "fromIndividualId"
					: "toIndividualId";
				this.cachedRelations.member = yield Member.findOneById(
					Number(this.attributes[key])
				);
				return this.cachedRelations.member;
			}.bind(this)
		);
	}

	get individualId() {
		const key = this.attributes['source'] === "inbound"
			? "fromIndividualId"
			: "toIndividualId";
		return this.attributes[key];
	}

	/**
	 * toTwiML()
	 *
	 * Convert message body into TwiML.
	 * https://www.twilio.com/docs/api/twiml/sms/message
	 *
	 * @return {string}
	 */
	toTwiML() {
		return `<Response><Message>${this.attributes.body}</Message></Response>`;
	}

	/**
	 * toAPI()
	 *
	 * Convert message attributes into API-ish format.
	 *
	 * @return {string}
	 */
	toAPI() {
		let attributes = super.toAPI();
		const lineCount = (attributes.body.match(/\n/g) || []).length;
		attributes.isMultiline = lineCount > 1;
		return attributes;
	}

	/**
	 * createFromInbound()
	 *
	 * Create and save message based on an inbound SMS from Twilio.
	 *
	 * @param  {object} messageData
	 * @return {Promise => Message}  A Promise for the Message object.
	 */
	static createFromInbound(messageData) {
		return co(
			function*() {
				const member = yield Member.findOneByPhone(messageData.From);
				const data = {
					sid: messageData.MessageSid,
					body: messageData.Body,
					type: messageTypes.TYPE_INBOUND,
					fromIndividualId: member ? Long(member.id) : null,
					fromPhone: messageData.From,
					toIndividualId: null,
					toPhone: null,
					dateCreated: new Date(),
					dateUpdated: new Date(),
					status: messageData.SmsStatus,
					source: "inbound",
					ourResponseToMessageId: null,
				};
				const message = new Message(data);
				const result = yield message.save();
				message.cachedRelations.member = member;
				return message;
			}.bind(this)
		);
	}

	/**
	 * createForOutbound()
	 *
	 * Create and save a message to be sent outbound.
	 *
	 * @param  {string} body                    The message body
	 * @param  {string} type                    The message type
	 * @param  {Member | string} memberOrPhone  Member object or phone number to send to (ex: '+16045551234')
	 *                   						(This method does _not_ send the message.)
	 * @param  {string} ourResponseToMessageId (optional) The `sid` that this message is a response to
	 *
	 * @return {Message}
	 */
	static createForOutbound(
		body,
		type,
		memberOrPhone,
		ourResponseToMessageId = null,
		forReportId = null
	) {
		const toIndividualId = typeof memberOrPhone === "string"
			? null
			: memberOrPhone.id;
		const toPhone = typeof memberOrPhone === "string"
			? memberOrPhone
			: memberOrPhone.phone;
		const isToMobile = typeof memberOrPhone === "string"
			? null
			: memberOrPhone.numberType === 'mobile';
		const message = new Message({
			sid: "i/" + Message.generateId(),
			body: body,
			type: type,
			fromIndividualId: null,
			fromPhone: null,
			toIndividualId: toIndividualId ? Long(toIndividualId) : null,
			toPhone: toPhone,
			dateCreated: new Date(),
			dateUpdated: new Date(),
			status: "delivered",
			source: "outbound",
			ourResponseToMessageId,
			forReportId,
			isToMobile
		});
		message.save(); // TODO: Error checking
		return message;
	}
}
Message.idField = "_id";
Message.collection = "messages";

module.exports = Message;

const Member = require("./member");
