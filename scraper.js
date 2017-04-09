/**
 * EQ Reporting
 * Scraper
 *
 * This file loads LDS.org and scrapes the required Home Teaching and Member data.
 *
 */
require('dotenv').config();

const Nightmare = require('nightmare');
const nightmare = Nightmare({ show: true });

const resources = {
  start: 'https://www.lds.org/htvt/',
  members: 'https://www.lds.org/htvt/services/v1/72656/members',
  companionships: 'https://www.lds.org/htvt/services/v1/72656/districts/296670'
};

nightmare
  .goto(resources.start)
  .type('#IDToken1', process.env.LDS_ACCOUNT_USERNAME)
  .type('#IDToken2', process.env.LDS_ACCOUNT_PASSWORD)
  .click('input[type="submit"]')
  .wait(4000)
  .goto(resources.members)
  .html('./scraped/members.json', 'HTMLOnly')
  .goto(resources.companionships)
  .html('./scraped/companionships.json', 'HTMLOnly')
  .end()
  .then(() => { console.log('Scraping complete!'); });
