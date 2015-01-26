'use strict';

var log4js = require('log4js');
var options = require('./options.js');

log4js.configure({
    appenders: [{ type: "console" }],
    levels: { '[all]': options.ll },
    replaceConsole: true,
});

var log = log4js.getLogger('hapili');

module.exports = {
    getLogger: log4js.getLogger.bind(log4js),
    log: log,
};
