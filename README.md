## EQ Reporting
Automated Home Teaching Reports

This is a simple Node / Express app for the purpose of collecting [home teaching](https://www.lds.org/topics/home-teaching?lang=eng&old=true) reports from your quorum members. It does this by sending and responding to **text messages sent with the [Twilio](http://twilio.com) API.**

**⚠ Warning this is still a work in progress and very unfinished!**

---

## You will need:

- A [Twilio Account](http://twilio.com)
	- You can use the free option, but they'll prepend text to your messages.
	- Make a note of your Account SID and Auth Token on the Twilio console page, you'll need them later.
	- Finally, set up a new **Messaging Service** under the **Programmable SMS** section. Note the `SID` of the service once it's created, you'll also need it later.
- An [LDS Account](http://lds.org) with access rights to [Home Teaching data](http://lds.org/htvt/)
	- E.g., You'll have to be in the Elders Quorum or have another leadership calling.
- `node -v` >= 7
- [Yarn](https://yarnpkg.com/en/) or NPM
- [`ngrok`](https://ngrok.com/)
- (optional) [Docker for Mac](https://docs.docker.com/docker-for-mac/) or [Windows](https://docs.docker.com/docker-for-windows/); to pull a MongoDB image and run it locally.
	- Alternatively you can install MongoDB right onto your machine.

---

## Setup instructions

First, clone the repository down and jump inside:

```bash
$ git clone git@github.com:hamstu/eq-reporting.git
$ cd eq-reporting
```

Install the dependencies:

```bash
$ yarn
```

Or if you're using `npm` instead:

```bash
$ npm install
```

Then, open `example.env` in the project's folder, and add your details:

```bash
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_MESSAGING_SERVICE_ID=...
LDS_ACCOUNT_USERNAME=YOURUSERNAME
LDS_ACCOUNT_PASSWORD=YOURPASSWORD
MONGO_DB_URL=mongodb://localhost:27017/eqreporting
PORT=8080
```

Then rename the file to `.env`. (`.env` is already in the `.gitignore` and so will not be commited to any repository.)

Now start the MongoDB container if you're choosing to do it the Docker way.

```bash
$ docker pull mongo
$ docker run --name mongo -d -p 127.0.0.1:27017:27017 mongo
```

If you're not running MongoDB with Docker, then ensure it's running on your machine on port `27017`.

Now we'll scrape the data we need from [LDS.org](http://lds.org) (ward directory and Home Teaching assignments).

```bash
$ npm run scrape
```

And now let's import all that lovely scraped data into MongoDB:

```bash
$ npm run import
```

Now with that done you're ready to start the express server!

```bash
$ npm run serve
```

This should start `nodemon`, which will watch your files and restart the server if anything changes.

Now let's actually do something with this server. To test it out you'll want to make it publically available (i.e., to the internet). One of the easiest ways to do this is with [`ngrok`](https://ngrok.com/).

Install `ngrok`, and then run this command in a separate console window, so that the express server is still running.

```bash
$ ngrok http <PORT>   # replace <PORT> here with the PORT in your `.env` file
```

You should see some output that includes:

```
Forwarding                    http://6f5cd49f.ngrok.io -> localhost:8000
```

That URL is available to anyone now and will point directly to your local server! (Cool, eh?)

Now copy the ngrok URL `http://6f5cd49f.ngrok.io` (yours will be different) and paste it into your Twilio Messaging Service's _Inbound and Outbound Settings_ sections as follows:

	Request URL:         http://6f5cd49f.ngrok.io/receive
	Status Callback URL: http://6f5cd49f.ngrok.io/status

Save the Messaging Service.

Now send a text message to your Messaging Service's number. If all works well, it should hit the server, look you up in the ward directory, and reply with a simple response!

**⚠ As mentioned, this is still very much a work in progress. The actual reporting doesn't work yet, more updates coming soon.**