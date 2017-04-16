'use strict';

let child_process = require('child_process');

module.exports = {
    command: 'deploy <server>',
    description: 'Deploys Hapili to a target server, specified by its dns name or ip address.',
    handler: argv => {
        return deploy(argv.server);
    },
}

function deploy(server) {
    if (!server) {
        console.error('Which server?');
        return process.exit(1);
    }

    var args = ['-rv', '--exclude-from=.rsync-exclude', '.', server + ':/opt/hapili'];
    var child = child_process.execFile('rsync', args, function(error, stdout, stderr) {
        if (stdout) {
            console.info(stdout);
        }
        if (stderr) {
            console.error(stderr);
        }
        if (error) {
            console.error(error);
            return process.exit(1);
        }
        console.info('ok.');
    });
};
