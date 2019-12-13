#!/usr/bin/node

/*jslint node: true */
'use strict';

/**
 *
 *
 */
// include the packages we need
const express = require('express');
const app = express(); 
const bodyParser = require('body-parser');

const config = require('./config/config.js');
const skilledMaps = require('./client/skilledMapsClient.js');

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser({ limit: '100mb' }));
app.use(bodyParser.json());
app.use(bodyParser.json({ type: 'application/json' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/geocode', (req, res) => {
  let request = req.body;

  skilledMaps.geocode(request).then((result) => {
    res.send(result);
  }).catch((err) => {
    res.status(500).send(err);
  });
});

app.post('/directions', (req, res) => {
  let request = req.body;

  skilledMaps.getDirections(request).then((response) => {
    response.timestamp = Date.now();
    res.send(response);
  }).catch((err) => {
    console.error(err);
    res.status(500).send(err);
  });
});

app.use(express.static('./public'));

// Start the server
app.listen(config.logViewer.port);
console.log('log viewer listening on localhost:' + config.logViewer.port);
