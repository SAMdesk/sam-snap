'use strict';

let _ = require('lodash');
let constants = require('./constants');
let SamException = require('./SamException');

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const cross_fetch = require('cross-fetch');
const gql = require('graphql-tag');
const ApolloClient = require('apollo-boost').ApolloClient;
const createHttpLink = require('apollo-link-http').createHttpLink;
const InMemoryCache = require('apollo-cache-inmemory').InMemoryCache;

class SnapService {

    constructor(locator) {
        this.config = locator.get('config');
    }

    getSnapClient() {
        const httpLink = createHttpLink({
            fetch: (uri, options) => {
                const header = {
                    typ: 'JWT',
                    alg: 'ES256',
                    kid: this.config.snap.kid
                };

                const payload = {
                    iss: this.config.snap.issuer,
                    aud: 'PublicStoryKitAPI',
                    exp: 1844975504, //way in the future June 2028
                    hash: crypto.createHash('sha256').update(options.body).digest('hex')
                };

                let token = jwt.sign(payload, this.config.snap.private_key, { algorithm: this.config.snap.algorithm, header: header });
                let authorizationHeader = `Bearer ${token}`;

                options.headers = options.headers || {};
                options.headers['X-Snap-Kit-S2S-Auth'] = authorizationHeader;

                return cross_fetch(uri, options);
            },
            uri: this.config.snap.endpoint
        });

        return new ApolloClient({
            link: httpLink,
            cache: new InMemoryCache()
        });
    };

    searchSnaps(query, criteria, done) {

        criteria = _.extend({
            count: 30,
            page: 0,
            terms: [],
            from: Math.floor(Date.now() / 1000) - 3600,
            to: Math.floor(Date.now() / 1000)
        }, criteria);

        const geoFilter = {
            geotype: 'CIRCLE',
            circle: {
                center: {
                    latitude: criteria.lat, //37.7975529,
                    longitude: criteria.lng //-122.4034846,
                },
                radius_in_meters: parseInt(criteria.radius) || 1000
            }
        };

        let content_filter = _.chain(criteria.terms || []).compact().map((x) => {
            return { type: 'CAPTION', keyword: x };
        }).value();

        //removed media_url from media because they started erroring (media_url)
        // overlay_image_url
        const SearchSnapsWithGeoFilter = {
            query: gql`${query}`,
            variables: {
                geo_filter: geoFilter,
                content: content_filter,
                media_format_filter: {
                    media_type: 'UNSET',
                    orientation_type: 'UNSET',
                    facing_type: 'REAR_FACING'
                },
                time_range: {
                    min_timestamp_secs: criteria.from,
                    max_timestamp_secs: criteria.to
                },
                order: 'CHRONOLOGICAL',
                paging: {
                    offset: criteria.page * criteria.count,
                    count: criteria.count
                }
            }
        };

        let client = this.getSnapClient();

        client.query(SearchSnapsWithGeoFilter).then((result) => {
            let snaps = _.get(result, 'data.SearchSnaps', { snaps: [] });
            return done(null, snaps);
        }).catch((err) => {
            if(err.message === 'GraphQL error: search request error code:NOT_FOUND  - ') {
                return done(null, { snaps: [] });
            }

            let ex = null;

            if(!_.isEmpty(err.graphQLErrors)) {
                ex = new SamException(constants.exceptions.remoteServiceError, 'Snap API threw an error and did not complete request', err, { level: constants.logLevels.info });
            }

            if(_.isNil(ex) && _.has(err, 'networkError')) {
                switch(err.networkError.code) {
                    case 'ECONNRESET':
                        ex = new SamException(constants.exceptions.connectionReset, 'Connection was reset by Snap API', err, { level: constants.logLevels.info });
                }
            }

            if(_.isNil(ex)) {
                ex = new SamException('unhandled_error', 'Received unhandled error from Snap API', err, { level: constants.logLevels.error });
            }

            return done(ex);
        });

    };

    searchStories(query, criteria, done) {

        criteria = _.extend({
            count: 30,
            page: 0,
            terms: [],
            from: Math.floor(Date.now() / 1000) - 3600,
            to: Math.floor(Date.now() / 1000)
        }, criteria);

        const geoFilter = {
            geotype: 'CIRCLE',
            circle: {
                center: {
                    latitude: criteria.lat, //37.7975529,
                    longitude: criteria.lng //-122.4034846,
                },
                radius_in_meters: parseInt(criteria.radius) || 1000
            }
        };

        let content_filter = _.map(criteria.terms || [], (x) => {
            return { type: 'CAPTION', keyword: x };
        });

        //removed fields
        // - video_thumbnail
        // - image_thumbnail
        const SearchStoriesWithGeoFilter = {
            query: gql`${query}`,
            variables: {
                geo_filter: geoFilter,
                content: content_filter,
                media_format_filter: {
                    media_type: 'UNSET',
                    orientation_type: 'UNSET',
                    facing_type: 'REAR_FACING'
                },
                time_range: {
                    min_timestamp_secs: criteria.from,
                    max_timestamp_secs: criteria.to
                },
                order: 'CHRONOLOGICAL',
                paging: {
                    offset: criteria.page * criteria.count,
                    count: criteria.count
                }
            }
        };

        let client = this.getSnapClient();

        client.query(SearchStoriesWithGeoFilter).then((result) => {
            let snaps = _.get(result, 'data.SearchSnaps', { snaps: []} );
            return done(null, snaps);
        }).catch((err) => {
            if(err.message === 'GraphQL error: search request error code:NOT_FOUND  - ') {
                return done(null, { snaps: [] });
            }

            let ex = new SamException(constants.exceptions.unhandledError, 'Received unhandled error from Snap API', err, { level: constants.logLevels.error });

            return done(ex);
        });

    };

}

module.exports = SnapService;