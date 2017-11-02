require("dotenv").config();

const Mongo = require("mongodb");
const MongoClient = Mongo.MongoClient;
const express = require("express");
const bodyParser = require("body-parser");
const basicAuth = require('express-basic-auth');
const hbs = require('hbs');

const SMSController = require("./lib/smsController");
const AdminController = require("./lib/adminController");
const { registerHelpers } = require('./lib/templateHelpers')

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.set('view engine', 'hbs');
app.set('views', __dirname + '/frontend/views');
app.use(express.static(__dirname + '/frontend/public'));

// HBS Helpers
registerHelpers(hbs);

// SMS Controller
app.post("/sms/receive", SMSController.receive);
app.post("/sms/status",  SMSController.status);

// Admin
const isProduction = process.env.NODE_ENV === 'production';
const requireAuth = isProduction
	? basicAuth({
	    users: {
	    	[process.env.ADMIN_USER]: process.env.ADMIN_PASSWORD,
	    	'nephi': 'iamachildofgod',
	    },
	    challenge: true,
	    realm: `eq-reporting-${process.env.NODE_ENV}`
	})
	: (req, res, next) => next();

app.get("/admin", requireAuth, AdminController.index);
app.get("/admin/companionships", requireAuth, AdminController.companionships);
app.get("/admin/companionship/:companionshipId/send-report",
	AdminController.sendCompanionshipReport);
app.get("/admin/reports", requireAuth, AdminController.reports);

// Ping/pong
app.get("/ping", (_, res) => res.send('pong'));

// Start the server
async function start() {
	const dbUri = `${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DB}`;
	try {
		global.db = await MongoClient.connect(dbUri);
		app.listen(process.env.NODE_PORT);
	} catch (err) {
		console.error(err);
		if (db) {
			db.close();
		}
	}
}

start();
