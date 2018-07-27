module.exports = {
    exceptions: {
        badRequest: 'bad_request', // 400
        syntaxError: 'syntax_error', // 400
        invalidArgument: 'invalid_argument', // 400
        missingArgument: 'missing_argument', // 400
        notFound: 'not_found', // 404
        notAllowed: 'not_allowed', // 403
        rateLimitExceeded: 'rate_limit', // 429
        invalidCredentials: 'invalid_credentials', // 401
        missingCredentials: 'missing_credentials', // 401
        invalidRequest: 'invalid_request', // 400
        invalidRequestError: 'invalid_request_error', // 400
        conflict: 'conflict', // 409
        databaseError: 'database_error', // 500
        deprecatedRequest: 'deprecated_request', // 400
        timeout: 'timeout', // 503
        socialCredentialsError: 'social_credentials_error', // 401
        unsupportedResponse: 'unsupported_response', // 500
        emptyResponse: 'empty_response', // 500
        unhandledError: 'unhandled_error', // 500
        serviceUnavailable: 'service_unavailable', // 503
        pusherException: 'pusher_exception', // 500
        uncaughtException: 'uncaught_exception', // 500
        internalServerError: 'internal_server_error', // 500
        invalidResponse: 'invalid_response', // 500
        connectionReset: 'connection_reset', // 503
        emailSuppress: 'email_suppress',
        invalidSNSMessage: 'invalid_sns_message',
        serviceDisabled: 'service_disabled' // 555
    },
    logLevels: {
        fatal: 0,
        error: 1,
        warn: 2,
        info: 3,
        verbose: 4,
        debug: 5
    },
    logLevelNames: ['fatal', 'error', 'warn', 'info', 'verbose', 'debug'],
};