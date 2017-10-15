require("dotenv").config();

var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');

var transporter = nodemailer.createTransport(
  smtpTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    auth: {
      user: process.env.GMAIL_EMAIL,
      pass: process.env.GMAIL_PASSWORD
    }
  })
);

var defaultOptions = {
  from: process.env.GMAIL_EMAIL,
  to: process.env.GMAIL_NOTIFY,
};

module.exports.notify = (options) => {
  const mailOptions = { ...defaultOptions, ...options };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response + '\n\n' + mailOptions.title + '\n' + mailOptions.text);
    }
  });
};


