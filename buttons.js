'use strict';

var logging = require('log4js');
var Promise = require('bluebird');
var util = require('util');

var EventEmitter2 = require('./events2.js').EventEmitter2;
var GpioPort = require('./gpio.js').GpioPort;

var log = logging.getLogger('buttons');

util._extend(exports, {
    Button: Button,
    VButton: VButton,
});

util.inherits(RawButton, EventEmitter2);
function RawButton(pin) {
    EventEmitter2.call(this);

    this.init = init;
    this.pin = pin;
    this.poll = poll;

    var port = new GpioPort(pin, 'input');
    var self = this;

    function init() {
        return port.init()
            .tap(function() {
                self.value = port.initialValue;
            });
    }

    function poll() {
        return port.read()
            .then(function(value) {
                if (value !== self.value) {
                    self.value = value;
                    log.trace('  gpio[%s] -->', self.pin, value);
                    var event = value ? 'up' : 'down';
                    return self.emit(event)
                        .tap(function(anyListeners) {
                            if (!anyListeners) {
                                log.warn('WARNING: No listeners for input event; pin: %s, event: %s', self.pin, event);
                            }
                        });
                }
            });
    }
}

util.inherits(Button, RawButton);
function Button(pin) {
    RawButton.call(this, pin);

    var debouncing = false;
    var downTime;
    var pending = [];
    var self = this;

    this.press = press;
    this.longpress = longpress;

    this.on('down', function() {
        if (!debouncing) {
            downTime = new Date()
                .getTime();
        }
    });

    this.on('up', function() {
        if (!debouncing) {
            var elapsed = new Date()
                .getTime() - downTime;
            downTime = undefined;
            var event = elapsed > 250 ? 'longpress' : 'press';
            return self.emit(event)
                .tap(function(anyListeners) {
                    if (!anyListeners) {
                        log.warn('WARNING: No listeners for input event; pin: %s, event: %s', self.pin, event);
                    }
                })
                .then(function(anyListeners) {
                    debouncing = true;
                    return Promise.delay(100)
                        .finally(function() {
                            debouncing = false;
                        })
                        .return(anyListeners);
                });
        }
    });

    function press() {
        return self.emit('down')
            .then(function() {
                Promise.delay(110)
                    .then(function() {
                        return self.emit('up');
                    })
                    .done();
            });
    }

    function longpress() {
        return self.emit('down')
        .then(function() {
            Promise.delay(260)
                .then(function() {
                    return self.emit('up');
                })
                .done();
        });
    }
}

util.inherits(VButton, EventEmitter2);
function VButton() {
    EventEmitter2.call(this);

    var self = this;
    util._extend(this, {
        init: init,
        press: press,
        longpress: longpress,
    });

    function init() {
    }

    function press() {
        return self.emit('down')
            .then(function() {
                Promise.delay(110)
                    .then(function() {
                        return self.emit('up');
                    })
                    .then(function() {
                        return self.emit('press');
                    })
                    .done();
            });
    }

    function longpress() {
        return self.emit('down')
            .then(function() {
                Promise.delay(260)
                    .then(function() {
                        return self.emit('up');
                    })
                    .then(function() {
                        return self.emit('longpress');
                    })
                    .done();
            });
    }
}
