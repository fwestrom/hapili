module.exports = function app(_, inject, logging, Promise) {
    var events = require('events');
    var log = logging.getLogger('app');

    var app = _(new events.EventEmitter())
        .tap(function(app) { app.setMaxListeners(100); })
        .bindAll()
        .value();

    return _.bindAll(_.extend(app, {
        wait: {
            for: {
                ready: Promise.fromCallback(function(resolve) { app.on('shutdown', resolve); }),
                shutdown: new Promise(function(resolve) { app.on('shutdown', resolve); }),
            },
        },
        start: function() {
            return inject(function(_, logging, options, path, Promise, util) {
                log.info('Starting %s; pid: %s.', path.basename(require.main.filename, '.js'), process.pid);
                log.debug('options:\n%s', util.inspect(options, { colors: true, depth: null }));

                log.trace('Setting up signal/exit handlers:', options.shutdownOn);
                _.forEach(options.shutdownOn, function(signal) {
                    process.on(signal, signalHandler);
                    app.on('shutdown', shutdownHandler);

                    function signalHandler() {
                        log.warn('Received signal:', signal);
                        app.shutdown()
                            .delay(10)
                            .tap(function() {
                                process.exit();
                            })
                            .done();
                    }

                    function shutdownHandler() {
                        process.removeListener(signal, signalHandler);
                        app.removeListener('shutdown', shutdownHandler);
                    }
                });

                return Promise.resolve()
                    .then(emitter('init-first'))
                    .then(emitter('init'))
                    .then(emitter('init-last'))
                    .then(emitter('ready'));
            });
        },
        shutdown: function() {
            log.info('Shutting down %s; pid: %s.', path.basename(require.main.filename, '.js'), process.pid);
            return Promise.resolve()
                .then(emitter('shutdown-first'))
                .then(emitter('shutdown'))
                .then(emitter('shutdown-last'))
                .then(emitter('exit'));
        }
    }));

    function emitter(e) {
        return function() {
            var listeners = app.listeners(e);
            return Promise
                .all(_.map(listeners, function(listener) {
                    return listener();
                }))
                .return(undefined);
        };
    }
};
