var request = require('co-request'),
    format = require('util').format,
    _ = require('lodash'),
    zlib = require('zlib');

function unzip (body) {
	return function (done) {
		zlib.unzip(body, function(error, buffer) {
			done(error, buffer.toString());
		})
	}}

function Request(options) {
    this.wsapiUrl = format('%s/slm/webservice/%s', options.server, options.apiVersion);
    this.requestOptions = options.requestOptions;
}

Request.prototype.doSecuredRequest = function* (method, options) {
    if (this._token == undefined) {
        result = yield this.doRequest('GET', {url: '/security/authorize'})
        this._token = result.SecurityToken;
    }
    return yield this.doRequest(method, _.merge(options, {qs: {key: this._token}}));
};

Request.prototype.doRequest = function* (method, options) {
	options = _.merge({}, options, {method: method, url: this.wsapiUrl + options.url},
					  this.requestOptions)
    var resp = yield request(options);
	if (resp.headers['content-encoding'] && resp.headers['content-encoding'] === 'gzip') {
		body = yield unzip(resp.body);
	} else {
		body = resp.body;
	}

	if (body && _.isObject(body)) {
        var result = _.values(body)[0];
        if (result.Errors.length) {
            throw result.Errors
        } else {
            return result;
        }
	} else {
		throw new TypeError (body);
	}
};

Request.prototype.get = function*(options) {
    return yield this.doRequest('GET', options);
};

Request.prototype.post = function*(options) {
    return yield this.doSecuredRequest('POST', options);
};

Request.prototype.put = function*(options) {
    return yield this.doSecuredRequest('PUT', options);
};

Request.prototype.del = function*(options) {
    return yield this.doSecuredRequest('DELETE', options);
};

module.exports = {
    init: function(options) {
        return new Request(options);
    },
    Request: Request
};

