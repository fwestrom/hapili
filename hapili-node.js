var injector = require('qtort-microservices/injectable/injector.js');
var inject = injector({
    _: require('lodash'),
    Promise: require('bluebird'),
    defaultOptions: {
    },
});
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

            sock.on('message', function(msg, rinfo) {
                log.trace('sock.message|', msg);
            });

            app.wait.for.shutdown.then(function() {
                return sock.closeAsync();
            }).done();

            return sock.bindAsync(0);
        });

        return app.start();
    });
});
