var app = angular.module('appModule');
app.factory('api', function($q, $resource, $timeout) {
    return createContext('/api');

    function createContext(path) {
        var resource = $resource(path, {}, {
            get: { method:'GET', params: {}, isArray: false },
            post: { method:'GET', params: {}, isArray: false },
        });
        return {
            refresh: _.partial(refresh, path, resource, undefined),
        };
    }

    function refresh(path, resource, obj, callback) {
        return $q(function(resolve, reject) {
            var _obj = resource.get(
                {},
                function(result) {
                    try {
                        transformLinks(path, result);
                        _.extend(obj, result);
                        obj.refresh = _.partial(refresh, path, resource, obj);
                        //console.log('api.refresh| finished; path: %s,\n result:', path, obj, ', callback:', callback);
                        if (callback) {
                            callback(undefined, obj);
                        }
                    }
                    catch (ex) {
                        reject(ex);
                    }
                    finally {
                        resolve(obj);
                    }
                },
                function(error) {
                    //console.error('api.refresh| path: %s, error:', path, error);
                    reject(error);
                });
            if (!obj) {
                obj = _obj;
            }
        });
    }

    function refreshArray(path, a, callback) {
        var promise = $q
            .all(_.map(a, function(x, i) {
                return x.refresh()
                    .then(function(xr) {
                        a[i] = xr;
                        return xr;
                    });
            }))
            .then(function(result) {
                if (callback) {
                    callback(undefined, result);
                }
                return result;
            });
        return promise;
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
        //console.log('transformLinks| after:', result);
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
