const Message = require("../models/message");
const Member = require("../models/member");
const Companionship = require("../models/companionship");
const MessageResponseHandler = require("./messageResponseHandler");

function asyncWrap(fn) {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

SMSController = {
	/**
	 * POST /sms/receive
	 *
	 * Receive a message via Twilio and return a TwiML response.
	 */
	receive: asyncWrap(async (req, res) => {
		const messageBody = req.body;
		const responseMessage = await MessageResponseHandler.getResponse(
			messageBody
		);
		if (responseMessage) {
			console.log("=> Sending response: ", responseMessage.body, "\n");
			res.send(responseMessage.toTwiML());
		} else {
			console.log("=> No response sent.\n");
			res.status(204).end();
		}
	}),

	/**
	 * POST /sms/status
	 *
	 * Receive message status via Twilio and update in DB.
	 */
	status: asyncWrap(async (req, res) => {
		console.log(`Status update for ${req.body.SmsSid}`);
		const message = await Message.findOne({ sid: req.body.SmsSid });
		if (message) {
			console.log("Message found");
			message.status = req.body.SmsStatus;
			message.dateUpdated = new Date();
			message.save();
		}
		res.status(204).end();
	})
}

module.exports = SMSController;
