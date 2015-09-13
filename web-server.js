'use strict';

var _ = require('lodash');
var express = require('express');
var logging = require('log4js');
var Promise = require('bluebird');
var url = require('url');

var log = logging.getLogger('web-server');
var util = require('util');

exports.create = create;

function create(options) {
    var app = express();
    app.set('title', 'FancyHome');

    var root = use(app, options.path);

    app.use(express.static('ui', {}));
    app.use(express.static('node_modules/lodash', {}));
    app.use(express.static('node_modules/angular', {}));
    app.use(express.static('node_modules/angular-resource', {}));
    app.use(express.static('node_modules/bootstrap/dist', {}));
    app.use(express.static('node_modules/jquery/dist', {}));

    return _.extend(root, {
        start: _.partial(start, app, options),
    });
}

function start(app, options) {
    var http = require('http');
    var server = http.createServer(app);
    return new Promise(function(resolve, reject) {
        server.on('error', function(error) {
            log.error('Error:', error);
            reject(error);
        });
        server.listen(options.port, function() {
            log.info('Listening:', server.address());
            resolve(server);
        });
    });
}

function use(root, path, setup) {
    var router = express.Router();
    path = cu(path);
    root.use(path, router);
    var context = {
        use: _.partial(use, router),
        link: link,
        path: path,
        get: get,
        post: post,
    };
    context.register = _.partial(register, context);
    if (setup) {
        setup(context);
    }

    return context;

    function get(path, action) {
        router.get(path, function(request, response, next) {
            return onRequest(action, request, response, next);
        });
    }

    function post(path, action) {
        router.post(path, function(request, response, next) {
            return onRequest(action, request, response, next);
        });
    }

    function link(from, href, label) {
        return { href: url.resolve(from, href), label: label || undefined };
    }

    function onRequest(action, request, response, next) {
        log.debug('%s %s', request.method, request.originalUrl);
        var requestUrl = url.format({
            protocol: request.protocol,
            host: request.get('Host'),
            pathname: (request.baseUrl + '/' + request.url).replace('//', '/'),
        });
        request.link = _.partial(link, requestUrl[requestUrl.length - 1] !== '/' ? requestUrl + '/' : requestUrl);
        return Promise
        .try(function() {
            return action(request, response, next);
        })
        .then(function(body) {
            if (!body) {
                return next();
            }
            if (body.status === 301 || body.status === 302) {
                log.debug('Redirect:', body);
                return response.redirect(body.status, body.url);
            }
            body._links = _.defaults({
                up: request.link('..'),
                self: { href: url.resolve(requestUrl, './') },
            }, body._links || {});
            if (cu(body._links.up.href) === cu(body._links.self.href) || cu(request.originalUrl) === cu(path)) {
                delete body._links.up;
            }
            return response.status(200).json(body);
        })
        .catch(function(error) {
            return next(error);
        })
        .done();
    }

    function cu(u) {
        if (u.slice(-1) === '/') {
            u = u.slice(0, u.length - 1);
        }
        return u;
    }
}

function register(root, rootPath, rooms) {
    root.use(rootPath, function(context) {
        context.get('/', function(request) {
            return {
                _links: {
                    rooms: _.map(rooms, function(room) {
                        return request.link('rooms/' + room.apiName, room.name);
                    }),
                },
            };
        });
        context.use('/rooms', function(context) {
            context.get('/', function(request) {
                return {
                    _links: {
                        rooms: _.map(rooms, function(room) {
                            return request.link(room.apiName, room.name);
                        }),
                    },
                };
            });
            _.forEach(rooms, function(room, key) {
                room.apiName = room.name.split(' ').join('-').toLowerCase();
                context.use('/' + room.apiName, function(context) {
                    context.get('/', function(request) {
                        return {
                            _links: {
                                buttons: _.map(room.buttons, function(button, i) {
                                    return request.link('buttons/' + i);
                                }),
                                lights: _.map(room.lights, function(light, i) {
                                    return request.link('lights/' + i);
                                }),
                            },
                            name: room.name,
                        };
                    });
                    context.use('/buttons', function(context) {
                        context.get('/', function(request) {
                            return {
                                _links: {
                                    buttons: _.map(room.buttons, function(button, i) {
                                        return request.link(i);
                                    }),
                                },
                            };
                        });
                        _.forEach(room.buttons, function(button, i) {
                            context.use('/' + i, function(context) {
                                context.get('/', function(request) {
                                    return {
                                        _links: {
                                            presses: request.link('presses'),
                                            press: request.link('press'),
                                            longpress: request.link('longpress'),
                                        },
                                        name: button.name,
                                        value: button.value,
                                    };
                                });
                                context.use('/presses', function(context) {
                                    context.get('/', function(request) {
                                        return button.press()
                                        .return({
                                            _links: {
                                            },
                                        });
                                    });
                                    context.post('/', function(request) {
                                        var type = 'press';
                                        return button[type]()
                                        .return({
                                            _links: {
                                            },
                                            type: type,
                                        });
                                    });
                                });
                                context.use('/press', function(context) {
                                    context.get('/', function(request) {
                                        return button.press()
                                        .return({
                                            _links: {
                                            },
                                        });
                                    });
                                });
                                context.use('/longpress', function(context) {
                                    context.get('/', function(request) {
                                        return button.longpress()
                                        .return({
                                            _links: {
                                            },
                                        });
                                    });
                                });
                            });
                        });
                    });
                    context.use('/lights', function(context) {
                        context.get('/', function(request) {
                            return {
                                _links: {
                                    lights: _.map(room.lights, function(light, i) {
                                        return request.link(i);
                                    }),
                                },
                            };
                        });
                        _.forEach(room.lights, function(light, i) {
                            context.use('/' + i, function(context) {
                                context.get('/', function(request) {
                                    return {
                                        _links: {
                                            enable: request.link('disable'),
                                            disable: request.link('enable'),
                                            toggle: request.link('toggle'),
                                        },
                                        name: light.name,
                                        value: light.value,
                                    };
                                });
                                context.use('/disable', function(context) {
                                    context.get('/', function(request) {
                                        return light.disable()
                                        .return({});
                                    });
                                });
                                context.use('/enable', function(context) {
                                    context.get('/', function(request) {
                                        return light.enable()
                                        .return({});
                                    });
                                });
                                context.use('/toggle', function(context) {
                                    context.get('/', function(request) {
                                        return light.toggle()
                                        .return({});
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
}
