'use strict';

var _ = require('lodash');
var Promise = require('bluebird');
var logging = require('./logging.js');

_.extend(exports, {
    Pool: Pool,
});

function Pool() {
    var log = logging.getLogger('Pool');
    var pool = [];
    var waiting = [];

    _.extend(this, {
        init: init,
        get: get,
        release: release,
    });

    function init(value) {
        var values = arguments.length != 1 || !_.isArray(value) ? Array.prototype.slice.apply(arguments) : value;
        //log.debug('init| adding:', values.length);
        _.forEach(values, function(x) {
            pool.push(x);
        });
        //log.debug('init| available: %s, waiting: %s', pool.length, waiting.length, '\n',pool);
    }

    function get() {
        return new Promise(function(resolve, reject) {
            //log.debug('pre-get| available: %s, waiting: %s', pool.length, waiting.length);
            if (pool.length > 0) {
                return resolve(pool.pop());
            }
            log.warn('get| empty pool, waiting')
            waiting.push(resolve);
        });
    }

    function release(obj) {
        if (waiting.length > 0) {
            log.debug('get| releasing wait');
            var resolve = waiting.shift();
            resolve(obj);
        }
        else {
            pool.push(obj);
        }
        //log.debug('post-release| available: %s, waiting: %s', pool.length, waiting.length);
    }
}
