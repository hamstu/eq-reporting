## EQ Home Teaching Bot
Automated Home Teaching Reports

This is a simple bot for collecting [home teaching](https://www.lds.org/topics/home-teaching?lang=eng&old=true) reports from your quorum members. It does this by sending and responding to **text messages sent with the [Twilio](http://twilio.com) API.**

The app itself is built with Node.js, Express, and MongoDB. We use Docker and Docker Compose to make it easy to get up and running anywhere.

---

## Requirements

To get this running, here's what you'll need.

- A [Twilio Account](http://twilio.com)
	- You can use the free option, but they'll prepend a bit of placeholder text to your SMS messages.
	- Make a note of your **Account SID** and **Auth Token** on the [Twilio Console](https://www.twilio.com/console), you'll need them later.
	- Finally, set up a new **Messaging Service** under the **Programmable SMS** section. Note the `SID` of the service once it's created, you'll also need it later.
- An [LDS Account](http://lds.org) with access rights to [Home Teaching data](http://lds.org/htvt/)
	- E.g., You'll have to be in the Elders Quorum or have another leadership calling.
- [Node](nodejs.org) version >= 6.8
- [Yarn](https://yarnpkg.com/en/) or NPM
- [`ngrok`](https://ngrok.com/) for forwarding Twilio API requests to your local machine while testing
- [Docker](https://docker.com) for running the app
	- [Docker for Mac](https://docs.docker.com/docker-for-mac/)
	- [Docker for Windows](https://docs.docker.com/docker-for-windows/)

---

## Setup Instructions

First, clone the repository down and jump inside:

```bash
$ git clone git@github.com:hamstu/eq-reporting.git
$ cd eq-reporting
```

Now we'll install the local dependencies:

```bash
$ yarn
```

Or if you're using `npm` instead:

```bash
$ npm install
```

Now open the `example.env` file in the project's root folder.

Update the fields to match the ones you noted earlier.
You can leave the `MONGO_*` and `NODE_*` variables alone, the defaults should be fine.

```bash
TWILIO_ACCOUNT_SID=123321441241941819409414
TWILIO_AUTH_TOKEN=47812fe12fe18fd118118d1fd
TWILIO_MESSAGING_SERVICE_ID=abcd123
LDS_ACCOUNT_USERNAME=MyUserName
LDS_ACCOUNT_PASSWORD=password
MONGO_HOST=mongodb://mongo
MONGO_PORT=27017
MONGO_DB=eqreporting
NODE_PORT=8000
ADMIN_USER=admin
ADMIN_PASSWORD=password
```

Rename the file to `.env`. (`.env` is already in the `.gitignore` and so will not be commited to any repository.)

### Scrape Data

Before we can use the app, we need to scrape the necessary member and companionship data from LDS.org. We run this command on your local system – not inside the Docker container like the commands you'll see later – because the scraping process usues an invisible browser to simulate an actual login to your LDS account.

```bash
$ npm run scrape
```

If it completes with no errors you should now have two files – `companionship.json` and `members.json` – in the `scraped` directory.

> Note: You'll have to run the `scrape` command anytime the companionship or member data changes on LDS.org (e.g., you change a home teaching route or assignment.)


### Start The App

Let's start everything up with `docker-compose`.

```bash
$ docker-compose up -d
```

If that worked you should see the app and database containers running with `docker-compose ps`.

```bash
 $ docker-compose ps
       Name                     Command             State            Ports
------------------------------------------------------------------------------------
eqreporting_mongo_1   docker-entrypoint.sh mongod   Up      0.0.0.0:27017->27017/tcp
eqreporting_web_1     npm run serve                 Up      0.0.0.0:8000->8000/tcp
```

### Import Scraped Data

With the database runnning inside the Docker container, we can now import the data we scraped earlier.

```bash
$ docker-compose exec web npm run import
```

You'll see something like this:

```bash
> eq-reporting@1.0.0 import /app
> node importer.js

John Smith +15552225454
Jane Doe +15552225454
[...]
```

Now we've got our server running and all the necessary data imported!

### Validating numbers

Since not all members will have cell numbers, you can run the `check-numbers.js` script to validate the numbers as cell phones with Twilio's API. This does cost a small amount per number, so if you'd prefer to do it manually that's also an option.

#### Automated

```bash
$ docker-compose exec web npm run check-numbers
```

#### Manually

For now you'll have to manually edit the MongoDB database to set the `numberType` field for each member to be `'mobile'`. Soon I'll have a bulk way to do this, and eventually I'll add a way to ignore this check entirely and send text messages regardless.

### Send and Receive a Message

Now let's actually do something with this bot! 🤖 To test it out you'll want to make it publically available (i.e., to the internet). We _could_ just deploy it to a server pretty that supports Docker, but an even quicker way to test is with [`ngrok`](https://ngrok.com/).

Install `ngrok`, and then run this command in a separate console window, so that the express server is still running.

```bash
$ ngrok http <PORT>   # replace <PORT> here with the NODE_PORT in your `.env` file
```

You should see some output that includes:

```
Forwarding                    http://6f5cd49f.ngrok.io -> localhost:8000
```

That URL is available to anyone now and will point directly to the app/server running on your computer! (Cool, eh?)

Now copy the ngrok URL `http://6f5cd49f.ngrok.io` (yours will be different) and paste it into your Twilio Messaging Service's **Inbound and Outbound Settings** sections as follows:

	Request URL:         http://6f5cd49f.ngrok.io/receive
	Status Callback URL: http://6f5cd49f.ngrok.io/status

Save the Messaging Service once you've done that.

⭐️ Now send a text message to your Messaging Service's number. If all works well, it should hit the server, look you up your phone number in the ward directory, and reply with a simple response! Try asking for your Home Teaching route by texting the message `route` to the bot.

### Troubleshooting

If you're not getting a text message in response, it might help to check the log output from the server.

```bash
$ docker-compose logs -f web
```

Running that command will give you a live feed of any logs from the server, and will let you know if there are any errors occuring.

### Deploying to Production

Coming soon.

