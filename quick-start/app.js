
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

let subscribers = {};
let addresses = {};

'use strict';
const PAGE_ACCESS_TOKEN = "<TOKEN>";
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
  const VERIFY_TOKEN = "<TOKEN>";

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
    let match = received_message.text.match(/([a-zA-Z]*)\s?([a-zA-Z0-9]*)/);
    if (!match) {
      response = {
        "text": "Invalid request"
      }
      callSendAPI(sender_psid, response);
    } else if (match[1] == 'Balance') {
      let address = match[2];
      if (address != null && address != "") {
        addresses[sender_psid] = address;
      } else {
        address = addresses[sender_psid];
      }
      console.log("Balance Address: " + address);
      getBalance(address, balance => {
        callSendAPI(sender_psid, {
          "text": "Your balance is BTC " + balance/100000000 + ".",
        });
      });
    } else if (match[1] == 'Transactions') {
        let address = match[2];
        if (address != null && address != "") {
          addresses[sender_psid] = address;
        } else {
          address = addresses[sender_psid];
        }
        console.log("Transaction Address: " + address);
        getTransactions(address, transactions => {
          callSendAPI(sender_psid, {
            "text": "Your recent transactions " + formatTransactions(transactions),
          });
        });
    } else if (match[1] == 'Subscribe') {
      subscribers[sender_psid] = true;
        callSendAPI(sender_psid, {
          "text": "Thank you for subscription.",
        });
    } else if (match[1] == 'Unsubscribe') {
      delete subscribers[sender_psid];
        callSendAPI(sender_psid, {
          "text": "Thank you for using our service.",
        });
    }
    //callSendAPI(sender_psid, response);
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



function getBalance(address, callback) {
const query = `query ($address: String!) {
  accountByAddress(address: $address) {
    address
    balance
    pubKey
    scriptType
    subKeys
  }
}`;
  const variables = { address: address };
  graphql('https://ocap.arcblock.io/api/btc', query, variables).then(data => {
    callback(data.accountByAddress.balance);
  })
}

function getTransactions(address, callback) {
  const query = `query ($address: String!) {
    accountByAddress(address: $address) {
      txsReceived {
        data {
          total
          blockHeight
        }
      }
      txsSent {
        data {
          total
          blockHeight
        }
      }
    }
  }`;
    const variables = { address: address };
    graphql('https://ocap.arcblock.io/api/btc', query, variables).then(data => {
      let transactions = {
        received: data.accountByAddress.txsReceived.data,
        sent: data.accountByAddress.txsSent.data,
      };
      callback(transactions);
    })
  }

function formatTransactions(txs) {
  let result = "\n";
  for (let i in txs.received) {
    result += "Received BTC " + txs.received[i].total / 100000000 + " at Block " + txs.received[i].blockHeight + "\n";
  }
  for (let i in txs.sent) {
    result += "Sent BTC " + txs.sent[i].total / 100000000 + " at Block " + txs.sent[i].blockHeight + "\n";
  }
  return result;
}

// Web socket
let Socket = require('phoenix-channels').Socket;
let socket = new Socket("wss://ocap.arcblock.io/api/socket") ;

socket.connect();

// Now that you are connected, you can join channels with a topic:
let channel = socket.channel('__absinthe__:control');

const query = "subscription { \n  newBlockMined { \n    hash\n }\n}";

channel.join()
  .receive("ok", resp => {
    console.log("Joined successfully", resp)
    channel.push("doc", { query: query })
      .receive("ok", resp => {
        console.log(resp);
        channel.on(resp, resp => {
          console.log(resp);
        })
      })
  })
  .receive("error", resp => { console.log("Unable to join", resp) })

socket.onMessage(({ event, payload, ref }) => {
  if (event === "subscription:data") {
    console.log(payload.result.data);
    for (let id in subscribers) {
      callSendAPI(id, {
        "text": JSON.stringify(payload.result.data),
      });
    }
  }
});


getBalance('1F1tAaz5x1HUXrCNLbtMDqcw6o5GNn4xqX', balance => console.log(balance));
getTransactions('1F1tAaz5x1HUXrCNLbtMDqcw6o5GNn4xqX', txs => console.log(formatTransactions(txs)));
