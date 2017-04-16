'use strict';

var _ = require('lodash');
var Promise = require('bluebird');
var dgram = require('dgram');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var logging = require('../logging.js');
Promise.promisifyAll(dgram);

_.extend(exports, {
    Node: RemoteUdpNode,
});

util.inherits(RemoteUdpNode, EventEmitter);
function RemoteUdpNode(host, port, offValue) {
    EventEmitter.call(this);
    var initialized;
    var log = logging.getLogger('remote-udp-node');
    var sendCount = 0;
    var events = this;
    var sock = dgram.createSocket('udp4');
    var state = {};
    var waiting = [];
    port = port || 16666;

    _.extend(this, _.bindAll({
        url: 'hapili://' + host + ':' + port,
        light: function light(id) {
            return _.bindAll(_.extend(new RemoteUdpNodeLight(id, {
                init: init.bind(this),
                set: set,
                off: offValue || 0,
                on: offValue !== undefined
                    ? offValue ? 0 : 1
                    : 1,
            }), {
                url: 'hapili://' + host + ':' + port + '/' + id,
            }));
        },
        refresh: function() {
            log.debug('refresh| %s:%s', host, port);
            return bindPromise
                .then(function() {
                    return call(0);
                })
                .catch(function(error) {
                    log.warn('refresh|error| node: %s, error:', this.url, error);
                }.bind(this))
                .then(function() {
                    log.debug('refresh|success| %s:%s', host, port);
                });
        },
    }));

    sock.on('close', function onclose(error) {
        log.debug('close|');
    });

    sock.on('error', function onerror(error) {
        log.warn('error|', error);
        this.emit('error', error);
        _.forEach(_.pull(waiting, waiting), function(token) {
            token.reject(error);
        });
        sock.close();
    }.bind(this));

    sock.on('message', function onmessage(buf, from) {
        var verison = buf.readUInt8(0);
        var msgId = buf.readUInt16BE(1);
        var type = buf.readUInt8(3);
        var stateText = '';
        for (var i = 0; i < buf.length - 4; i++) {
            var value = buf.readUInt8(4 + i);
            state[i] = value;
            stateText += value;
        }
        log.debug('recv| from: %s:%s, msgId: %s, type: %s, nbytes: %s', from.address, from.port, msgId, type, buf.length, buf, stateText);
        if (type === 128) {
            _.forEach(_.remove(waiting, { msgId: msgId }), function(token) {
                clearTimeout(token.timeout);
                token.resolve();
            });
        }
    });

    var bindPromise = new Promise(function(resolve, reject) {
        sock.once('error', reject);
        sock.bind(0, function() {
            sock.removeListener('error', reject);
            var sa = sock.address();
            log.debug('bind|success| %s:%s', sa.address, sa.port);
            resolve();
        });
    });

    function init() {
        if (initialized) return;
        initialized = true;
        log.debug('init| %s:%s', host, port);
        return bindPromise
            .then(function() {
                return call(0);
            })
            .catch(function(error) {
                log.warn('init|error| node: %s, error:', this.url, error);
            }.bind(this))
            .then(function() {
                log.debug('init|success| %s:%s', host, port);
            });
    }

    function call(msgType) {
        var buf = new Buffer(3 + arguments.length)
        var msgId = ++sendCount;
        buf.writeUInt8(1, 0);
        buf.writeUInt16BE(msgId, 1);
        for (var i = 0; i < arguments.length; i++) {
            buf.writeUInt8(arguments[i], 3 + i);
        }
        log.debug('send| to: %s:%s, msgId: %s, nbytes: %s', host, port, msgId, buf.length, buf);
        return bindPromise
            .then(function() {
                return Promise.all([
                    new Promise(function(resolve, reject) {
                        var token = {
                            msgId: msgId,
                            reject: reject,
                            resolve: resolve,
                            timeout: setTimeout(function() {
                                _.pull(token);
                                reject(new Error('Time out while waiting for reply.'));
                            }, 1000),
                        };
                        waiting.push(token);
                    }),
                    sock.sendAsync(buf, 0, buf.length, port, host),
                ]);
            });
    }

    function set(id, value) {
        return call(1, id, value)
            .then(function() {
                return state[id];
            })
            .catch(function(error) {
                log.debug('set| node: %s:%s id: %s, value: %s, error:', host, port, id, value, error);
                throw error;
            });
    }
}

function RemoteUdpNodeLight(id, opts) {
    var log = logging.getLogger('remote-udp-node-light');
    var me = this;
    _.extend(this, _.bindAll({
        id: id,
        value: 0,
        init: function init() {
            return opts.init();
        },
        disable: function disable() {
            return opts.set(id, opts.off)
                .then(function(value) {
                    if (value === opts.off)
                        me.value = 0;
                    return me.value;;
                });
        },
        enable: function enable() {
            return opts.set(id, opts.on)
                .then(function(value) {
                    if (value === opts.on)
                        me.value = 1;
                    return me.value;
                });
        },
        toggle: function toggle() {
            return me.value ? me.disable() : me.enable();
        },
    }));
}
