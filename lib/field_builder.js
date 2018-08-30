'use strict';

let _ = require('lodash');

exports.convert_json_to_fields = (obj) => {

    let build_object = (inner_obj, indent = 1) => {

        let indent_str = `${'  '.repeat(indent)}`;

        let rows = _.map(_.keys(inner_obj), (key) => {
            if(_.isObject(inner_obj[key])) {
                return `${indent_str}${key} ${build_object(inner_obj[key], indent + 1)} `;
            } else {
                return `${indent_str}${key}`;
            }
        });

        indent_str = indent > 0 ? `${'  '.repeat(indent - 1)}` : '';
        return `{\n${rows.join('\n')}\n${indent_str}}`;
        // return `${rows.join('\n')}`;
    };

    return build_object(obj);
};
