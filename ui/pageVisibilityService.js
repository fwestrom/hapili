var app = angular.module('appModule');
app.service('pageVisibilityService', function pageVisibilityService($rootScope) {

    var me = this;
    onVisibilityChanged();

    document.addEventListener('visibilitychange',onVisibilityChanged);
    document.addEventListener('webkitvisibilitychange', onVisibilityChanged);
    document.addEventListener('msvisibilitychange', onVisibilityChanged);

    function onVisibilityChanged() {
        var visible = !(document.hidden || document.webkitHidden || document.mozHidden || document.msHidden);
        if (visible !== me.isVisible) {
            me.isVisible = visible;
            $rootScope.$broadcast('visibilityChanged', visible);
        }
    }
});
