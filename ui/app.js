var appModule = angular.module('appModule', ['ngResource']);
appModule
    .controller('AppController', function($scope, api) {
        //console.log('AppController|0| $scope:', $scope);
        $scope.press = function(button) {
            button.press.refresh();
        }
        api.refresh(function(x) {
            //console.log('AppController|1| $scope:', $scope);
            $scope.rooms = x.rooms.refresh(function(x) {
                //console.log('AppController|2| rooms-x:', x);
                angular.forEach(x, function(room) {
                    //console.log('AppController|3| room:', room);
                    room.buttons.refresh(function(x) {
                        //console.log('AppController|4| x:', x);
                        angular.forEach(x, function(button) {
                            //console.log('AppController|5| button:', button);
                        });
                    });
                    room.lights.refresh(function(x) {
                        //console.log('AppController|6| lights-x:', x);
                        angular.forEach(x, function(light) {
                            //console.log('AppController|7| light:', light);
                        });
                    });
                });
            });
        });
    })
    .factory('api', function($q, $resource) {
        return createContext('/api');

        function createContext(path) {
            var resource = $resource(path, {}, {
                get: { method:'GET', params: {}, isArray: false },
                post: { method:'GET', params: {}, isArray: false },
            });
            return {
                refresh: _.partial(refresh, path, resource),
            };
        }

        function refresh(path, resource, onSuccess, onFailure) {
            console.log('api.refresh| refreshing; path:', path);
            return resource.get({},
                function(result) {
                    transformLinks(path, result);
                    console.log('api.refresh| finished; path: %s,\n result:', path, result);
                    if (angular.isDefined(onSuccess)) {
                        onSuccess(result);
                    }
                },
                function(error) {
                    console.error('api.refresh| path: %s, error:', path, error);
                    if (angular.isDefined(onFailure)) {
                        onFailure(error);
                    }
                    else {
                        throw error; // TODO?
                    }
                });
        }

        function refreshArray(path, a, onSuccess, onFailure) {
            console.log('api.refreshArray| refreshing; path:', path);
            var promise = $q.all(_.map(a, function(x, i) {
                return $q(function(resolve, reject) {
                    a[i] = x.refresh(resolve, reject);
                });
            }));
            if (angular.isDefined(onSuccess)) {
                promise = promise.then(onSuccess);
            }
            if (angular.isDefined(onFailure)) {
                promise = promise.catch(onFailure);
            }
            return angular.extend(a, { $promise: promise });
        }

        function transformLinks(path, result) {
            _.forEach(result._links, function(x, i) {
                var obj;
                if (_.isArray(x)) {
                    obj = _.map(x, transformLink);
                    obj.refresh = _.partial(refreshArray, path, obj);
                }
                else {
                    obj = transformLink(x, i);
                }
                if (obj !== undefined) {
                    result[i] = obj;
                }
            });
            console.log('transformLinks| after:', result);
            return result;
        }

        function transformLink(value, key) {
            if (value && value.href && !_.contains(['up', 'self'], key)) {
                //console.log('transformLink| key: %s, value:', key, value);
                return _.extend(createContext(value.href), {
                    name: value.name || key,
                });
            }
        }
    });
