'use strict';

var logging = require('log4js');
var GpioPort = require('./gpio.js').GpioPort;

var log = logging.getLogger('lights');

exports.Light = Light;

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
