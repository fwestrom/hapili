'use strict';

var _ = require('lodash');
var Promise = require('bluebird');
var exec = Promise.promisify(require('child_process').exec);
var fs = Promise.promisifyAll(require('fs'));
var util = require('util');

var log = require('./logging.js').getLogger('gpio');
var options = require('./options.js');

module.exports = exports = {
    GpioPort: { 'arm|linux': WpiGpioPort }[options.arch] || FakeGpioPort,
    FakeGpioPort: FakeGpioPort,
    PiGpioPort: PiGpioPort,
    WpiGpioPort: WpiGpioPort,
};

if (exports.GpioPort === FakeGpioPort) {
    log.warn('WARNING: Using FakeGpioPort for GpioPort!');
}

function FakeGpioPort(pin, options) {
    var self = this;
    util._extend(this, {
        options: options,
        pin: pin,
        init: function() {
            self.initialValue = self.value = 0;
            log.trace('Initialized fake GPIO pin %s, initial value:', self.pin, self.initialValue);
            return Promise.resolve();
        },
        open: function() {
            return Promise.resolve();
        },
        read: function() {
            return Promise.resolve(self.value);
        },
        write: function(value) {
            self.value = value;
            return Promise.resolve();
        },
        close: function() {
            return Promise.resolve();
        },
    });
}

function PiGpioPort(pin, options) {
    var gpio = PiGpioPort.gpio;
    if (!gpio) {
        gpio = PiGpioPort.gpio = Promise.promisifyAll(require('pi-gpio'));
    }

    var self = this;
    util._extend(this, {
        options: options,
        pin: pin,
        pinPath: '/sys/class/gpio/gpio' + pin + '/',
        init: init,
        open: open,
        read: read,
        write: write,
        close: close,
    });

    function init() {
        log.debug('Initializing GPIO pin %s', pin);
        return self.close()
            .delay(500)
            .catch(function(error) {
                log.warn('Init warning: error closing GPIO pin %s:', self.pin, error.toString());
            })
            .then(function() {
                log.trace('Opening GPIO pin %s', pin);
                return self.open()
                    .delay(500)
                    .then(function() {
                        log.trace('Opened GPIO pin %s', self.pin);
                        return self.read();
                    })
                    .tap(function(value) {
                        self.initialValue = value;
                        log.debug('Opened GPIO pin %s, initial value:', self.pin, self.initialValue);
                    });
            });
    }

    function open() {
        if (gpio) {
            return gpio.openAsync(self.pin, options);
        }
        else {
            return fs.writeFileAsync('/sys/class/gpio/export', '' + self.pin)
                .delay(500)
                .then(function() {
                    return fs.writeFileAsync(self.pinPath + 'direction', options);
                });
        }
    }

    function read() {
        if (gpio) {
            return gpio.readAsync(self.pin);
        }
        else {
            return fs.readFileAsync(self.pinPath + 'value')
                .then(function(result) {
                    return result.toString().trim();
                });
        }
    }

    function write(value) {
        if (gpio) {
            return gpio.writeAsync(self.pin, value);
        }
        else {
            return fs.writeFileAsync(self.pinPath + 'value', value);
        }
    }

    function close() {
        if (gpio) {
            return gpio.closeAsync(pin);
        }
        else {
            return fs.writeFileAsync('/sys/class/gpio/unexport', '' + self.pin);
        }
    }
}

function WpiGpioPort(pin, options) {
    var wpi = WpiGpioPort.wpi;
    if (!wpi) {
        wpi = WpiGpioPort.wpi = require('wiring-pi');
        wpi.setup('wpi');
    }

    pin = WpiGpioPort.pinMap[pin] || undefined;
    if (pin === undefined) {
        throw new Error('Unable to map gpio pin to wiring-pi.');
    }

    var self = this;
    util._extend(this, {
        options: options,
        pin: pin,
        init: init,
        read: read,
        write: write,
        close: close,
    });

    function init() {
        log.debug('Initializing GPIO pin %s', pin);
        return Promise
            .try(function() {
                var mode = options === 'input' || options == 'in' ? wpi.INPUT : wpi.OUTPUT;
                wpi.pinMode(self.pin, mode);
            })
            .then(function() {
                log.trace('Opened GPIO pin %s', self.pin);
                return self.read();
            })
            .tap(function(value) {
                self.initialValue = value;
                log.debug('Opened GPIO pin %s, initial value:', self.pin, self.initialValue);
            });
    }

    function read() {
        var value = wpi.digitalRead(self.pin);
        return Promise.resolve(value);
    }

    function write(value) {
        wpi.digitalWrite(self.pin, value);
        return Promise.resolve(value);
    }

    function close() {
        return Promise.resolve(self);
    }
}
WpiGpioPort.pinMap = {
    // +-----+-----+---------+------+---+--B Plus--+---+------+---------+-----+-----+
    // | BCM | wPi |   Name  | Mode | V | Physical | V | Mode | Name    | wPi | BCM |
    // +-----+-----+---------+------+---+----++----+---+------+---------+-----+-----+
    // |     |     |    3.3v |      |   |  1 || 2  |   |      | 5v      |     |     |
    // |   2 |   8 |   SDA.1 |   IN | 1 |  3 || 4  |   |      | 5V      |     |     |
    // |   3 |   9 |   SCL.1 |   IN | 1 |  5 || 6  |   |      | 0v      |     |     |
    // |   4 |   7 | GPIO. 7 |  OUT | 1 |  7 || 8  | 1 | OUT  | TxD     | 15  | 14  |
    // |     |     |      0v |      |   |  9 || 10 | 1 | OUT  | RxD     | 16  | 15  |
    // |  17 |   0 | GPIO. 0 |   IN | 0 | 11 || 12 | 1 | OUT  | GPIO. 1 | 1   | 18  |
    // |  27 |   2 | GPIO. 2 |  OUT | 1 | 13 || 14 |   |      | 0v      |     |     |
    // |  22 |   3 | GPIO. 3 |  OUT | 1 | 15 || 16 | 1 | OUT  | GPIO. 4 | 4   | 23  |
    // |     |     |    3.3v |      |   | 17 || 18 | 1 | OUT  | GPIO. 5 | 5   | 24  |
    // |  10 |  12 |    MOSI |  OUT | 1 | 19 || 20 |   |      | 0v      |     |     |
    // |   9 |  13 |    MISO |   IN | 0 | 21 || 22 | 1 | OUT  | GPIO. 6 | 6   | 25  |
    // |  11 |  14 |    SCLK |   IN | 0 | 23 || 24 | 0 | OUT  | CE0     | 10  | 8   |
    // |     |     |      0v |      |   | 25 || 26 | 1 | IN   | CE1     | 11  | 7   |
    // |   0 |  30 |   SDA.0 |   IN | 1 | 27 || 28 | 0 | OUT  | SCL.0   | 31  | 1   |
    // |   5 |  21 | GPIO.21 |  OUT | 1 | 29 || 30 |   |      | 0v      |     |     |
    // |   6 |  22 | GPIO.22 |  OUT | 1 | 31 || 32 | 1 | OUT  | GPIO.26 | 26  | 12  |
    // |  13 |  23 | GPIO.23 |   IN | 0 | 33 || 34 |   |      | 0v      |     |     |
    // |  19 |  24 | GPIO.24 |   IN | 0 | 35 || 36 | 0 | OUT  | GPIO.27 | 27  | 16  |
    // |  26 |  25 | GPIO.25 |  OUT | 1 | 37 || 38 | 0 | IN   | GPIO.28 | 28  | 20  |
    // |     |     |      0v |      |   | 39 || 40 | 0 | IN   | GPIO.29 | 29  | 21  |
    // +-----+-----+---------+------+---+----++----+---+------+---------+-----+-----+
    // | BCM | wPi |   Name  | Mode | V | Physical | V | Mode | Name    | wPi | BCM |
    // +-----+-----+---------+------+---+--B Plus--+---+------+---------+-----+-----+
    3: 8,
    5: 9,
    7: 7,
    8: 15,
    10: 16,
    11: 0,
    12: 1,
    13: 2,
    15: 3,
    16: 4,
    18: 5,
    19: 12,
    21: 13,
    22: 6,
    23: 14,
    24: 10,
    26: 11,
    29: 21,
    31: 22,
    32: 26,
    33: 23,
    35: 24,
    36: 27,
    37: 25,
    38: 28,
    40: 29,
};
