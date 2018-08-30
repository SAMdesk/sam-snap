'use strict';

let should = require("should");
let field_builder = require("../lib/field_builder");

describe('field builder tests', () => {

    it("will work for snap fields", () => {

        let fields = {
            id: true,
            title: true,
            attachment_url: true,
            embed_url: true,
            capture_time_secs: true,
            media: {
                duration_secs: true,
                media_type: true,
                orientation_type: true,
                camera_position: true,
                media_preview_url: true,
            },
            attribution_info: {
                display_name: true,
                emoji: true,
            }
        };

        let str = field_builder.convert_json_to_fields(fields);
        str = str.replace(/\s\s+/g, ' ');
        (str).should.equal('{ id title attachment_url embed_url capture_time_secs media { duration_secs media_type orientation_type camera_position media_preview_url } attribution_info { display_name emoji } }');
    });

    it("will work for story fields", () => {

        let fields = {
            id: true,
            title: true,
            attachment_url: true,
            embed_url: true,
            capture_time_secs: true,
            media: {
                duration_secs: true,
                media_type: true,
                orientation_type: true,
                camera_position: true,
                media_preview_url: true,
            },
            attribution_info: {
                display_name: true,
                emoji: true,
            }
        };

        let str = field_builder.convert_json_to_fields(fields);
        str = str.replace(/\s\s+/g, ' ');
        (str).should.equal('{ id title attachment_url embed_url capture_time_secs media { duration_secs media_type orientation_type camera_position media_preview_url } attribution_info { display_name emoji } }');
    });

});