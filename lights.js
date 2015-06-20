'use strict';

var _ = require('lodash');
var http = require('http');
var net = require('net');
var Promise = require('bluebird');
var striptags = require('striptags');
var util = require('util');
var GpioPort = require('./gpio.js').GpioPort;
var logging = require('./logging.js');
var Pool = require('./pool.js').Pool;

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

function SainSmartWebRelay(host, port, path) {
    var initialized;
    var pool = new Pool();
    pool.init({});

    _.extend(this, {
        light: function light(relayId) {
            return new SainSmartWebLight({ init: init, set: set }, relayId);
        },
    });

    function init() {
        if (initialized) return;
        initialized = true;
        log.debug('init| %s:%s%s', host, port, path);
        return httpGet()
            .then(function(response) {
                log.debug('init|success|');
            })
            .catch(function(error) {
                log.error('init| failed; error:', error);
                initialized = false;
            });
    }

    function set(id, value) {
        var commandId = (2 * id - 2 + value).toString();
        return httpGet('/' + _.padLeft(commandId, 2, '0'));
    }

    function httpGet(pathTail) {
        return pool.get().then(function(token) {
            var sock = new net.Socket({ allowHalfOpen: true });
            return new Promise(
                function resolver(resolve, reject) {
                    var response;
                    var result = {};
                    log.debug('httpGet|connecting| host: %s, port: %s', host, port);
                    sock.connect(port, host, function() {
                        log.debug('httpGet|connected|');
                        setTimeout(function() {
                            var request = 'GET ' + path + (pathTail || '') + ' HTTP/1.1\n\n';
                            log.debug('httpGet|send|', request);
                            sock.write(request, function() {
                                log.debug('httpGet|sent|');
                            });
                        }, 50);

                    });
                    sock.setTimeout(1000, function ontimeout() {
                        onerror(new Error('Timed out while waiting for response.'));
                        sock.destroy();
                    })
                    sock.on('data', function ondata(data) {
                        log.debug('httpGet|recv| bytes: %s', data.length);
                        response = (response || '') + data.toString();
                    });
                    sock.on('end', function onend() {
                        log.debug('httpGet|end|');
                        sock.end();
                    });
                    sock.on('close', function onclose() {
                        log.debug('httpGet|close|');
                        var error = result.error || (!response ? new Error('The connection was closed unexpectedly.') : undefined);
                        sock.destroy();
                        return error ? reject(error) : resolve(response);
                    });
                    sock.on('error', onerror);
                    function onerror(error) {
                        log.debug('httpGet|error|', error);
                        result.error = error;
                    }
                })
                .then(function(response) {
                    log.debug('httpGet| response:', striptags(response.toString()).replace(/(?:&nbsp;?|\s)+/g, ' ').replace(/(Relay-|Change|Enter)/g, '\n$1'));
                    return response;
                })
                .finally(function() {
                    return Promise.delay(250)
                        .finally(function() {
                            return pool.release(token);
                        })
                        .done();
                });
        });
    }
}

function SainSmartWebLight(relay, relayId) {
    _.extend(this, {
        value: 0,
        relayId: relayId,
        init: function init() {
            return relay.init();
        },
        disable: function disable() {
            return set(relayId, 0);
        },
        enable: function enable() {
            return set(relayId, 1);
        },
        toggle: function toggle() {
            return set(self.value ? 0 : 1);
        },
    });

    var self = this;
    function set(value) {
        self.value = value;
        return relay.set(relayId, value);
    }
}
