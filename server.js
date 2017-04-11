require('dotenv').config();

const Mongo = require('mongodb');
const MongoClient = Mongo.MongoClient;
const Long = Mongo.Long;

const co = require('co');
const wrap = require('co-express');
const express = require('express');
const bodyParser = require('body-parser');

const Member = require('./models/member');
const Companionship = require('./models/member');
const Message = require('./models/message');
const MessageResponseHandler = require('./lib/messageResponseHandler');

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


app.post('/receive', wrap(function* (req, res) {
	const message = req.body;
	const responseMessage = yield MessageResponseHandler.getResponse(message);
	if (responseMessage) {
		res.send(responseMessage.toTwiML());
	} else {
		res.status(204).end();
	}
}));

app.post('/status', wrap(function* (req, res) {
	const message = yield Message.findOne({ sid: req.body.SmsSid });
	if (message) {
		message.status = req.body.SmsStatus;
		message.dateUpdated = new Date();
		message.save();
	}
	res.status(204).end();
}));

app.get('/test', wrap(function* (req, res) {
  const message = yield Message.findOne({source: 'outbound'});
  if (message) {
  	const response = yield message.send();
  	res.json({ response: response.status });
  } else {
	res.json({ response: null });
  }
}));

co(function *() {
	global.db = yield MongoClient.connect(process.env.MONGO_DB_URL);
	app.listen(8000);
}).catch((error) => {
	console.log(error);
	if (db) {
		db.close();
	}
});