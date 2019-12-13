/**
 * Client for calling skilled-maps
 * 
 * Authors: Matt Schaub
 */

/*jslint node: true */
'use strict';

const config = require('../config/config.js');
const request = require('requestretry');

const cacheExpireTime = 86400000; // 1 day
const cache = require('memory-cache');

const http = require('http');

let agentOptions = {
  keepAlive: true,
  maxSockets: 25
};

const agent = new http.Agent(agentOptions);

function geocode(geocodeRequest) {
  return new Promise((resolve, reject) => {
    let cachedResult = cache.get(geocodeRequest);

    if(cachedResult) {
      resolve(cachedResult);
    } else {
      let url = config.skilledMaps.host + 'geocode?addresses=' + encodeURIComponent(geocodeRequest);
      let options = {
        agent: agent,
        url: url,
        json: true,
        headers: {
          'content-type': 'application/json',
        },
        maxAttempts: 60,
        retryDelay: 1000
      };

      request.get(options, (err, response, body) => {
        if(err) {
          reject(err);
        } else if(response.statusCode == 200) {
          cache.put(geocodeRequest, body, cacheExpireTime);
          resolve(body);
        } else {
          reject(response.statusMessage);
        }
      });
    }
  });
}

function addressToLatLon(address) {
  return new Promise((resolve, reject) => {
    let geocodeRequest = address.street + ', ' +
        address.city + ', ' +
        address.state + ' ' +
        (address.zip ? address.zip : address.zip_code);

    geocode(geocodeRequest).then((result) => {
      resolve({
        lat: result.geocoords[0].lat,
        lon: result.geocoords[0].lon
      });
    }).catch((err) => {
      reject(err);
    });
  });
}

function getDistanceMatrix(geocoords) {
  return new Promise((resolve, reject) => {
    let url = config.skilledMaps.host + 'distancematrix?coordinates=';

    geocoords.forEach((coord) => {
      url += coord.lat + ',' + coord.lon + ';';
    });

    // remove last semicolon
    url = url.slice(0, -1);

    let options = {
      agent: agent,
      url: url,
      json: true,
      headers: {
        'content-type': 'application/json',
      },
      maxAttempts: 10,
      retryDelay: 2000
    };

    let cachedResult = cache.get(url);

    if(cachedResult) {
      resolve(cachedResult);
    } else {
      request.get(options, (err, response, body) => {
        if(err) {
          reject(err);
        } else if(response.statusCode == 200) {
          cache.put(url, body, cacheExpireTime);
          resolve(body);
        } else {
          reject(response.statusMessage);
        }
      });
    }
  });
}

function getDirections(directionRequest) {
  return new Promise((resolve, reject) => {
    let url = config.skilledMaps.host + 'route/?coordinates=';
    directionRequest.waypoints.forEach((latLon) => {
      url += latLon.lat + ',' + latLon.lon + ';';
    });

    url = url.slice(0, -1);

    let options = {
      agent: agent,
      url: url,
      json: true,
      headers: {
        'content-type': 'application/json',
      },
      maxAttempts: 10,
      retryDelay: 2000
    };

    request.get(options, (err, response, body) => {
      if(err) {
        reject(err);
      } else if(response.statusCode == 200) {
        cache.put(url, body, cacheExpireTime);
        resolve(body);
      } else {
        reject(response.statusMessage);
      }
    });
  });
}

module.exports = {
  geocode: geocode,
  addressToLatLon: addressToLatLon,
  getDistanceMatrix: getDistanceMatrix,
  getDirections: getDirections,
};