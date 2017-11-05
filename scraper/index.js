/**
 * EQ Reporting
 * Scraper
 *
 * This script loads LDS.org and scrapes the required Home Teaching and Member data.
 *
 */

require("dotenv").config();

const { promisify } = require('util');
const puppeteer = require('puppeteer');
const fs = require('fs');

const start = "https://www.lds.org/htvt/";
const resources = {
  members: "https://www.lds.org/htvt/services/v1/72656/members",
  companionships: "https://www.lds.org/htvt/services/v1/72656/districts/296670"
};

const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);

async function run() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto(start);

  await page.waitFor('input[type="submit"]');

  await page.type('#IDToken1', process.env.LDS_ACCOUNT_USERNAME);
  await page.type('#IDToken2', process.env.LDS_ACCOUNT_PASSWORD);

  await page.click('input[type="submit"]');

  await page.waitForSelector('h2.pageTitle');

  const data = await page.evaluate((resources) => {
    return Object.keys(resources).reduce((acc, resource) => {
      const req = $.ajax({ url: resources[resource], async: false });
      acc[resource] = req.responseText;
      return acc;
    }, {});
  }, resources);

  await mkdirAsync('./scraped');

  Object.keys(data).forEach(async (resource) => {
    await writeFileAsync(`./scraped/${resource}.json`, data[resource]);
  });

  await browser.close();
}

try {
  run();
} catch (e) {
  console.error(e);
  process.exit(1);
}
