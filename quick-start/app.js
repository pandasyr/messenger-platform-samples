
/**
 * Copyright 2017-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Messenger Platform Quick Start Tutorial
 *
 * This is the completed code for the Messenger Platform quick start tutorial
 *
 * https://developers.facebook.com/docs/messenger-platform/getting-started/quick-start/
 *
 * To run this code, you must do the following:
 *
 * 1. Deploy this code to a server running Node.js
 * 2. Run `npm install`
 * 3. Update the VERIFY_TOKEN
 * 4. Add your PAGE_ACCESS_TOKEN to your environment vars
 *
 */

'use strict';
const PAGE_ACCESS_TOKEN = "EAAX0gaT48FsBAAr4UAz2zdKYQMzeWyqA8Pjk7IRfBZCKZBeqEnLsB9qBxaUezws98hVFQAgPPJrRMRi9DL9eXPY819Uz8xG5vdx9MdcVhJqAalmZAd0qs8GB1bSaOc5OZA81ZA6UB0jKMvaBzo7VMMk9OhZAqOaO1mHDvPvDZCbRQZDZD";
// Imports dependencies and set up http server
const
  request = require('request'),
  express = require('express'),
  body_parser = require('body-parser'),
  app = express().use(body_parser.json()); // creates express http server

// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log('webhook is listening'));

// Accepts POST requests at /webhook endpoint
app.post('/webhook', (req, res) => {

  // Parse the request body from the POST
  let body = req.body;

  // Check the webhook event is from a Page subscription
  if (body.object === 'page') {

    body.entry.forEach(function(entry) {

      // Gets the body of the webhook event
      let webhook_event = entry.messaging[0];
      console.log(webhook_event);


      // Get the sender PSID
      let sender_psid = webhook_event.sender.id;
      console.log('Sender ID: ' + sender_psid);

      // Check if the event is a message or postback and
      // pass the event to the appropriate handler function
      if (webhook_event.message) {
        handleMessage(sender_psid, webhook_event.message);
      } else if (webhook_event.postback) {

        handlePostback(sender_psid, webhook_event.postback);
      }

    });
    // Return a '200 OK' response to all events
    res.status(200).send('EVENT_RECEIVED');

  } else {
    // Return a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }

});

// Accepts GET requests at the /webhook endpoint
app.get('/webhook', (req, res) => {

  /** UPDATE YOUR VERIFY TOKEN **/
  const VERIFY_TOKEN = "EAAX0gaT48FsBAAr4UAz2zdKYQMzeWyqA8Pjk7IRfBZCKZBeqEnLsB9qBxaUezws98hVFQAgPPJrRMRi9DL9eXPY819Uz8xG5vdx9MdcVhJqAalmZAd0qs8GB1bSaOc5OZA81ZA6UB0jKMvaBzo7VMMk9OhZAqOaO1mHDvPvDZCbRQZDZD";

  // Parse params from the webhook verification request
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];

  // Check if a token and mode were sent
  if (mode && token) {

    // Check the mode and token sent are correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {

      // Respond with 200 OK and challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);

    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
});

// Accepts GET requests at the /webhook endpoint
app.get('/healthcheck', (req, res) => {
      res.sendStatus(200);
    });

function handleMessage(sender_psid, received_message) {
  let response;

  // Checks if the message contains text
  if (received_message.text) {
    // Create the payload for a basic text message, which
    // will be added to the body of our request to the Send API
    console.log("TEXT: " + received_message.text);
    let match = received_message.text.match(/^Balance\s(.*)$/);
    if (!match) {
      response = {
        "text": "Invalid request"
      }
      callSendAPI(sender_psid, response);
    } else {
      let address = match[1];
      console.log("Address: " + address);
      response = {
        "text": `You sent the message: "${received_message.text}". Now send me an attachment!`
      }
      getBalance(address, balance => callSendAPI(sender_psid, {
        "text": "Your balance is " + balance
      }));
    }
    //callSendAPI(sender_psid, response);
  } else {
    res.sendStatus(200);
  }
}

function handlePostback(sender_psid, received_postback) {
  console.log('ok')
   let response;
  // Get the payload for the postback
  let payload = received_postback.payload;

  // Set the response based on the postback payload
  if (payload === 'yes') {
    response = { "text": "Thanks!" }
  } else if (payload === 'no') {
    response = { "text": "Oops, try sending another image." }
  }
  // Send the message to acknowledge the postback
  callSendAPI(sender_psid, response);
}

function callSendAPI(sender_psid, response) {
  // Construct the message body
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message": response
  }

  // Send the HTTP request to the Messenger Platform
  request({
    "uri": "https://graph.facebook.com/v2.6/me/messages",
    "qs": { "access_token": PAGE_ACCESS_TOKEN },
    "method": "POST",
    "json": request_body
  }, (err, res, body) => {
    if (!err) {
      console.log('message sent!')
    } else {
      console.error("Unable to send message:" + err);
    }
  });
}

const graphql = require('graphql-request').request;

const query = `query ($address: String!) {
  accountByAddress(address: $address) {
    address
    balance
    pubKey
    scriptType
    subKeys
  }
}`;


function getBalance(address, callback) {
  const variables = { address: '1F1tAaz5x1HUXrCNLbtMDqcw6o5GNn4xqX' };
  graphql('https://ocap.arcblock.io/api/btc', query, variables).then(data => {
    //console.log(JSON.stringify(data));
    callback(data.accountByAddress.balance);
  })
}

getBalance('1F1tAaz5x1HUXrCNLbtMDqcw6o5GNn4xqX', balance => console.log(balance));
