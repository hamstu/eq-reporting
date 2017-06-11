require("dotenv").config();

const Mongo = require("mongodb");
const MongoClient = Mongo.MongoClient;
const express = require("express");
const bodyParser = require("body-parser");
const basicAuth = require('express-basic-auth');
const hbs = require('hbs');
const moment = require('moment');

const SMSController = require("./lib/smsController");
const AdminController = require("./lib/adminController");

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.set('view engine', 'hbs');
app.set('views', __dirname + '/frontend/views');
app.use(express.static(__dirname + '/frontend/public'));
hbs.registerHelper('nl2br', function(options) {
  var nl2br = (options.fn(this) + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + '<br />' + '$2');
	return new hbs.SafeString(nl2br);
});
hbs.registerHelper("debug", function(optionalValue) {
    console.log("Current Context");
    console.log("====================");
    console.log(this);
    if (optionalValue) {
        console.log("Value");
        console.log("====================");
        console.log(optionalValue);
    }
});
hbs.registerHelper("renderVisits", (num, visits) => {
	var rendered = "";
	var visitsToShow = visits.slice(visits.length - Number(num), visits.length);
	var lastYear = null;
	for (visit of visitsToShow) {
		let date = moment().month(visit.month-1).year(visit.year);
		if (lastYear === null || visit.year !== lastYear) {
			lastYear = visit.year;
			visitYear = `<span class="visit-year">${visit.year}</span>`;
		} else {
			visitYear = '';
		}
		let month = date.format("MMM");
		let visitedClass = visit.visited
			? 'visited'
			: visit.visited === null ? 'not-reported' : 'not-visited';
		rendered += `
			${visitYear} <span class="visit">${month} <span class="visit-pip visit-pip--${visitedClass}"></span></span>
		`;
	}
	return new hbs.SafeString(rendered);
});

// SMS Controller
app.post("/sms/receive", SMSController.receive);
app.post("/sms/status",  SMSController.status);

// Admin
const isProduction = process.env.NODE_ENV === 'production';
const requireAuth = isProduction
	? basicAuth({
	    users: { [process.env.ADMIN_USER]: process.env.ADMIN_PASSWORD },
	    challenge: true,
	    realm: `eq-reporting-${process.env.NODE_ENV}`
	})
	: (req, res, next) => next();

app.get("/admin", requireAuth, AdminController.index);
app.get("/admin/companionships", requireAuth, AdminController.companionships);
app.get("/admin/companionship/:companionshipId/send-report",
	AdminController.sendCompanionshipReport);

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
