'use strict';

var _ = require('lodash');
var http = require('http');
var logging = require('log4js');
var net = require('net');
var Promise = require('bluebird');
var striptags = require('striptags');
var util = require('util');
var GpioPort = require('./gpio.js').GpioPort;

var log = logging.getLogger('lights');

_.extend(exports, {
    Light: Light,
    SainSmartWebRelay: SainSmartWebRelay,
});

function Light(pin, offValue, onValue) {
  var port = new GpioPort(pin, 'output');
  var self = this;
  this.init = init;
  this.enable = enable;
  this.disable = disable;
  this.pin = pin;
  this.toggle = toggle;

  function init() {
    return port.init()
      .tap(function() {
        self.value = port.initialValue;
      })
      .then(function() {
        return disable();
      });
  }
  function enable() {
    return set(onValue);
  }
  function disable() {
    return set(offValue);
  }
  function toggle() {
    return self.value ? disable() : enable();
  }
  function set(value) {
    log.trace('  gpio[%s] <--', self.pin, value);
    self.value = value === onValue ? 1 : 0;
    return port.write(value);
  }
}

function SainSmartWebRelay(url) {
    _.extend(this, {
        light: function light(relayId) {
            return new SainSmartWebLight(url, relayId);
        },
    });
}

function SainSmartWebLight(url, relayId) {
    var self = this;
    _.extend(this, {
        url: url,
        relayId: relayId,
        init: function init() {
        },
        disable: function disable() {
            return set(0);
        },
        enable: function enable() {
            return set(1);
        },
        toggle: function toggle() {
            return set(self.value ? 0 : 1);
        },
    });

    function set(value) {
        return new Promise(function(resolve, reject) {
            var commandId = (2 * relayId - 2 + (value ? 1 : 0)).toString();
            var commandUrl = url + '/' + _.padLeft(commandId, 2, '0').toString();
            log.info('set|%s ', value, commandUrl);

            var client = new net.Socket();
            client.connect(80, '192.168.143.22', function() {
            	log.debug('SainSmartWebLight|set|connect');
            	client.write('GET /30000/' +_.padLeft(commandId, 2, '0') + ' HTTP/1.1\n\n');
            });
            client.on('close', function() {
            	log.debug('SainSmartWebLight|set|close');
                resolve(value);
            });
            client.on('data', function(value) {
            	log.debug('SainSmartWebLight|set|data|', striptags(value.toString()).replace(/(?:&nbsp;?|\s)+/g, ' ').replace(/(Relay-|Change|Enter)/g, '\n$1'));
            	client.destroy();
            });
            client.on('error', function(error) {
            	log.debug('SainSmartWebLight|set|error|', error);
                reject(error);
            });
        }).then(function(value) {
            log.debug('SainSmartWebLight|set|success');
            self.value = value;
        });
    }
}
