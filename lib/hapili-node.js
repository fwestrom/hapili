var injector = require('qtort-microservices/injectable/injector.js');
var inject = injector({
    _: require('lodash'),
    Promise: require('bluebird'),
    defaultOptions: {
        port: 16666,
    },
});


var idCounter = 0;

class HapiliMessageHeader {
    static create() {
        this.version = 1;
        this.id = ++idCounter;
        this.type = null;
    }

    readFrom(buf, offset) {
        if (buf.length - offset < 4) {
            throw new Error('Unexpected HapiliMessage length: ' + buf.length - offset);
        }
        this.version = buf.readUInt8(offset + 0);
        if (this.version !== 1) {
            throw new Error('Unexpected HapiliMessage version: ' + this.version);
        }
        this.id = buf.readUInt16BE(offset + 1);
        this.type = buf.readUInt8(offset + 3);
        return 4;
    }

    writeTo(buf, offset) {
        buf.writeUInt8(this.version, offset);
        buf.writeUInt16BE(this.id, offset + 1);
        buf.writeUInt8(this.type, offset + 3);
        return 4;
    }
}

class HapiliMessage {
    constructor() {
        this.header = new HapiliMessageHeader();
    }

    static readFrom(buf, offset) {
        var header = new HapiliMessageHeader();
        header.readFrom(buf);

        var msg = null;
        switch (header.type) {
            case 0:
                msg = new QueryMessage();
                break;
            case 1:
                msg = new SetMessage(buf);
                break;
            case 26:
                msg = new ConfigureMessage();
                break;
            case 128:
                msg = new AckMessage();
                break;
            default:
                throw new Error('Unexpected HapiliMessage type: ' + header.type);
        }
        msg.readFrom(buf, offset);
        return msg;
    }

    readFrom(buf, offset) {
        return this.header.readFrom(buf, offset);
    }

    writeTo(buf, offset) {
        return this.header.writeTo(buf, offset);
    }
}

class QueryMessage extends HapiliMessage {
    readFrom(buf, offset) {
        return super.readFrom(buf, offset);
    }

    writeTo(buf, offset) {
        return super.writeTo(buf, offset);
    }
}

class SetMessage extends HapiliMessage {
    readFrom(buf, offset) {
        var slen = super.readFrom(buf, offset);
        this.id = buf.readUInt8(offset + slen + 0);
        this.value = buf.readUInt8(offset + slen + 1);
        return slen + 2;
    }

    writeTo(buf, offset) {
        var slen = super.writeTo(buf, offset);
        buf.writeUInt8(this.id, offset + slen + 0);
        buf.writeUInt8(this.value, offset + slen + 1);
        return slen + 2;
    }
}

class ConfigureMessage extends HapiliMessage {
    readFrom(buf, offset) {
        var slen = super.readFrom(buf, offset);
        this.id = buf.readUInt8(offset + slen + 0);
        this.mode = buf.readUInt8(offset + slen + 1);
        return slen + 2;
    }

    writeTo(buf, offset) {
        var slen = super.writeTo(buf, offset);
        buf.writeUInt8(this.id, offset + slen + 0);
        buf.writeUInt8(this.mode, offset + slen + 1);
        return slen + 2;
    }
}

class AckMessage extends HapiliMessage {
    readFrom(buf, offset) {
        var len = super.readFrom(buf, offset);
        if (buf.length - offset - len >= 1) {
            this.id = buf.readUInt16BE(offset + len + 0);
            ++len;
        }
        else {
            delete this.id;
        }
        return len;
    }

    writeTo(buf, offset) {
        var len = super.writeTo(buf, offset);
        if (this.id) {
            buf.writeUInt16BE(this.id, offset + len + 0);
            ++len;
        }
        return len;
    }
}

inject(require('./app.js')).then(function(app) {
    return inject(function(_, dgram, logging, options, Promise) {
        var log = logging.getLogger('hapili-node');

        app.on('init', function() {
            var sock = Promise.promisifyAll(dgram.createSocket('udp4'));

            sock.on('error', function(error) {
              log.error('sock|error|', error);
              app.shutdown().done();
            });

            sock.on('listening', function() {
              var addr = sock.address();
              log.info('init| listening at %s:%s/udp', addr.address, addr.port);
            });

            sock.on('message', function(buf, rinfo) {
                buf = Buffer.from(buf);
                log.info('sock.message|', buf);
                var msg = HapiliMessage.readFrom(buf, 0);
                log.info('sock.message| msg:\n', msg);
            });

            app.wait.for.shutdown.then(function() {
                return sock.closeAsync();
            }).done();

            return sock.bindAsync(options.port);
        });

        return app.start();
    });
});
