'use strict';

module.exports = {
    command: 'server',
    description: 'Run Hapili as a master server, and start the web server for access to the user interface.',
    builder: {
    },
    handler: argv => require('../hapili-server'),
};
