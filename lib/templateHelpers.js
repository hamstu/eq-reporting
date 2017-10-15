const moment = require('moment-timezone');
const messageTypes = require('../models/messageTypes');
const helpers = module.exports.helpers = {};

helpers.nl2br = (hbs) => (options) => {
  var nl2br = (options.fn(this) + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + '<br />' + '$2');
  return new hbs.SafeString(nl2br);
};

helpers.formatDate = (hbs) => (date, format) => moment(date).tz('America/Vancouver').format(format);
helpers.formatMonth = (hbs) => (month) => moment(month, 'M').format('MMMM');

helpers.debug = (hbs) => (optionalValue) => {
    console.log("Current Context");
    console.log("====================");
    console.log(this);
    if (optionalValue) {
        console.log("Value");
        console.log("====================");
        console.log(optionalValue);
    }
};

helpers.renderVisits = (hbs) => (num, visits) => {
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
};

module.exports.formatReportType = (type) => {
  switch (type) {
    case messageTypes.REPORT_FAMILY_NEEDS:
      return 'Family needs / concerns';
    case messageTypes.REPORT_VISITED_FAMILIES:
      return 'Families visited';
    case messageTypes.REPORT_VISITED_FAMILIES:
      return 'With which families';
    case messageTypes.REPORT_VISITED:
      return 'Made visit(s)';
    case messageTypes.REPORT_CHALLENGES:
      return 'Challenge in doing Home Teaching';
    default:
      return '';
  }
};

helpers.formatReportType = (hbs) => module.exports.formatReportType;

module.exports.registerHelpers = (hbs) => {
  Object.keys(helpers).forEach(key => {
    hbs.registerHelper(key, helpers[key](hbs.handlebars));
  });
};

