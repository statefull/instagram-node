// Copyright Teleportd Ltd. and other Contributors
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var fwk = require('fwk');
var Q = require('q');
var http = require('http');
var https = require('https');
var query = require('querystring');
var url = require('url');
var crypto = require('crypto');

/**
 * Instagram API driver for NodeJS
 * Proceeds the call to the API and give
 * back the response
 *
 * @param spec { agent, host, port }
 */
var instagram = function(spec, my) {
  var _super = {};
  my = my || {};
  spec = spec || {};

  my.limit = null;
  my.remaining = null;
  my.agent = spec.agent;
  my.host = spec.host || 'https://api.instagram.com';
  my.port = spec.port || 443;
  my.enforce_signed_requests = spec.enforce_signed_requests || false;

  // public
  var use;                              /* use(spec);                                       */

  var user;                             /* user(user_id, cb);                               */
  var user_self;                        /* user_self(params, cb);                           */
  var user_media_recent;                /* user_media_recent(user_id, options, params, cb); */
  var user_self_media_recent;           /* user_self_media_recent(options, params, cb);     */
  var user_self_liked;                  /* user_self_liked(options, params, cb);                    */
  var user_search;                      /* user_search(query, options, cb);                 */

  var user_follows;                     /* user_follows(user_id, cb);                       */
  var user_followers;                   /* user_followers(user_id, cb);                     */
  var user_self_requested_by;           /* user_self_requested_by(cb);                      */
  var user_relationship;                /* user_relationship(user_id, cb);                  */
  var set_user_relationship;            /* set_user_relationship(user_id, action, cb);      */

  var media;                            /* media(media_id, cb);                             */
  var media_shortcode;                  /* media_shortcode(media_shortcode, cb);            */
  var media_search;                     /* media_search(lat, lng, options, cb);             */

  var comments;                         /* comments(media_id, params, cb);                          */
  var add_comment;                      /* add_comment(media_id, text, params, cb);                 */
  var del_comment;                      /* del_comment(media_id, comment_id, params, cb);           */

  var likes;                            /* likes(media_id, cb);                             */
  var add_like;                         /* add_like(media_id, cb);                          */
  var del_like;                         /* del_like(media_id, cb);                          */

  var tag;                              /* tag(tag, cb);                                    */
  var tag_media_recent;                 /* tag_media_recent(tag, options, cb);              */
  var tag_search;                       /* tag_search(query, cb);                           */

  var location;                         /* location(location_id, cb);                       */
  var location_media_recent;            /* location_media_recent(location_id, options, cb); */
  var location_search;                  /* location_search(spec, options, cb);              */

  var subscriptions;                    /* subscriptions(cb);                               */
  var del_subscription;                 /* del_subscription(options, cb);                   */
  var add_tag_subscription;             /* add_tag_subscription(tag, cb_url, cb);           */
  var add_geography_subscription;       /* add_geography_subscription(lat, lng, radius, cb_url, cb); */
  var add_user_subscription;            /* add_user_subscription(cb_url, cb);               */
  var add_location_subscription;        /* add_location_subscription(id, cb_url, cb);       */

  var get_authorization_url;            /* get_authorization_url(redirect_uri, permissions);*/
  var authorize_user;                   /* authorize_user(code, redirect_uri, cb);          */

  var oembed;                           /* oembed(url, cb);                             */

  // private
  var call;                             /* call(method, path, params, cb, retry);           */
  var handle_error;                     /* handle_error(body, cb, retry);                   */
  var sign_request;                     /* sign_request(endpoint, params, client_secret);   */
  var sort_object;                      /* sort_object(params);                             */

  var that = {};

  /*******************************/
  /*       Private helpers       */
  /*******************************/

  /**
   * Make a call on instagram API with the given params, path & method
   * @param method string the request method
   * @param path string the path
   * @param params object the params
   * @param cb function (err, result, remaining, limit);
   * @param retry function a retry function
   */
  call = function(method, path, params, cb, retry) {
    if(my.auth) {

      // Signature parameter
      if(params.sign_request || my.enforce_signed_requests) {
        try {
          var client_secret;

          if (params.sign_request) {
            client_secret = params.sign_request.client_secret;
            delete params.sign_request;
          } else {
            client_secret = my.auth.client_secret;
          }

          params['sig'] = sign_request(
            path,
            params,
            client_secret
          );
        }
        catch(err) {
          return handle_error(err, cb, retry);
        }
      }

      var options = {
        host: url.parse(my.host).hostname,
        port: my.port,
        method: method,
        path: '/v1' + path + (method === 'GET' || method === 'DELETE' ? '?' + query.stringify(params) : ''),
        agent: my.agent,
        headers: {}
      };

      // oauth and oembed calls don't use /v1
      if (path.search('oauth') >= 0 || path.search('oembed') >= 0) {
        options.path = options.path.substring(3); // chop off '/v1'
      }

      var data = null;

      if (method !== 'GET' && method !== 'DELETE') {
        data = query.stringify(params);
        options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        options.headers['Content-Length'] = data.length;
      }

      var req = https.request(options, function(res) {
        var body = '';
        res.setEncoding('utf8');

        res.on('data', function(chunk) {
          body += chunk;
        });

        res.on('end', function() {
          var result;
          var limit = parseInt(res.headers['x-ratelimit-limit'], 10) || 0;
          var remaining = parseInt(res.headers['x-ratelimit-remaining'], 10) || 0;
          my.limit = limit;
          my.remaining = remaining;

          try {
            result = JSON.parse(body);
          } catch(err) {
            return handle_error(err, cb, retry, res.statusCode, body);
          }

          return cb(null, result, remaining, limit);
        });
      });

      req.on('error', function(err) {
        return handle_error(err, cb, retry);
      });

      if (data !== null) {
        req.write(data);
      }

      req.end();

    } else {
      return handle_error(new Error('Must be authentified'), cb, retry);
    }
  };

  /**
   * Handle API errors
   * @param body object the response from instagram API
   * @param cb function (err);
   * @param retry function can be called to retry
   * @param status number the status code [opt]
   * @param bdy  string  the body received from instagram [opt]
   * Error objects can have
   *   - status_code status code [opt]
   *   - body body received      [opt]
   *   - error_type error type from instagram
   *   - error_message error message from instagram
   *   - code if error comes from instagram
   *   - retry a function that can be called to retry
   *           with same params
   */
  handle_error = function(body, retry, status, bdy) {
    if(body && ((body.meta && body.meta.error_type) || body.error_type)) {
      // if body is an instagram error
      if(!body.meta) {
        body.meta = {
          code: body.code,
          error_type: body.error_type,
          error_message: body.error_message
        };
      }
      var error = new Error(body.meta.error_type + ': ' + body.meta.error_message);
      error.code = body.meta.code;
      error.error_type = body.meta.error_type;
      error.error_message = body.meta.error_message;
      error.retry = retry;
      return error;
    } else if(body && body.message && body.stack) {
      // if body is an error
      body.retry = retry;
      if(status)
        body.status_code = status;
      if(bdy)
        body.body = bdy;
      return body;
    } else {
      var error = new Error('Unknown error');
      error.retry = retry;
      return error;
    }
  };

  /**
   * Sign the request using new instagram sign rules.
   * We are merging endpoint, params and client_secret and hashing all together
   * @param endpoint string api endpoint to call
   * @param params object api call params to be hashed
   * @param client_secret string the client secret to sign the request
   * @throws Error if arguments are not correct
   */
  sign_request = function(endpoint, params, client_secret) {
    if(typeof client_secret !== 'string') {
      throw new Error('Wrong param "client_secret"');
    }

    var sig = endpoint;

    params = sort_object(params);
    for (var key in params){
      if (params.hasOwnProperty(key)) {
        sig += "|"+key+"="+params[key];
      }
    }

    var hmac = crypto.createHmac('sha256', client_secret);
    hmac.update(sig);
    return hmac.digest('hex');
  };

  /**
   * Sort onject function.
   * We need to sort params that being added to api call.
   * @param object
   * @returns {Object}
   */
  sort_object = function(object) {
    var keys = Object.keys(object),
      i, len = keys.length;

    keys.sort();
    var newobj = new Object;
    for (i = 0; i < len; i++)
    {
      k = keys[i];
      newobj[k] = object[keys[i]];
    }
    return newobj;
  };

  /*****************************/
  /*      Public functions     */
  /*****************************/

  /**
   * Use the specified options to sign requests: can be an access_key
   * or a client_id/client_secret keys pair
   * @param options object { access_key } ||
   *                       { client_id, client_secret }
   * @throws Error if options is wrong
   */
  use = function(options) {
    if(typeof options === 'object') {
      if (typeof options.enforce_signed_requests != 'undefined') {
        my.enforce_signed_requests = options.enforce_signed_requests;
      }
      if(options.access_token) {
        my.limit = null;
        my.remaining = null;
        my.auth = {
          access_token: options.access_token
        };
        if (options.client_secret) {
          my.auth.client_secret = options.client_secret;
        }
      } else if(options.client_id && options.client_secret) {
        my.limit = null;
        my.remaining = null;
        my.auth = {
          client_id: options.client_id,
          client_secret: options.client_secret
        };
      } else {
        throw new Error('Wrong param "options"');
      }
    } else {
      throw new Error('Wrong param "options"');
    }
  };

  /**
   * Retrieves information about the given user
   * @param id string the user id
   * @param cb function (err, user, remaining, limit);
   */
  user = function(id, params) {
    var retry = function() {
      user(id, params);
    };

    var deferred = Q.defer();

    if(typeof id !== 'string' || id === '') {
      deferred.reject(handle_error(new Error('Wrong param "id"'),retry));
    }
    else if(!params.hasOwnProperty('access_token')) {
      deferred.reject(handle_error(new Error('Missing access token'), retry));
    }
    else {
      call('GET', '/users/' + id, params, function(err, result, remaining, limit) {
        if(err) {
          deferred.reject(handle_error(err, retry));
        } else if(result && result.meta && result.meta.code === 200) {
          var response = { data : result.data, remaining: remaining, limit: limit };
          deferred.resolve(response);
        } else {
          deferred.reject(handle_error(result, retry));
        }
      }, retry);
    }

    return deferred.promise;

  };

  /**
   * Retrieves the current user feed
   * @param params object { access_token }
   * @param cb function (err, feed, pagination, remaining, limit);
   */
  user_self = function(params) {
    var retry = function() {
      user_self(params);
    };

    var deferred = Q.defer();

    if(!params.hasOwnProperty('access_token')) {
      deferred.reject(handle_error(new Error('Missing access token'), retry));
    }
    else {
      call('GET', '/users/self', params, function(err, result, remaining, limit) {
        if(err) {
          deferred.reject(handle_error(err, retry));
        } else if(result && result.meta && result.meta.code === 200) {
          var response = { data : result.data, remaining: remaining, limit: limit };
          deferred.resolve(response);
        } else {
          deferred.reject(handle_error(result, retry));
        }
      }, retry);
    }

    return deferred.promise;

  };

  /**
   * Retrieves the current user likes
   * @param options object { count,        [opt]
   *                         max_like_id   [opt] }
   * @param cb function (err, likes, pagination, remaining, limit);
   */
  user_self_liked = function(options, params) {

    var retry = function() {
      user_self_liked(options);
    };

    var deferred = Q.defer();

    if(!params.hasOwnProperty('access_token')) {
      deferred.reject(handle_error(new Error('Missing access token'), retry));
    }
    else {

      if(options.count) {
        params.count = options.count;
      }
      if(options.max_like_id) {
        params.max_like_id = options.max_like_id;
      }

      call('GET', '/users/self/media/liked', params, function(err, result, remaining, limit) {
        if(err) {
          deferred.reject(handle_error(err, retry));
        } else if(result && result.meta && result.meta.code === 200) {
          if(result.pagination && result.pagination.next_max_like_id) {
            options = fwk.shallow(options);
            options.max_like_id = result.pagination.next_max_like_id;
            var next = function() {
              user_self_liked(options, params);
            };
            result.pagination.next = next;
            delete result.pagination.next_url;
          }
          var response = {data: result.data,
                          pagination: result.pagination || {},
                          remaining: remaining,
                          limit: limit };
          deferred.resolve(response);
        } else {
          deferred.reject(handle_error(result, retry));
        }
      }, retry);
    }

    return deferred.promise;

  };


  /**
   * Get the most recent media published by a user
   * @param user_id string the user id
   * @param options object { count,           [opt]
   *                         max_timestamp,   [opt]
   *                         min_timestamp,   [opt]
   *                         max_id,          [opt]
   *                         min_id           [opt] }
   * @param cb(err, results, pagination, remaining, limit);
   */
  user_media_recent = function(user_id, options, params) {
    var retry = function() {
      user_media_recent(user_id, options, params);
    };

    var deferred = Q.defer();

    if(typeof user_id !== 'string' || user_id === '') {
      deferred.reject(handle_error(new Error('Wrong param "user_id"'), retry));
    }
    else if (!params.hasOwnProperty('access_token')) {
      deferred.reject(handle_error(new Error('Missing access token'), retry));
    }
    else {

      if(options.count) {
        params.count = options.count;
      }
      if(options.max_id) {
        params.max_id = options.max_id;
      }
      if(options.min_id) {
        params.min_id = options.min_id;
      }

      call('GET', '/users/' + user_id + '/media/recent', params, function(err, result, remaining, limit) {
        if(err) {
          deferred.reject(handle_error(err, retry));
        } else if(result && result.meta && result.meta.code === 200) {
          if(result.pagination && result.pagination.next_max_id) {
            options = fwk.shallow(options);
            options.max_id = result.pagination.next_max_id;
            var next = function() {
              user_media_recent(user_id, options, params);
            };
            result.pagination.next = next;
            delete result.pagination.next_url;
          }
          var response = { data: result.data,
                          pagination: result.pagination || {},
                          remaining: remaining,
                          limit: limit };

          deferred.resolve(response);

        } else {
          deferred.reject(handle_error(result, retry));
        }
      }, retry);
    }
    return deferred.promise;
  };

  /**
   * Get the most recent media published by the user being authenticated
   * @param options object { count,           [opt]
   *                         max_id,          [opt]
   *                         min_id           [opt] }
   * @param cb(err, results, pagination, remaining, limit);
   */
  user_self_media_recent = function(options, params) {
    var retry = function() {
      user_self_media_recent(options, params);
    };

    var deferred = Q.defer();

    if(!params.hasOwnProperty('access_token')) {
      deferred.reject(handle_error(new Error('Missing access token'), retry));
    }
    else {
      var user_id = params.access_token.split('.')[0];
      return user_media_recent(user_id, options, params);
    }
    return deferred.promise;
  };

  /**
   * Search for a user according to the given query
   * @param query string the name to search for
   * @param options object { count [opt] }
   * @param cb function (err, users, limit);
   */
  user_search = function(query, options, params) {
    var retry = function() {
      user_search(query, options, params);
    };

    var deferred = Q.defer();

    if(typeof query !== 'string' || query === '') {
      deferred.reject(handle_error(new Error('Wrong param "query": ' + query), retry));
    }
    else if(!params.hasOwnProperty('access_token')) {
      deferred.reject(handle_error(new Error('Missing access token'), retry));
    }
    else {

      params.q = query;

      if(options.count) {
        params.count = options.count;
      }

      call('GET', '/users/search', params, function(err, result, remaining, limit) {
        if(err) {
          deferred.reject(handle_error(err, retry));
        } else if(result && result.meta && result.meta.code === 200) {
          var response = {
            data: result.data,
            remaining: remaining,
            limit: limit
          };
          deferred.resolve(response);
        } else {
          deferred.reject(handle_error(result, retry));
        }
      }, retry);
    }
    return deferred.promise;
  };

  /**
   * Retrieves the list of users the given user follows
   * @param user_id string the user to check
   * @param options object { count, [opt]
   *                         cursor [opt] }
   * @param cb function (err, users, pagination, remaining, limit);
   */
  user_follows = function(params) {
    var retry = function() {
      user_follows(params);
    };

    var deferred = Q.defer();

    if(!params.hasOwnProperty('access_token')) {
      deferred.reject(handle_error(new Error('Missing access token'), retry));
    }
    else {

      call('GET', '/users/self/follows', params, function(err, result, remaining, limit) {
        if(err) {
           deferred.reject(handle_error(err, retry));
         } else if(result && result.meta && result.meta.code === 200) {
          if(result.pagination && result.pagination.next_cursor) {
            options = fwk.shallow(options);
            options.cursor = result.pagination.next_cursor;
            var next = function() {
              user_follows(params);
            };
            result.pagination.next = next;
            delete result.pagination.next_url;
          }

          var response = {
            data:result.data,
            pagination: result.pagination || {},
            remaining: remaining,
            limit: limit
          };

          deferred.resolve(response);

         } else {
           deferred.reject(handle_error(result, retry));
         }
      }, retry);
    }
    return deferred.promise;
  };

  /**
   * Retrieves the list of users the given user is followed by
   * @param user_id string the user to check
   * @param options object { count, [opt]
   *                         cursor [opt] }
   * @param cb function (err, users, pagination, remaining, limit);
   */
  user_followers = function(params) {
    var retry = function() {
      user_followers(params);
    };

    var deferred = Q.defer();

    if(!params.hasOwnProperty('access_token')) {
      deferred.reject(handle_error(new Error('Missing access token'), retry));
    }
    else {

      call('GET', '/users/self/followed-by', params, function(err, result, remaining, limit) {
        if(err) {
          deferred.reject(handle_error(err, retry));
        } else if(result && result.meta && result.meta.code === 200) {
          if(result.pagination && result.pagination.next_cursor) {
            options = fwk.shallow(options);
            options.cursor = result.pagination.next_cursor;
            var next = function() {
              user_followers(params);
            };
            result.pagination.next = next;
            delete result.pagination.next_url;
          }

          var response = {
            data: result.data,
            pagination: result.pagination || {},
            remaining: remaining,
            limit: limit
          };

          deferred.resolve(response);

        } else {
          deferred.reject(handle_error(result, retry));
        }
      }, retry);
    }
    return deferred.promise;
  };

  /**
   * Retrieves the list of users who have requested the current users's
   * permission to follow
   * @param cb function (err, users, limit);
   */
  user_self_requested_by = function(params) {
    var retry = function() {
      user_self_requested_by(params);
    };

    var deferred = Q.defer();

    if(!params.hasOwnProperty('access_token')) {
      deferred.reject(handle_error(new Error('Missing access token'), retry));
    }
    else {

      call('GET', '/users/self/requested-by', params, function(err, result, remaining, limit) {
        if(err) {
          deferred.reject(handle_error(err, retry));
        } else if(result && result.meta && result.meta.code === 200) {
          var response = {
            data: result.data,
            remaining: remaining,
            limit: limit
          };
          deferred.resolve(response);
        } else {
          deferred.reject(handle_error(result, retry));
        }
      }, retry);
    }
    return deferred.promise;
  };

  /**
   * Get information about a relationship to another user
   * @param user_id string the user to check
   * @param cb function (err, result, limit);
   */
  user_relationship = function(user_id, params) {
    var retry = function() {
      user_relationship(user_id, params);
    };

    var deferred = Q.defer();

    if(typeof user_id !== 'string' || user_id === '') {
      deferred.reject(handle_error(new Error('Wrong param "user_id"'), retry));
    }
    else if(!params.hasOwnProperty('access_token')) {
      deferred.reject(handle_error(new Error('Missing access token'), retry));
    }
    else {
      call('GET', '/users/' + user_id + '/relationship', params, function(err, result, remaining, limit) {
        if(err) {
          deferred.reject(handle_error(err, retry));
        } else if(result && result.meta && result.meta.code === 200) {
          var response = {
            data: result.data,
            remaining: remaining,
            limit: limit
          };
          deferred.resolve(response);
        } else {
          deferred.reject(handle_error(result, retry));
        }
      }, retry);
    }
    return deferred.promise;
  };

  /**
   * Modify the relationship between current user and the target user
   * @param user_id string the target user
   * @param action string 'follow' || 'unfollow' || 'block' || 'unblock' || 'approve' || 'ignore'
   * @param options object { sign_request: {
   *                           client_secret: 'xxx'
   *                       }}
   * @param cb function (err, result, limit);
   */
  set_user_relationship = function(user_id, action, params) {
    var retry = function() {
      set_user_relationship(user_id, action,params);
    };

    var deferred = Q.defer();

    if(typeof user_id !== 'string' || user_id === '') {
      deferred.reject(handle_error(new Error('Wrong param "user_id"'), retry));
    }
    else if(!params.hasOwnProperty('access_token')) {
      deferred.reject(handle_error(new Error('Missing access token'), retry));
    }
    else {

      if(['follow', 'unfollow', 'block', 'unblock', 'approve', 'ignore'].indexOf(action.toLowerCase()) === -1) {
        return handle_error(new Error('Wrong param "action"'), cb);
      }

      params.action = action.toLowerCase();

      call('POST', '/users/' + user_id + '/relationship', params, function(err, result, remaining, limit) {
        if(err) {
          deferred.reject(handle_error(err, retry));
        } else if(result && result.meta && result.meta.code === 200) {
          var response = {
            data: result.data,
            remaining: remaining,
            limit: limit
          }
          deferred.resolve(response);
        } else {
          deferred.reject(handle_error(result, retry));
        }
      }, retry);
    }
    return deferred.promise;
  };

  /**
   * Retrieves information about a given media
   * @param media_id string the id of the media
   * @param cb function (err, result, limit);
   */
  media = function(media_id, params) {
    var retry = function() {
      media(media_id, params);
    };

    var deferred = Q.defer();

    if(typeof media_id !== 'string' || media_id === '') {
      deferred.reject(handle_error(new Error('Wrong param "media_id"'), retry));
    }
    else if(!params.hasOwnProperty('access_token')) {
      deferred.reject(handle_error(new Error('Missing access token'), retry));
    }
    else {

      call('GET', '/media/' + media_id, params, function(err, result, remaining, limit) {
        if(err) {
          deferred.reject(handle_error(err, retry));
        } else if(result && result.meta && result.meta.code === 200) {
          var response = {
            data: result.data,
            remaining: remaining,
            limit: limit
          };
          deferred.resolve(response);
        } else {
          deferred.reject(handle_error(result, retry));
        }
      }, retry);
    }
    return deferred.promise;
  };

  /**
   * Retrieves information about a media with given shortcode
   * @param media_shortcode string the shortcode of the media
   * For media http://instagram.com/p/ABC/ shortcode is ABC
   * @param cb function (err, result, limit);
   */
  media_shortcode = function(media_shortcode, params) {
      var retry = function() {
          media_shortcode(media_shortcode, params);
      };

      var deferred = Q.defer();

      if(typeof media_shortcode !== 'string' || media_shortcode === '') {
        deferred.reject(handle_error(new Error('Wrong param "media_shortcode"'), retry));
      }
      else if(!params.hasOwnProperty('access_token')) {
        deferred.reject(handle_error(new Error('Missing access token'), retry));
      }
      else {
        call('GET', '/media/shortcode/' + media_shortcode, params, function(err, result, remaining, limit) {
          if(err) {
            deferred.reject(handle_error(err, retry));
          } else if(result && result.meta && result.meta.code === 200) {
            var response = {
              data: result.data,
              remaining: remaining,
              limit: limit
            };
            deferred.resolve(response);
          } else {
            deferred.reject(handle_error(result, retry));
          }
        }, retry);
      }
      return deferred.promise;
  };

  /**
   * Search for media in a given area
   * @param lat number the latitude
   * @param lng number the longitude
   * @param options object { min_timestamp,    [opt]
   *                         max_timestamp,    [opt]
   *                         distance          [opt] }
   * @param cb function (err, result, limit);
   */
  media_search = function(lat, lng, distance, params) {
    var retry = function() {
      media_search(lat, lng, distance, params);
    };

    var deferred = Q.defer();

    if(typeof lat !== 'number' || typeof lng !== 'number') {
      deferred.reject(handle_error(new Error('Wrong params "lat" & "lng"'), retry));
    }
    else if (!params.hasOwnProperty('access_token')) {
      deferred.reject(handle_error(new Error('Missing access token'), retry));
    }
    else {

      params.lat = lat;
      params.lng = lng;
      params.distance = distance;

      call('GET', '/media/search', params, function(err, result, remaining, limit) {
        if(err) {
          deferred.reject(handle_error(err, retry));
        } else if(result && result.meta && result.meta.code === 200) {
          var response = {
            data: result.data,
            remaining: remaining,
            limit: limit
          };
          deferred.resolve(response);
        } else {
          deferred.reject(handle_error(result, retry));
        }
      }, retry);
    }
    return deferred.promise;

  };

  /**
   * Retrieves all the comments for the given media
   * @param media_id string the media id
   * @param cb function (err, result, limit);
   */
  comments = function(media_id, params) {
    var retry = function() {
      comments(media_id, params);
    };

    var deferred = Q.defer();

    if(typeof media_id !== 'string' || media_id === '') {
      deferred.reject(handle_error(new Error('Wrong param "media_id"'), retry));
    }
    else if(!params.hasOwnProperty('access_token')) {
      deferred.reject(handle_error(new Error('Missing access token'), retry));
    }
    else {

      call('GET', '/media/' + media_id + '/comments', params, function(err, result, remaining, limit) {
        if(err) {
          deferred.reject(handle_error(err, retry));
        } else if(result && result.meta && result.meta.code === 200) {
          var response = {
            data: result.data,
            remaining: remaining,
            limit: limit
          };
          deferred.resolve(response);
        } else {
          deferred.reject(handle_error(result, cb, retry));
        }
      }, retry);
    }
    return deferred.promise;
  };

  /**
   * Add a comment on the given media
   * @param media_id string the media id
   * @param text string the text to post
   * @param options object { sign_request: {
   *                           client_secret: 'xxx'
   *                       }}
   * @param cb function (err, limit);
   */
  add_comment = function(media_id, text, params) {
    var retry = function() {
      add_comment(media_id, text, params);
    };

    var deferred = Q.defer();

    if(typeof media_id !== 'string' || media_id === '' ||
       typeof text !== 'string' || text === '') {
      deferred.reject(handle_error(new Error('Wrong param "media_id" or "text"'), retry));
    }
    else  if(!params.hasOwnProperty('access_token')) {
      deferred.reject(handle_error(new Error('Missing access token'), retry));
    }
    else {

      params.text = text;

      call('POST', '/media/' + media_id + '/comments', params, function(err, result, remaining, limit) {
        if(err) {
          deferred.reject(handle_error(err, retry));
        } else if(result && result.meta && result.meta.code === 200) {
          var response = {
            data: result.data,
            remaining: remaining,
            limit: limit
          };
          deferred.resolve(response);
        } else {
          deferred.reject(handle_error(result, retry));
        }
      }, retry);
    }
    return deferred.promise;
  };

  /**
   * Delete the given comment from the given media
   * @param media_id string the media id
   * @param comment_id string the comment id
   * @param options object { sign_request: {
   *                           client_secret: 'xxx'
   *                       }}
   * @param cb function (err, limit);
   */
  del_comment = function(media_id, comment_id, params) {

    var retry = function() {
      del_comment(media_id, comment_id, params);
    };

    var deferred = Q.defer();

    if(typeof media_id !== 'string' || media_id === '' ||
       typeof comment_id !== 'string' || comment_id === '') {
      deferred.reject(handle_error(new Error('Wrong param "media_id" or "comment_id"'), retry));
    }
    else  if(!params.hasOwnProperty('access_token')) {
      deferred.reject(handle_error(new Error('Missing access token'), retry));
    }
    else {

      call('DELETE', '/media/' + media_id + '/comments/' + comment_id, params, function(err, result, remaining, limit) {
        if(err) {
          deferred.reject(handle_error(err, cb, retry));
        } else if(result && result.meta && result.meta.code === 200) {
          var response = {
            remaining: remaining,
            limit: limit
          };
          deferred.resolve(response);
        } else {
          deferred.reject(handle_error(result, retry));
        }
      }, retry);
    }
    return deferred.promise;
  };

  /**
   * Retrieves all the likes for the given media
   * @param media_id string the media id
   * @param cb function (err, result, limit);
   */
  likes = function(media_id, params) {
    var retry = function() {
      likes(media_id, params);
    };

    var deferred = Q.defer();

    if(typeof media_id !== 'string' || media_id === '') {
      deferred.reject(handle_error(new Error('Wrong param "media_id"'), retry));
    }
    else  if(!params.hasOwnProperty('access_token')) {
      deferred.reject(handle_error(new Error('Missing access token'), retry));
    }
    else {

      call('GET', '/media/' + media_id + '/likes', params, function(err, result, remaining, limit) {
        if(err) {
          deferred.reject(handle_error(err, retry));
        } else if(result && result.meta && result.meta.code === 200) {
          var response = {
            data: result.data,
            remaining: remaining,
            limit: limit
          };
          deferred.resolve(response);
        } else {
          deferred.reject(handle_error(result, retry));
        }
      }, retry);
    }
    return deferred.promise;
  };

  /**
   * Add a like on the given media
   * @param media_id string the media id
   * @param options object { sign_request: {
   *                           client_secret: 'xxx'
   *                       }}
   * @param cb function (err, limit);
   */
  add_like = function(media_id, params) {
    var retry = function() {
      add_like(media_id, params);
    };

    var deferred = Q.defer();

    if(typeof media_id !== 'string' || media_id === '') {
      deferred.reject(handle_error(new Error('Wrong param "media_id"'), retry));
    }
    else if(!params.hasOwnProperty('access_token')) {
      deferred.reject(handle_error(new Error('Missing access token'), retry));
    }
    else {
      call('POST', '/media/' + media_id + '/likes', params, function(err, result, remaining, limit) {
        if(err) {
          deferred.reject(handle_error(err, retry));
        } else if(result && result.meta && result.meta.code === 200) {
          var response = {
            remaining: remaining,
            limit: limit
          };
          deferred.resolve(response);
        } else {
          deferred.reject(handle_error(result, retry));
        }
      }, retry);
    }
    return deferred.promise;
  };

  /**
   * Delete the like from the given media
   * @param media_id string the media id
   * @param options object { sign_request: {
   *                           client_secret: 'xxx'
   *                       }}
   * @param cb function (err, limit);
   */
  del_like = function(media_id, params) {
    var retry = function() {
      del_like(media_id, params);
    };

    var deferred = Q.defer();

    if(typeof media_id !== 'string' || media_id === '') {
      deferred.reject(handle_error(new Error('Wrong param "media_id"'), retry));
    }
    else if(!params.hasOwnProperty('access_token')) {
      deferred.reject(handle_error(new Error('Missing access token'), retry));
    }
    else {
      call('DELETE', '/media/' + media_id + '/likes', params, function(err, result, remaining, limit) {
        if(err) {
          deferred.reject(handle_error(err, retry));
        } else if(result && result.meta && result.meta.code === 200) {
          var response = {
            remaining: remaining,
            limit: limit
          };
          deferred.resolve(response);
        } else {
          deferred.reject(handle_error(result, retry));
        }
      }, retry);
    }
    return deferred.promise;

  };

  /**
   * Retrieves information about a tag
   * @param _tag string the tag
   * @param cb function (err, result, limit);
   */
  tag = function(_tag, params) {
    var retry = function() {
      tag(_tag, params);
    };

    var deferred = Q.defer();

    if(typeof _tag !== 'string' || _tag === '') {
      deferred.reject(handle_error(new Error('Wrong param "tag"'), retry));
    }
    else if(!params.hasOwnProperty('access_token')) {
      deferred.reject(handle_error(new Error('Missing access token'), retry));
    }
    else {
      call('GET', '/tags/' + encodeURIComponent(_tag), params, function(err, result, remaining, limit) {
        if(err) {
          deferred.reject(handle_error(err, retry));
        } else if(result && result.meta && result.meta.code === 200) {
          var response = {
            data: result.data,
            remaining: remaining,
            limit: limit
          };
          deferred.resolve(response);
        } else {
          deferred.reject(handle_error(result, retry));
        }
      }, retry);
    }
    return deferred.promise;
  };

  /**
   * Get recent medias for the given tag
   * @param tag string the tag
   * @param options object { min_id,     [opt]
   *                         max_id      [opt] }
   * @param cb function (err, result, pagination, remaining, limit);
   */
  tag_media_recent = function(tag, options, params) {
    var retry = function() {
      tag_media_recent(tag, options, params);
    };

    var deferred = Q.defer();

    if(typeof tag !== 'string' || tag === '') {
      deferred.reject(handle_error(new Error('Wrong param "tag"'), retry));
    }
    else if(!params.hasOwnProperty('access_token')) {
      deferred.reject(handle_error(new Error('Missing access token'), retry));
    }
    else {

      if(options.min_id || options.min_tag_id) {
        params.min_tag_id = options.min_id || options.min_tag_id;
      }
      if(options.max_id || options.max_tag_id) {
        params.max_tag_id = options.max_id || options.max_tag_id;
      }
      if(options.count) {
        params.count = options.count;
      }

      call('GET', '/tags/' + encodeURIComponent(tag) + '/media/recent', params, function(err, result, remaining, limit) {
        if(err) {
          return handle_error(err, cb, retry);
        } else if(result && result.meta && result.meta.code === 200) {
          if(result.pagination && result.pagination.max_tag_id) {
            options = fwk.shallow(options);
            // Syntax weirdness coming from IG API (max_tag_id instead of max_id)
            // [see http://instagram.com/developer/endpoints/tags/]
            options.max_tag_id = result.pagination.max_tag_id;
            var next = function(cb) {
              tag_media_recent(tag, options, params);
            };
            result.pagination.next = next;
            delete result.pagination.next_url;
          }

          var response = {
            data: result.data,
            pagination: result.pagination || {},
            remaining: remaining,
            limit: limit
          };
          deferred.resolve(response);
        } else {
          deferred.reject(handle_error(result, retry));
        }
      }, retry);
    }
    return deferred.promise;
  };

  /**
   * Search for tags by name
   * @param query string the search to perform
   * @param cb function (err, result, limit);
   */
  tag_search = function(query, params) {
    var retry = function() {
      tag_search(query, params);
    };

    var deferred = Q.defer();

    if(typeof query !== 'string' || query === '') {
      deferred.reject(handle_error(new Error('Wrong param "query"'), retry));
    }
    else if(!params.hasOwnProperty('access_token')) {
      deferred.reject(handle_error(new Error('Missing access token'), retry));
    }
    else {

      params.q = query;

      call('GET', '/tags/search', params, function(err, result, remaining, limit) {
        if(err) {
          deferred.reject(handle_error(err, retry));
        } else if(result && result.meta && result.meta.code === 200) {
          var response = {
            data: result.data,
            remaining: remaining,
            limit: limit
          };
          deferred.resolve(response);
        } else {
          deferred.reject(handle_error(result, cb, retry));
        }
      }, retry);
    }
    return deferred.promise;
  };


  /**
   * Retrieves information about a location
   * @param location_id string the location id
   * @param cb function (err, result, limit);
   */
  location = function(location_id, params) {
    var retry = function() {
      location(location_id, params);
    };

    var deferred = Q.defer();

    if(typeof location_id !== 'string' || location_id === '') {
      deferred.reject(handle_error(new Error('Wrong param "location_id"'), retry));
    }
    else if(!params.hasOwnProperty('access_token')) {
      deferred.reject(handle_error(new Error('Missing access token'), retry));
    }
    else {
      call('GET', '/locations/' + location_id, params, function(err, result, remaining, limit) {
        if(err) {
          deferred.reject(handle_error(err, retry));
        } else if(result && result.meta && result.meta.code === 200) {
          var response = {
            data:result.data,
            remaining: remaining,
            limit: limit
          };
          deferred.resolve(response);
        } else {
          deferred.reject(handle_error(result, cb, retry));
        }
      }, retry);
    }
    return deferred.promise;
  };

  /**
   * Get recent medias for the given location
   * @param location_id string the location id
   * @param options object { min_id,          [opt]
   *                         max_id,          [opt]
   *                         min_timestamp,   [opt]
   *                         max_timestamp    [opt] }
   * @param cb function (err, result, pagination, remaining, limit);
   */
  location_media_recent = function(location_id, options, params) {
    var retry = function() {
      location_media_recent(location_id, options, params);
    };

    var deferred = Q.defer();

    if(typeof location_id !== 'string' || location_id === '') {
      deferred.reject(handle_error(new Error('Wrong param "location_id"'), retry));
    }
    else if(!params.hasOwnProperty('access_token')) {
      deferred.reject(handle_error(new Error('Missing access token'), retry));
    }
    else {

      if(options.min_id) {
        params.min_id = options.min_id;
      }

      if(options.max_id) {
        params.max_id = options.max_id;
      }

      call('GET', '/locations/' + location_id + '/media/recent', params, function(err, result, remaining, limit) {
        if(err) {
          deferred.reject(handle_error(err, retry));
        } else if(result && result.meta && result.meta.code === 200) {
          if(result.pagination && result.pagination.next_max_id) {
            options = fwk.shallow(options);
            options.max_id = result.pagination.next_max_id;
            var next = function() {
              location_media_recent(location_id, options, params);
            };
            result.pagination.next = next;
            delete result.pagination.next_url;
          }
          var response = {
            data: result.data,
            pagination: result.pagination || {},
            remaining: remaining,
            limit: limit
          };
          deferred.resolve(response);
        } else {
          deferred.reject(handle_error(result, retry));
        }
      }, retry);
    }
    return deferred.promise;
  };

  /**
   * Search for locations by lat/lng
   * @param spec object { lat, lng } ||
   *                    { foursquare_v2_id } ||
   *                    { foursquare_id } ||
   *                    { facebook_places_id }
   * @param options object { distance [opt] }
   * @param cb function (err, result, limit);
   */
  location_search = function(spec, options, params) {
    var retry = function() {
      location_search(spec, options, params);
    };

    var deferred = Q.defer();

    if(options.distance) {
      params.distance = options.distance;
    }

    if(typeof spec.lat !== 'number' || typeof spec.lng !== 'number') {
      deferred.reject(handle_error(new Error('Wrong param "lat/lng" or"facebook_places_id"'), retry));
    } else if(!spec.facebook_places_id && (typeof spec.lat !== 'number' || typeof spec.lng !== 'number')) {
      deferred.reject(handle_error(new Error('Wrong param "lat/lng" or "facebook_places_id"'), retry));
    } else if(!params.hasOwnProperty('access_token')) {
      deferred.reject(handle_error(new Error('Missing access token'), retry));
    }
    else {
      if(spec.lat && spec.lng) {
        params.lat = spec.lat;
        params.lng = spec.lng;
      }
      else if(spec.facebook_places_id) {
        params.facebook_places_id = spec.facebook_places_id;
      }

      call('GET', '/locations/search', params, function(err, result, remaining, limit) {
        if(err) {
          deferred.reject(handle_error(err, retry));
        } else if(result && result.meta && result.meta.code === 200) {
          var response = {
            data:result.data,
            remaining: remaining,
            limit: limit
          };
          deferred.resolve(response);
        } else {
          deferred.reject(handle_error(result, retry));
        }
      }, retry);
    }
    return deferred.promise;
  };

  /**
   * Retrieve authentication URL for user.
   * @param redirect_uri string the url to redirect to
   * @param options object { scope, [opt] array ['likes', 'comments', 'relationships']
   *                         state  [opt] string}
   * @return url string the formated url
   * @throw err if client_id/client_secret are not set.
   */
  get_authorization_url = function(redirect_uri, options) {
    var options = options || {};
    var url_obj = url.parse(my.host);
    url_obj.pathname = '/oauth/authorize';

    if(!my.auth.client_id || !my.auth.client_secret) {
      throw new Error('Please supply client_id and client_secret via use()');
    }

    var params = {
      client_id: my.auth.client_id,
      redirect_uri: redirect_uri,
      response_type: 'code'
    };

    if(options.state) {
      params.state = options.state;
    }

    url_obj.query = params;

    var auth_url = url.format(url_obj);

    if(Array.isArray(options.scope)) {
      auth_url += '&scope=' + options.scope.join('+');
    }

    return auth_url;
  };

  /**
   * Authorizes a user and returns the response from the server.
   * This is the final leg in instagram's authentication process.
   * Note this function also sets and uses the access token that
   * was retrieved via authentication.
   * @param code string the code received from instagram
   *    Passed as a get parameter to a redirect uri once a user has
   *    authenticated via Instagram. See Instagram's Authorization
   *    API documentation for more information
   * @param redirect_uri string the url to redirect to
   * @param cb function (err, result);
   */
  authorize_user = function(code, redirect_uri, cb) {
    var retry = function() {
      authorize_user(code, redirect_uri, cb);
    };

    var params = {
      client_id: my.auth.client_id,
      client_secret: my.auth.client_secret,
      grant_type: 'authorization_code',
      redirect_uri: redirect_uri,
      code: code
    };

    call('POST', '/oauth/access_token', params, function(err, result, remaining, limit) {
      if(err) {
        return handle_error(err, cb, retry);
      }
      else if(result && result.access_token) {
        return cb(null, result);
      }
      else {
        return handle_error(result, cb, retry);
      }
    }, retry);
  };

  /**
   * Retrieves information about a given media based on its url (see http://instagram.com/developer/embedding/)
   * @param url string the url of the instagram media item to get the oEmbed data for
   * @param options object { callback,     [opt]
   *                         omitscript,   [opt]
   *                         hidecaption,  [opt]
   *                         maxwidth      [opt] }
   * @param cb function (err, result, limit);
   */
  oembed = function(url, options, cb) {
    var retry = function() {
      oembed(url, options, cb);
    }

    if(!cb && typeof options === 'function') {
      cb = options;
      options = {};
    }
    var params = {};

    if(typeof url !== 'string' || url === '') {
      return handle_error(new Error('Wrong param "url"'), cb, retry);
    }
    else {
      params.url = url;
    }

    if(options.callback) {
      params.callback = options.callback;
    }
    if(options.omitscript) {
      params.omitscript = options.omitscript;
    }
    if(options.hidecaption) {
      params.hidecaption = options.hidecaption;
    }
    if(options.maxwidth) {
      params.maxwidth = options.maxwidth;
    }

    call('GET', '/oembed/', params, function(err, result, remaining, limit) {
      if(err) {
        return handle_error(err, cb, retry);
      } else if(result) {
        return cb(null, result, remaining, limit);
      } else {
        return handle_error(result, cb, retry);
      }
    }, retry);
  };

  /**
   * Get a list of realtime subscriptions (see http://instagram.com/developer/realtime/#list-your-subscriptions)
   * @param  function cb      function (err, result, limit);
   */
  subscriptions = function(){
    var retry = function(){
      subscriptions();
    };

    var deferred = Q.defer();

    var params = {};

    if(!my.auth.client_id || !my.auth.client_secret) {
      deferred.reject(handle_error(new Error('Missing client_id client_secret'), retry));
    }
    else {

      params.client_id = my.auth.client_id;
      params.client_secret = my.auth.client_secret;

      call('GET', '/subscriptions/', params, function(err, result, remaining, limit) {
        if(err) {
          deferred.promise(handle_error(err, retry));
        } else if(result && result.meta && result.meta.code === 200) {
          var response = {
            data: result.data,
            remaining: remaining,
            limit: limit
          };
          deferred.resolve(response);
        } else {
          deferred.reject(handle_error(result, retry));
        }
      }, retry);
    }
    return deferred.promise;
  };

  /**
   * Add a subscription on a tag
   * @param tag string the tag on which to subscribe
   * @param callback_url string the url on which to be called back
   * @param options object { verify_token }
   * @param cb function(err, result)
   */
  add_tag_subscription = function(tag, callback_url, options){
    var retry = function(){
      add_tag_subscription(tag, callback_url, options);
    };

    var deferred = Q.defer();

    if(!my.auth.client_id || !my.auth.client_secret) {
      deferred.reject(handle_error(new Error('Missing client_id client_secret'), retry));
    }
    else {

      var params = {
        callback_url: callback_url,
        object: 'tag',
        aspect: 'media',
        object_id: tag
      };

      if(options.verify_token) {
        params.verify_token = options.verify_token;
      }

      params.client_id = my.auth.client_id;
      params.client_secret = my.auth.client_secret;

      call('POST', '/subscriptions/', params, function(err, result, remaining, limit) {
        if(err) {
          deferred.reject(handle_error(err, retry));
        } else if(result && result.meta && result.meta.code === 200) {
          var response = {
            data: result.data,
            remaining: remaining,
            limit: limit
          };
          deferred.resolve(response);
        } else {
          deferred.reject(handle_error(result, retry));
        }
      }, retry);
    }

    return deferred.promise;

  };

  /**
   * Subscribe to posts in a geographical circle (see http://instagram.com/developer/realtime/#geography-subscriptions)
   * @param  {Number}   lat          Latitude of center of circle
   * @param  {Number}   lng         Longitude of center of circle
   * @param  {Number}   radius       Radius of circle, in meters
   * @param  {String}   callback_url URL to be called back when a new post is from this geographical circle
   * @param  {Object}   options { verify_token }
   * @param  {Function} cb           function (err, result, limit);
   */
  add_geography_subscription = function(lat, lng, radius, callback_url, options){
    var retry = function(){
      add_geography_subscription(lat, lng, radius, callback_url, options);
    };

    var deferred = Q.defer();

    if(!my.auth.client_id || !my.auth.client_secret) {
      deferred.reject(handle_error(new Error('Missing client_id client_secret'), retry));
    }
    else {

      var params = {
        callback_url: callback_url,
        object:'geography',
        lat: lat,
        lng: lng,
        radius: radius,
        aspect: 'media'
      };

      if(options.verify_token) {
        params.verify_token = options.verify_token;
      }

      params.client_id = my.auth.client_id;
      params.client_secret = my.auth.client_secret;

      call('POST', '/subscriptions/', params, function(err, result, remaining, limit) {
        if(err) {
          deferred.reject(handle_error(err, retry));
        } else if(result && result.meta && result.meta.code === 200) {
          var response = {
            data: result.data,
            remaining: remaining,
            limit: limit
          };
          deferred.resolve(response);
        } else {
          deferred.reject(handle_error(result, retry));
        }
      }, retry);
    }

    return deferred.promise;

  };

  /**
   * Subscribe to posts from your subscribed users (see http://instagram.com/developer/realtime/#user-subscriptions)
   * @param  {String}   callback_url URL to be called back when a new post is from this user
   * @param  {Object}   options { verify_token }
   * @param  {Function} cb           function (err, result, limit);
   */
  add_user_subscription = function(callback_url, options){
    var retry = function(){
      add_user_subscription(callback_url, options);
    };

    var deferred = Q.defer();

    if(!my.auth.client_id || !my.auth.client_secret) {
      deferred.reject(handle_error(new Error('Missing client_id client_secret'), retry));
    }
    else {

      var params = {
        callback_url: callback_url,
        object:'user',
        aspect: 'media'
      };

      if(options.verify_token) {
        params.verify_token = options.verify_token;
      }

      params.client_id = my.auth.client_id;
      params.client_secret = my.auth.client_secret;

      call('POST', '/subscriptions/', params, function(err, result, remaining, limit) {
        if(err) {
          deferred.reject(handle_error(err, retry));
        } else if(result && result.meta && result.meta.code === 200) {
          var response = {
            data: result.data,
            remaining: remaining,
            limit: limit
          };
          deferred.resolve(response);
        } else {
          deferred.reject(handle_error(result, retry));
        }
      }, retry);
    }
    return deferred.promise;
  };


  /**
   * Subscribe to posts from a specific location (see http://instagram.com/developer/realtime/#location-subscriptions)
   * @param  {Number}   location_id  a specific Instagram location
   * @param  {String}   callback_url URL to be called back when a new post is in this location
   * @param  {Function} cb           function (err, result, limit);
   */
  add_location_subscription = function(location_id, callback_url, options){
    var retry = function(){
      add_location_subscription(location_id, callback_url, options);
    };

    var deferred = Q.defer();

    if(!my.auth.client_id || !my.auth.client_secret) {
      deferred.reject(handle_error(new Error('Missing client_id client_secret'), retry));
    }
    else {

      var params = {
        callback_url: callback_url,
        object:'location',
        object_id: location_id,
        aspect: 'media'
      };

      if(options.verify_token) {
        params.verify_token = options.verify_token;
      }

      params.client_id = my.auth.client_id;
      params.client_secret = my.auth.client_secret;

      call('POST', '/subscriptions/', params, function(err, result, remaining, limit) {
        if(err) {
          deferred.reject(handle_error(err, retry));
        } else if(result && result.meta && result.meta.code === 200) {
          var repsonse = {
            data: result.data,
            remaining: remaining,
            limit: limit
          };
          deferred.resolve(repsonse);
        } else {
          deferred.reject(handle_error(result, retry));
        }
      }, retry);
    }
    return deferred.promise;
  };

  /**
   * Delete a realtime subscription
   * @param  {Object}   options search (see http://instagram.com/developer/realtime/#delete-subscriptions)
   * @param  {Function} cb      function (err, result, limit);
   */
  del_subscription = function(options){
    var retry = function(){
      del_subscription(options);
    };

    var deferred = Q.defer();

    if(!my.auth.client_id || !my.auth.client_secret) {
      deferred.reject(handle_error(new Error('Missing client_id client_secret'), retry));
    }
    else {

      var params = {};

      if(options.id) {
        params.id = options.id;
      }
      if(options.all) {
        params.object = 'all';
      }

      params.client_id = my.auth.client_id;
      params.client_secret = my.auth.client_secret;

      call('DELETE', '/subscriptions/', params, function(err, result, remaining, limit) {
        if(err) {
          deferred.reject(handle_error(err, retry));
        } else if(result && result.meta && result.meta.code === 200) {
          var response = {
            data: result.data,
            remaining: remaining,
            limit: limit
          };
          deferred.resolve(response);
        } else {
          deferred.reject(handle_error(result, retry));
        }
      }, retry);
    }
    return deferred.promise;
  };

  fwk.method(that, 'use', use, _super);

  fwk.method(that, 'user', user, _super);
  fwk.method(that, 'user_self', user_self, _super);
  fwk.method(that, 'user_media_recent', user_media_recent, _super);
  fwk.method(that, 'user_self_media_recent', user_self_media_recent, _super);
  fwk.method(that, 'user_self_liked', user_self_liked, _super);
  fwk.method(that, 'user_search', user_search, _super);

  fwk.method(that, 'user_follows', user_follows, _super);
  fwk.method(that, 'user_followers', user_followers, _super);
  fwk.method(that, 'user_self_requested_by', user_self_requested_by, _super);
  fwk.method(that, 'user_relationship', user_relationship, _super);
  fwk.method(that, 'set_user_relationship', set_user_relationship, _super);

  fwk.method(that, 'media', media, _super);
  fwk.method(that, 'media_shortcode', media_shortcode, _super);
  fwk.method(that, 'media_search', media_search, _super);

  fwk.method(that, 'comments', comments, _super);
  fwk.method(that, 'add_comment', add_comment, _super);
  fwk.method(that, 'del_comment', del_comment, _super);

  fwk.method(that, 'likes', likes, _super);
  fwk.method(that, 'add_like', add_like, _super);
  fwk.method(that, 'del_like', del_like, _super);

  fwk.method(that, 'tag', tag, _super);
  fwk.method(that, 'tag_media_recent', tag_media_recent, _super);
  fwk.method(that, 'tag_search', tag_search, _super);

  fwk.method(that, 'location', location, _super);
  fwk.method(that, 'location_media_recent', location_media_recent, _super);
  fwk.method(that, 'location_search', location_search, _super);

  fwk.method(that, 'get_authorization_url', get_authorization_url, _super);
  fwk.method(that, 'authorize_user', authorize_user, _super);

  fwk.method(that, 'oembed', oembed, _super);

  fwk.method(that, 'subscriptions', subscriptions, _super);
  fwk.method(that, 'del_subscription', del_subscription, _super);
  fwk.method(that, 'add_tag_subscription', add_tag_subscription, _super);
  fwk.method(that, 'add_geography_subscription', add_geography_subscription, _super);
  fwk.method(that, 'add_user_subscription', add_user_subscription, _super);
  fwk.method(that, 'add_location_subscription', add_location_subscription, _super);

  fwk.getter(that, 'limit', my, 'limit');
  fwk.getter(that, 'remaining', my, 'remaining');

  return that;
};

exports.instagram = instagram;
