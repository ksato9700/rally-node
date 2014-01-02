var request = require('cogent');
var format = require('util').format;
var _ = require('lodash');
var querystring = require('querystring');

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
	var url = this.wsapiUrl + options.url;
	if (options.qs) {
		url = url + '?' + querystring.stringify(options.qs);
		options = _.omit(options, 'qs');
	}
	options = _.merge({}, options, {method: method}, this.requestOptions);
    var resp = yield request(url, options);
	if (resp.body) {
		body = resp.body;
	} else {
		body = resp.text;
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

