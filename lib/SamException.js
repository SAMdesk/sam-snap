'use strict';

let _ = require('lodash');

function SamException(type, message, data, options) {

    options = _.assign({}, default_options, options);

    Error.call(this);
    Error.captureStackTrace(this, SamException);

    this.type = type;
    this.message = message;
    this.data = data || {};
    this.level = options.level;

}

module.exports = SamException;
