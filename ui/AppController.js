var app = angular.module('appModule');
app.controller('AppController', AppController);

function AppController($q, $scope, $timeout, api, pageVisibilityService) {
    //console.log('AppController|0| $scope:', $scope);

    var busyTokens = [];

    angular.extend($scope, {
        press: press,
        toggle: toggle,
    });

    $scope.$on('visibilityChanged', onVisibilityChanged);
    onVisibilityChanged(null, true);

    function press(button) {
        if (button && button.press) {
            var busyToken = getBusyToken();
            return button.press.refresh()
                .then(function() {
                    return refresh();
                })
                .finally(function() {
                    busyToken.done();
                });
        }
    }

    function toggle(light) {
        if (light && light.toggle) {
            console.log('AppController.toggle|0| name: ' + light.name + ', value: ' + light.value + ', light:', light);
            var busyToken = getBusyToken();
            return light.toggle.refresh()
                .then(function() {
                    return light.refresh()
                })
                .then(function() {
                    return $timeout(function() {
                        console.log('AppController.toggle|2| name: ' + light.name + ', value: ' + light.value + ', light:', light);
                    });
                })
                .finally(function() {
                    busyToken.done();
                });
        }
    }

    function getBusyToken() {
        var busyToken = {};
        busyTokens.push(busyToken);
        $scope.isBusy = true;
        return angular.extend(busyToken, {
            done: function() {
                _.pull(busyTokens, busyToken);
                $scope.isBusy = busyTokens.length > 0;
            },
        });
    }

    function refresh() {
        var log = logger('');
        log(0);
        return api.refresh()
            .then(function onApiRefreshed(root) {
                log(1, 'root', root);
                $scope.root = root;
                return root.rooms.refresh();
            })
            .then(function onRoomsRefreshed(rooms) {
                var log = logger('.onRoomsRefreshed');
                log(0, 'rooms', rooms);
                var promise = $q.when(rooms);
                angular.forEach(rooms, function(room) {
                    promise = promise
                        .then(function() {
                            var log = logger('.onRoomRefreshed');
                            log(0, 'room', room);
                        })
                        .then(function() {
                            return room.buttons.refresh()
                                .then(function onButtonsRefreshed(buttons) {
                                    var log = logger('.onButtonsRefreshed');
                                    log(0, 'buttons', buttons);
                                    var buttonsPromise = $q.when(buttons);
                                    angular.forEach(buttons, function(button) {
                                        buttonsPromise = buttonsPromise
                                            .then(function() {
                                                return button.refresh()
                                                    .then(function onButtonRefreshed(button) {
                                                        var log = logger('.onButtonRefreshed');
                                                        log(0, 'button', button);
                                                        return button;
                                                    });
                                            });
                                    });
                                    return buttonsPromise;
                                });
                        })
                        .then(function() {
                            return room.lights.refresh()
                                .then(function onLightsRefreshed(lights) {
                                    var log = logger('.onLightsRefreshed');
                                    log(0, 'lights', lights);
                                    var lightsPromise = $q.when(lights);
                                    angular.forEach(lights, function(light) {
                                        lightsPromise = lightsPromise
                                            .then(function() {
                                                return light.refresh()
                                                    .then(function onLightRefreshed(light) {
                                                        light.cssClass = light.value ? 'on' : 'off';
                                                        var log = logger('.onLightRefreshed');
                                                        log(0, 'light', light);
                                                        return light;
                                                    });
                                            });
                                    });
                                    return lightsPromise;
                                });
                        });
                });
                return promise
                    .then(function() {
                        $scope.rooms = rooms;
                        return rooms;
                    });
            })
            .finally(function() {
                console.log('$scope:', $scope);
            });

        function logger(fn) {
            return function log(n, label) {
                var args = ['AppController.refresh' + fn + '|'];
                if (arguments.length >= 1) {
                    args[0] += n + '|';
                    if (arguments.length >= 2) {
                        args[0] += label + '|';
                        angular.forEach(Array.prototype.slice.apply(arguments, [2]), function(arg, i) {
                            args.push(angular.copy(arg));
                        });
                    }
                }
                console.log.apply(console, args);
            };
        }
    }

    function onVisibilityChanged(e, isVisible) {
        //console.log('onVisibilityChanged|', isVisible);
        if (isVisible) {
            refresh();
        }
    }
}
