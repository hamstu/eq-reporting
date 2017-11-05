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

const isProduction = process.env.NODE_ENV === 'production';

var defaultOptions = {
  from: process.env.GMAIL_EMAIL,
  to: isProduction ? process.env.GMAIL_NOTIFY_PRODUCTION : process.env.GMAIL_NOTIFY,
};

module.exports.notify = (options) => {
  const mailOptions = { ...defaultOptions, ...options };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Email error:', error);
    } else {
      console.log('Sending email to: ', defaultOptions.to);
      console.log('Email sent: ' + info.response + '\n\n' + mailOptions.title + '\n' + mailOptions.text);
    }
  });
};


