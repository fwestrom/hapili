'use strict';

var _ = require('lodash');
var Promise = require('bluebird');
var util = require('util');
var arduino = require('./nodes/arduino.js');
var buttons = require('./buttons.js');
var lights = require('./lights.js');
var logging = require('./logging.js');
var sainsmart = require('./sainsmart.js');
var Button = buttons.Button;
var VButton = buttons.VButton;
var Light = lights.Light;

var log = logging.getLogger('rooms');

var node1 = new arduino.Node('hapili-arduino-1', undefined, 1);
var node2 = new arduino.Node('hapili-arduino-2', undefined, 1);
var node3 = new arduino.Node('hapili-arduino-3', undefined, 1);
//var relay1 = new sainsmart.WebRelay('hapili-relay-1', 80, '/30000');
var relay1 = new sainsmart.WebRelay('192.168.1.4', 80, '/30000');

var power1 = node1.light(1);
var power2 = node1.light(2);

function initNodePower(powerSwitches, refresh) {
    powerSwitches = _.isArray(powerSwitches) ? powerSwitches : [powerSwitches];
    return Promise
        .each(powerSwitch, function(power) {
            log.info('init-node-power.off|', power.url);
            return power.disable();
        })
        .delay(50)
        .each(function(power) {
            log.info('init-node-power.on|', power.url);
            return power.enable();
        })
        .then(function(power) {
            log.info('init-node-power.ready|', _.map(power, function(x) { return x.url; }).join(', '));
        })
        .delay(300)
        .then(function(result) {
            return refresh ? refresh() : result;
        });
}
var initNodes = _.once(function() {
    function retryUntilSuccess(action) {
        var label = action.Name;
        return new Promise(function(resolve, reject) {
            tryAgain(1);
            function tryAgain(tryNum) {
                Promise
                    .try(function() {
                        return action();
                    })
                    .then(function() {
                        if (tryNum > 1) {
                            log.info('%s| succeded on try %s', label, tryNum);

                        resolve();
                    })
                    .catch(function(error) {
                        var lll = tryNum > 1 ? ' (lowering log level)' : '';
                        var logWrite = (tryNum % 100 == 1 ? log.warn : log.debug).bind(log);
                        logWrite('%s| try: %s%s, error:', label, tryNum, lll, error);
                        return Promise
                            .delay(5000)
                            .then(function() {
                                tryAgain(tryNum + 1);
                            });
                    })
                    .done();
            }
        });
    }
    return retryUntilSuccess(_.partial(initNodePower, [power1, power2]));
});

module.exports = {
    'Master Bedroom': {
        buttons: {
            1: new Button(7),
        },
        // lights: _.reduce([0, 3, 4], function(result, id, i) {
        //     return _.set(result, i + 1, node1.light(id));
        // }, {}),
        lights: {
            1: node2.light(15),
            2: node2.light(14),
            3: node2.light(13),
            4: node2.light(12),
            8: node1.light(3),
        },
        states: {
            0: [],
            1: [1, 2, 3],
            2: [1, 2, 3, 4],
            3: [1, 2, 3, 4, 5],
            4: [1],
            5: [2, 3],
            6: [3],
            7: [2],
        },
        setup: function(room) {
            room.buttons[1].on('press', function() {
                return room.states.next();
            });
            room.buttons[1].on('longpress', function() {
                return room.states.set(room.states.current !== 0 ? 0 : 3);
            });
            return initNodes()
                // .then(function() {
                //     return room.states.set(0);
                // })
                // .catch(function(error) {
                //     log.warn('master-bedroom.states.set| error:', error);
                // })
                .done();
        },
    },
    'Master Bathroom': {
        buttons: {
            1: new Button(7),
        },
        lights: _.reduce([0, 1, 8], function(result, id) {
            return _.set(result, id + 1, node2.light(id));
        }, {}),
        states: {
            0: [],
            1: [1],
            2: [1, 9],
        },
        setup: function(room) {
            room.buttons[1].on('press', function() {
                return room.states.next();
            });
            room.buttons[1].on('longpress', function() {
                return room.states.set(room.states.current !== 0 ? 0 : 3);
            });

            return initNodes()
                // .then(function() {
                //     return room.states.set(0);
                // })
                // .catch(function(error) {
                //     log.warn('master-bath.states.set| error:', error);
                // })
                .done();
        },
    },
    'Living Room': {
        buttons: {
            1: new VButton(),
        },
        lights: {
            1: node1.light(6),
            2: node1.light(7),
            3: node1.light(15),
        },
        states: {
            0: [],
            1: [1],
            2: [1, 2],
            3: [2],
        },
        setup: function(room) {
            room.buttons[1].on('press', function() {
                return room.states.next();
            });
            room.buttons[1].on('longpress', function() {
                return room.states.set(0);
            });

            return room.states.set(1);
        },
    },
    'Exterior Lighting': {
        buttons: {
            1: new VButton(),
        },
        lights: {
            1: node1.light(5),
        },
        states: {
            0: [],
            1: [1],
        },
        setup: function(room) {
            room.buttons[1].on('press', function() {
                return room.states.next();
            });
            room.buttons[1].on('longpress', function() {
                room.states.set(0);
            });

            return room.states.set(1);
        },
    },
    'System Power': {
        buttons: {
            1: new VButton(),
        },
        lights: {
            1: power1,
            2: power2,
        },
        states: {
            0: [],
            1: [1],
        },
        setup: function(room) {
            room.buttons[1].on('press', function() {
                return initNodePower([power1, power2]);
            });
        },
    },
};

log.debug('rooms:', module.exports);

var setupPromise = initNodes();
_.forEach(module.exports, function(room, name) {
    _.extend(room, {
        name: name,
        states: _.extend(room.states, {
            current: undefined,
            set: function setState(state) {
                var on = _.invoke(room.states[state] || room.states[state = 0], 'toString');
                room.states.current = state;
                log.debug('%s| State: %s, on:', name, state, on);
                return Promise.each(_.keys(room.lights), function(key) {
                    var light = room.lights[key];
                    var value = _.contains(on, key) ? 1 : 0;
                    log.debug('%s| Setting light: %s, value:', room.name, key, value);
                    return value ? light.enable() : light.disable();
                });
            },
            next: function next() {
                var states = _.without(_.keys(room.states), 'current', 'set', 'next', 'prev');
                var i = states.indexOf(room.states.current);
                var state =  _.first(_.drop(states, i + 1)) || _.first(states);
                return room.states.set(state);
            },
            prev: function prev() {
                var states = _.without(_.keys(room.states), 'current', 'set', 'next', 'prev');
                var i = states.indexOf(room.states.current);
                var state = i > 0 ? _.first(_.drop(states, i - 1)) : _.last(states);
                return room.states.set(state);
            },
        }),
    });
    _.forEach(room.buttons, function(value, key) {
        _.defaults(value, {
            name: key,
        });
        _.forEach(['press', 'longpress'], function(event) {
            log.debug('%s| button: %s, event: %s', room.name, key, event);
        });
    });
    _.forEach(room.lights, function(value, key) {
        _.defaults(value, {
            name: key,
        });
    });

    setupPromise = setupPromise.then(function() {
        return room.setup(room);
    });
});

setupPromise.done();
