'use strict';

let _ = require('lodash');

const DEFAULT_OPTIONS = {
    level: constants.logLevels.error //todo reduce default log level
};

function SamException(type, message, data, options) {

    options = _.assign({}, DEFAULT_OPTIONS, options);

    Error.call(this);
    Error.captureStackTrace(this, SamException);

    this.type = type;
    this.message = message;
    this.data = data || {};
    this.level = options.level;

}

module.exports = SamException;
