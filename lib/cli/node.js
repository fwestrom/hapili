'use strict';

module.exports = {
    command: 'node',
    description: 'Run Hapili as a member node.',
    builder: {
    },
    handler: argv => require('../hapili-node'),
};
