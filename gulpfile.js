'use strict';

var gulp = require('gulp');
var gulpUtil = require('gulp-util');

gulp.task('start', function() {
    require('./app');
});

gulp.task('start-watch', function() {
    var gulpNodemon = require('gulp-nodemon');
    gulpNodemon(getOptions({
        script: 'app',
        ext: 'html js',
        ignore: [
        ]
    }));
});

gulp.task('test', function() {
    var gulpMocha = require('gulp-mocha');
    var options = getOptions({
        reporter: 'spec',
        timeout: undefined
    });
    return gulp.src(['test/.testStart/*.js', 'test/**/*.test.js'], { read: false })
        .pipe(gulpMocha(options))
        .on('error', gulpUtil.log);
});

gulp.task('test-watch', function() {
    gulp.watch(['**/*'], ['test']);
});

function getOptions(defaults) {
    var args = process.argv[0] == 'node' ? process.argv.slice(3) : process.argv.slice(2);
    var minimist = require('minimist');
    return minimist(args, {
        default: defaults
    });
}