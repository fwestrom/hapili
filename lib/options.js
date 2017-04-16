'use strict';

var _ = require('lodash');
var minimist = require('minimist');
var os = require('os');

module.exports = minimist(process.argv.slice(2), {
    default: {
        arch: os.arch() + '|' + os.platform(),
        ll: 'DEBUG',
        path: '/',
        port: 8080,
        'start-server': true,
        tickInterval: 20,
    },
});
