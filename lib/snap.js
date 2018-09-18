'use strict';

let _ = require('lodash');
let constants = require('./constants');
let SamException = require('./SamException');
let field_builder = require('./field_builder');

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const cross_fetch = require('cross-fetch');
const gql = require('graphql-tag');
const ApolloClient = require('apollo-boost').ApolloClient;
const createHttpLink = require('apollo-link-http').createHttpLink;
const InMemoryCache = require('apollo-cache-inmemory').InMemoryCache;

const ALL_SEARCH_SNAPS_FIELDS = {
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
        media_preview_url: true
    },
    attribution_info: {
        display_name: true,
        emoji: true
    }
};

const ALL_SEARCH_STORIES_FIELDS = {
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
        media_preview_url: true
    },
    attribution_info: {
        display_name: true,
        emoji: true
    }
};

const SEARCH_SNAPS_QUERY_TEMPLATE = `query ($geo_filter: GeoFilterInput!, $content : [ContentFilterInput], $media_format_filter: MediaFormatFilterInput, $time_range: TimeRangeFilterInput, $order: SearchResultsOrderType!, $paging: PagingInput!) {
  SearchSnaps(geo_filter: $geo_filter,content: $content, media_format_filter: $media_format_filter, time_range: $time_range, order: $order, paging: $paging) {
    snaps __SNAP_FIELDS__
    nextSnapOffset
  }  
}`;

const SEARCH_STORIES_QUERY_TEMPLATE = `query ($geo_filter: GeoFilterInput!, $content : [ContentFilterInput], $media_format_filter: MediaFormatFilterInput, $time_range: TimeRangeFilterInput, $order: SearchResultsOrderType!, $paging: PagingInput!) {
  SearchStories(geo_filter: $geo_filter,content: $content, media_format_filter: $media_format_filter, time_range: $time_range, order: $order, paging: $paging) {
    stories {
        id
        metadata
        embed_url
        snaps __SNAP_FIELDS__
    }
    nextStoryOffset
  }  
}`;

class SnapService {

    constructor(config) {
        this.config = config;
    }

    getSnapClient() {
        const httpLink = createHttpLink({
            fetch: (uri, options) => {
                const header = {
                    typ: 'JWT',
                    alg: 'ES256',
                    kid: this.config.kid
                };

                const payload = {
                    iss: this.config.issuer,
                    aud: 'PublicStoryKitAPI',
                    exp: 1844975504, //way in the future June 2028
                    hash: crypto.createHash('sha256').update(options.body).digest('hex')
                };

                let token = jwt.sign(payload, this.config.private_key, { algorithm: this.config.algorithm, header: header });
                let authorizationHeader = `Bearer ${token}`;

                options.headers = options.headers || {};
                options.headers['X-Snap-Kit-S2S-Auth'] = authorizationHeader;

                return cross_fetch(uri, options);
            },
            uri: this.config.endpoint
        });

        return new ApolloClient({
            link: httpLink,
            cache: new InMemoryCache()
        });
    };

    /**
     * @param query {
     *  caption_terms
     *  geo {
     *    lat
     *    lng
     *    radius
     *  }
     *  media_type
     *  pagination {
     *   min_timestamp (s) or max_timestamp (s)
     *  }
     *  count
     * }
     * @param fields
     * @param done
     */
    searchSnaps(query, snap_fields, done) {

        if(typeof snap_fields === 'function') {
            done = snap_fields;
            snap_fields = ALL_SEARCH_SNAPS_FIELDS;
        }

        let variables = this._buildVariablesFrom(query);

        let fields_str = field_builder.convert_json_to_fields(snap_fields);
        let query_text = SEARCH_SNAPS_QUERY_TEMPLATE.replace('__SNAP_FIELDS__', fields_str);
        let post_filter = !!(query.pagination && query.pagination.max_timestamp && query.pagination.min_timestamp);

        const SearchSnaps = {
            query: gql`${query_text}`,
            variables: variables
        };

        let client = this.getSnapClient();

        client.query(SearchSnaps).then((search_result) => {

            let snaps = _.get(search_result, 'data.SearchSnaps.snaps', []);

            if(post_filter) {
                snaps = _.filter(snaps, (snap) => {
                    return snap.capture_time_secs >= query.pagination.min_timestamp &&
                        snap.capture_time_secs <= query.pagination.max_timestamp;
                });
            }

            return done(null, { snaps: snaps });

        }).catch((err) => {

            if(err.message === 'GraphQL error: search request error code:NOT_FOUND  - ') {
                return done(null, { snaps: [] });
            }

            let ex = null;
            let data = {
                snap_error: err,
                query: JSON.stringify(query)
            };

            if(!_.isEmpty(err.graphQLErrors)) {
                ex = new SamException(constants.exceptions.remoteServiceError, 'Snap API threw an error and did not complete request', data, { level: constants.logLevels.info });
            }

            if(_.isNil(ex) && _.has(err, 'networkError')) {
                switch(err.networkError.code) {
                    case 'ECONNRESET':
                        ex = new SamException(constants.exceptions.connectionReset, 'Connection was reset by Snap API', data, { level: constants.logLevels.info });
                        break;
                }
            }

            if(_.isNil(ex) && _.has(err, 'networkError')) {
                switch(err.networkError.statusCode) {
                    case 404:
                        ex = new SamException(constants.exceptions.notFound, 'Snap API could not find the requested asset', data, { level: constants.logLevels.info });
                        break;
                    case 500:
                        ex = new SamException(constants.exceptions.remoteServiceError, 'Snap API encountered an unknown error', data, { level: constants.logLevels.info });
                        break;
                    case 502:
                        ex = new SamException(constants.exceptions.serviceUnavailable, 'Snap API is currently unavailable', data, { level: constants.logLevels.warn });
                        break;
                }
            }

            if(_.isNil(ex)) {
                ex = new SamException('unhandled_error', 'Received unhandled error from Snap API', data, { level: constants.logLevels.error });
            }

            return done(ex);
        });

    };

    searchStories(query, snap_fields, done) {

        if(typeof snap_fields === 'function') {
            done = snap_fields;
            snap_fields = ALL_SEARCH_STORIES_FIELDS;
        }

        let variables = this._buildVariablesFrom(query);

        let fields_str = field_builder.convert_json_to_fields(snap_fields);
        let query_text = SEARCH_STORIES_QUERY_TEMPLATE.replace('__SNAP_FIELDS__', fields_str);

        const SearchStories = {
            query: gql`${query_text}`,
            variables: variables
        };

        let client = this.getSnapClient();

        client.query(SearchStories).then((result) => {
            let stories = _.get(result, 'data.SearchStories', { stories: []} );
            return done(null, stories);
        }).catch((err) => {

            if(err.message === 'GraphQL error: search request error code:NOT_FOUND  - ') {
                return done(null, { snaps: [] });
            }

            let ex = new SamException(constants.exceptions.unhandledError, 'Received unhandled error from Snap API', err, { level: constants.logLevels.error });

            return done(ex);
        });

    };

    _buildVariablesFrom(query){

        let geo_filter = null;
        let content_filter = [];

        if(query.caption_terms && query.caption_terms.length) {
            _.each(query.caption_terms, (term) => {
                content_filter.push({
                    type: 'CAPTION',
                    keyword: term
                });
            });
        }

        if(query.geo) {
            geo_filter = {
                geotype: 'CIRCLE',
                circle: {
                    center: {
                        latitude: query.geo.lat,
                        longitude: query.geo.lng
                    },
                    radius_in_meters: parseInt(query.geo.radius)
                }
            };
        }

        let time_range = {
            min_timestamp_secs: 0,
            max_timestamp_secs: Math.floor(Date.now() / 1000)
        };

        if(query.pagination) {
            if(query.pagination.max_timestamp) time_range.max_timestamp_secs = query.pagination.max_timestamp;
            else if(query.pagination.min_timestamp) time_range.min_timestamp_secs = query.pagination.min_timestamp;
        }

        let variables = {
            geo_filter: geo_filter,
            content: content_filter,
            media_format_filter: {
                media_type: query.media_type || 'UNSET',
                orientation_type: 'UNSET',
                facing_type: 'REAR_FACING'
            },
            time_range: time_range,
            order: 'REVERSE_CHRONOLOGICAL',
            paging: {
                offset: 0,
                count: query.count || 100
            }
        };

        return variables;
    }

}

module.exports = SnapService;