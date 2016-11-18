var http = require('http');
var express = require('express');
var api = require('instagramapi').instagram();
var Q = require('q');
var app = express();

api.use({
  client_id: 'c4507ca2563d475f804bb441bda56299',
  client_secret: 'e9ac545b1fcc41a596492d495b89e980'
});

app.set('port', 8080);

var redirect_uri = 'http://localhost:8080/handleauth';

exports.authorize_user = function(req, res) {
  var authURL = api.get_authorization_url(redirect_uri,{
    scope: ['likes+comments+public_content+follower_list+relationships'],
    state: 'a state' });
  res.redirect(authURL);
};

exports.handleauth = function(req, res) {
  api.authorize_user(req.query.code, redirect_uri, function(err, result) {
    if (err) {
      console.log(err.body);
      res.send("Didn't work");
    } else {

      var params = {
        access_token: result.access_token
      }

      // var userPromise = api.user(result.user.id,params);
      //
      // userPromise.then(function apiUserResponse(result) {
      //   console.log(result);
      // }, function apiUserResponseFail(result) {
      //   console.log(result);
      // });
      //
      // var userSelfPromise = api.user_self(params);
      //
      // userSelfPromise.then(function apiUserSelfResponse(result) {
      //   console.log(result);
      // }, function apiUserSelfResponseFail(result) {
      //   console.log(result);
      // });
      //
      // var userSelfMediaRecent = api.user_self_media_recent({count:1}, params);
      //
      // userSelfMediaRecent.then(function apiUserSelfMediaRecentResponse(result) {
      //   console.log(result);
      // }, function apiUserSelfMediaRecentFail(result) {
      //   console.log(result);
      // });

      // var userMediaRecent = api.user_media_recent(result.user.id, {count:2} , params);
      //
      // userMediaRecent.then(function apiUserMediaRecentResponse(result) {
      //   console.log(result);
      // }, function apiUserMediaRecentFail(result) {
      //   console.log(result);
      // });

      // var userSelfLiked = api.user_self_liked({count:1}, params);
      //
      // userSelfLiked.then(function apiUserSelfLikedResponse(result) {
      //   console.log(result);
      // }, function apiUserSelfLikedFail(result) {
      //   console.log(result);
      // });


      // var userSearch = api.user_search('gym', {count:10}, params);
      //
      // userSearch.then(function apiUserSearchResponse(result) {
      //   console.log(result);
      // }, function apiUserSearchFail(result) {
      //   console.log(result);
      // });

      // var userFollows = api.user_follows(params);
      //
      // userFollows.then(function apiUserFollowsResponse(result) {
      //   console.log(result);
      // }, function apiUserFollowsFail(result) {
      //   console.log(result);
      // });
      //
      // var userFollowers =  api.user_followers(params);
      //
      // userFollowers.then(function apiUserFollowersResponse(result) {
      //   console.log(result);
      // }, function apiUserFollowersFail(result) {
      //   console.log(result);
      // });

      // var userSelfRequestBy = api.user_self_requested_by(params);
      //
      // userSelfRequestBy.then(function apiUserSelfRequestByResponse(result) {
      //   console.log(result);
      // }, function apiUserSelfRequestByFail(result) {
      //   console.log(result);
      // });

      // var promise = api.user_relationship(result.user.id, params);
      //
      // promise.then(function apiPromiseResponse(result) {
      //   console.log(result);
      // }, function apiPromiseFail(result) {
      //   console.log(result);
      // });

      // var promise = api.set_user_relationship(result.user.id, 'follow', params);
      //
      // promise.then(function apiPromiseResponse(result) {
      //   console.log(result);
      // }, function apiPromiseFail(result) {
      //   console.log(result);
      // });

      // var promise = api.media('1380725277503741887_414187957', params);
      //
      // promise.then(function apiPromiseResponse(result) {
      //   console.log(result);
      // }, function apiPromiseFail(result) {
      //   console.log(result);
      // });

      // var promise = api.media_search(48.4335645654, 2.345645645, 2000, params);
      //
      // promise.then(function apiPromiseResponse(result) {
      //   console.log(result);
      // }, function apiPromiseFail(result) {
      //   console.log(result);
      // });

      // var promise = api.media_shortcode('BMpUlMSA1-_', params);
      //
      // promise.then(function apiPromiseResponse(result) {
      //   console.log(result);
      // }, function apiPromiseFail(result) {
      //   console.log(result);
      // });
      //
      // var promise = api.comments('1380725277503741887_414187957', params);
      //
      // promise.then(function apiPromiseResponse(result) {
      //   console.log(result);
      // }, function apiPromiseFail(result) {
      //   console.log(result);
      // });

      // var promise = api.add_comment('1380725277503741887_414187957', 'ajajaajaj nice!!!!', params);
      //
      // promise.then(function apiPromiseResponse(result) {
      //   console.log(result);
      // }, function apiPromiseFail(result) {
      //   console.log(result);
      // });
      //
      // var promise = api.del_comment('1380725277503741887_414187957', '1', params);
      //
      // promise.then(function apiPromiseResponse(result) {
      //   console.log(result);
      // }, function apiPromiseFail(result) {
      //   console.log(result);
      // });

      // var promise = api.add_like('1380725277503741887_414187957', params);
      //
      // promise.then(function apiPromiseResponse(result) {
      //   console.log(result);
      // }, function apiPromiseFail(result) {
      //   console.log(result);
      // });
      //
      // var promise = api.likes('1380725277503741887_414187957', params);
      //
      // promise.then(function apiPromiseResponse(result) {
      //   console.log(result);
      // }, function apiPromiseFail(result) {
      //   console.log(result);
      // });
      //
      // var promise = api.del_like('1380725277503741887_414187957', params);
      //
      // promise.then(function apiPromiseResponse(result) {
      //   console.log(result);
      // }, function apiPromiseFail(result) {
      //   console.log(result);
      // });

      // var promise = api.tag('gym', params);
      //
      // promise.then(function apiPromiseResponse(result) {
      //   console.log(result);
      // }, function apiPromiseFail(result) {
      //   console.log(result);
      // });
      //
      // var promise = api.tag_media_recent('gym', {count: 10}, params);
      //
      // promise.then(function apiPromiseResponse(result) {
      //   console.log(result);
      // }, function apiPromiseFail(result) {
      //   console.log(result);
      // });
      //
      // var promise = api.tag_search('gym', params);
      //
      // promise.then(function apiPromiseResponse(result) {
      //   console.log(result);
      // }, function apiPromiseFail(result) {
      //   console.log(result);
      // });

      // var promise = api.location('1020188658', params);
      //
      // promise.then(function apiPromiseResponse(result) {
      //   console.log(result);
      // }, function apiPromiseFail(result) {
      //   console.log(result);
      // });
      //
      // /* OPTIONS: { [min_id], [max_id], [min_timestamp], [max_timestamp] }; */
      // var promise = api.location_media_recent('1020188658', {}, params);
      //
      // promise.then(function apiPromiseResponse(result) {
      //   console.log(result);
      // }, function apiPromiseFail(result) {
      //   console.log(result);
      // });
      //
      // /* SPECS: { lat, lng, facebook_places_id }; */
      // /* OPTIONS: { [distance] }; */
      // var promise = api.location_search({ lat: 37.9836749, lng: -1.1257176 }, {distance: 500}, params);
      //
      // promise.then(function apiPromiseResponse(result) {
      //   console.log(result);
      // }, function apiPromiseFail(result) {
      //   console.log(result);
      // });

      var promise = api.del_subscription({id:1});

      promise.then(function apiPromiseResponse(result) {
        console.log(result);
      }, function apiPromiseFail(result) {
        console.log(result);
      });

      /* OPTIONS: { [verify_token] } */
      var promise = api.add_tag_subscription('gym', 'http://shop.oik.es/ig/tags', {verify_token: 'jarderOreNow'});

      promise.then(function apiPromiseResponse(result) {
        console.log(result);
      }, function apiPromiseFail(result) {
        console.log(result);
      });

      /* OPTIONS: { [verify_token] } */
      var promise = api.add_user_subscription('http://shop.oik.es/ig/user', {verify_token: 'jarderOreNow'});

      promise.then(function apiPromiseResponse(result) {
        console.log(result);
      }, function apiPromiseFail(result) {
        console.log(result);
      });

      /* OPTIONS: { [verify_token] } */
      var promise = api.add_geography_subscription(48.565464564, 2.34656589, 100, 'http://oik.es/ig/geo', {verify_token: 'jarderOreNow'});

      promise.then(function apiPromiseResponse(result) {
        console.log(result);
      }, function apiPromiseFail(result) {
        console.log(result);
      });

      /* OPTIONS: { [verify_token] } */
      var promise = api.add_location_subscription(1257285, 'http://shop.oik.es/ig/loc', {verify_token: 'jarderOreNow'});

      promise.then(function apiPromiseResponse(result) {
        console.log(result);
      }, function apiPromiseFail(result) {
        console.log(result);
      });

      var promise = api.subscriptions();

      promise.then(function apiPromiseResponse(result) {
        console.log(result);
      }, function apiPromiseFail(result) {
        console.log(result);
      });

      res.status(200).send(JSON.stringify(result));

    }
  });
};

// This is where you would initially send users to authorize
app.get('/authorize_user', exports.authorize_user);
// This is your redirect URI
app.get('/handleauth', exports.handleauth);

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
