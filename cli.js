var _ = require('lodash');
var Promise = require('bluebird');
var util = require('util');

var options = require('./options.js');

var log = require('./logging.js').log;
log.debug('Hapili is starting; options:\n', options);

var ArduinoNode = require('./nodes/arduino.js').Node;

var node = new ArduinoNode('hapili-arduino-4.al.qtort.com', undefined, 1);

var light = node.light(1);

return Promise
    .try(function() {
        return light.init();
    })
    .then(function() {
        // return process.exit();
    })
    .done();
