'use strict';

var _ = require('lodash');
var Promise = require('bluebird');
var util = require('util');

var options = require('./options.js');
var rooms = require('./rooms.js');
var webServer = require('./web-server.js');

var log = require('./logging.js').log;
log.debug('Hapili is starting; options:\n', options);

var everything = _(rooms)
    .map(_.partialRight(_.pick, ['buttons', 'lights']))
    .map(_.values)
    .flatten()
    .map(_.values)
    .flatten()
    .sortBy('pin')
    .value();

var toPoll = _(everything)
    .filter('poll')
    .toArray()
    .value();

log.trace('everything:', everything);
log.trace('toPoll:', toPoll);
Promise
    .each(everything, function(x) {
        return x.init();
    })
    .then(function() {
        if (options['start-server']) {
            var server = webServer.create(options);
            server.register('/api', rooms);
            return server.start().done();
        }
    })
    .tap(function() {
        log.info('Ready.');
    })
    .then(setNextTick)
    .catch(onError)
    .done();

function onError(error) {
    log.error('--\nError:', error, '\n--');
    throw error;
}

function onTick() {
    Promise
        .each(toPoll, function(pollable) {
            return pollable.poll();
        })
        .catch(onError)
        .finally(setNextTick)
        .done();
}

function setNextTick() {
    setTimeout(onTick, options.tickInterval);
}
