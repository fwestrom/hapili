module.exports = function state(_, app, fs, Promise) {
    fs = Promise.promisifyAll(fs);

    var state = {};

    function read() {
        return fs.readFileAsync('hapili-state.json')
            .then(JSON.parse)
            .tap(function(result) {
                if (!state || !state.id) {
                    throw new Error('Invalid State');
                }
                _.assign(result, state);
            })
            .catch(function(error) {
                var uuid = require('uuid-base62');
                _.assign(state, { id: = uuid.v4() });
                return write();
            })
            .return(state);
    }

    function write() {
        return fs.writeFileAsync('hapili-state.json', JSON.stringify(state))
            .return(state);
    }
};
