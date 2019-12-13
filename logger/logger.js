/*
 *
 * Logger utility
 *
 * Author: Matt Schaub
 */

/*jslint node: true */
'use strict';

const config = require('../config/config');
const winston = require('winston');

const logger = new (winston.Logger)({
  transports: [
    new winston.transports.Console({
      json: false,
      timestamp: true,
      prettyPrint: function ( object ){return JSON.stringify(object, null, 2);},
      colorize: true}),
    new winston.transports.File({
      filename: __dirname + '/../logviewer.log',
      json: false,
      timestamp: true,
      prettyPrint: function ( object ){return JSON.stringify(object, null, 2);}})
  ],
  exceptionHandlers: [
    new winston.transports.Console({
      json: false,
      timestamp: true,
      prettyPrint: function ( object ){return JSON.stringify(object, null, 2);},
      colorize: true}),
    new winston.transports.File({
      filename: __dirname + '/../exceptions.log',
      json: false,
      timestamp: true,
      prettyPrint: function ( object ){return JSON.stringify(object, null, 2);}})
  ]
});

logger.transports.console.level = config.logViewer.logLevel;
logger.transports.file.level = config.logViewer.logLevel;

module.exports = logger;
