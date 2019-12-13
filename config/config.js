/*
 *
 * Utility for reading config files
 *
 * Author: Matt Schaub
 */

/*jslint node: true */
'use strict';
const fs = require('fs');
const configFile = 'config/config.json';
const UTF8 = 'utf8';

var data = fs.readFileSync(configFile, UTF8);
const config = JSON.parse(data);

module.exports = config;
