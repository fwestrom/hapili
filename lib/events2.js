'use strict';

var EventEmitter = require('events').EventEmitter;
var Promise = require('bluebird');
var util = require('util');

exports.EventEmitter2 = EventEmitter2;

util.inherits(EventEmitter2, EventEmitter);

function EventEmitter2() {
    EventEmitter.call(this);

    var self = this;
    this.emit = emit;

    function emit(event, a1, a2, a3) {
        var listeners = self.listeners(event);
        return Promise
            .map(listeners, function (listener) {
                return listener(a1, a2, a3);
            }, { concurrency: 1 })
            .return(listeners.length > 0);
    }
}
