'use strict';

var _ = require('lodash');
var Promise = require('bluebird');

var Button = require('./buttons.js').Button;
var VButton = require('./buttons.js').VButton;
var Light = require('./lights.js').Light;
var log = require('./logging.js').log;

module.exports = {
    'Master Bedroom': {
        buttons: {
            1: new Button(7),
        },
        lights: {
            1: new Light(8, 1, 0),
            2: new Light(10, 1, 0),
            3: new Light(12, 1, 0),
            4: new Light(16, 1, 0),
            5: new Light(18, 1, 0),
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
                room.states.set(room.states.current !== 0 ? 0 : 3);
            });
            room.states.set(0).done();
        },
    },
    'Living Room': {
        buttons: {
            1: new VButton(),
        },
        lights: {
            1: new Light(32, 1, 0),
            2: new Light(36, 1, 0),
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
                room.states.set(0);
            });
            room.states.set(0);
        },
    },
    'Exterior Lighting': {
        buttons: {
            1: new VButton(),
        },
        lights: {
            1: new Light(22, 1, 0),
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
            room.states.set(0);
        },
    },
};

log.debug('rooms:', module.exports);

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
    room.setup(room);
});
