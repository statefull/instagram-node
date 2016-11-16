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

      var userSelfLiked = api.user_self_liked({count:1}, params);

      userSelfLiked.then(function apiUserSelfLikedResponse(result) {
        console.log(result);
      }, function apiUserSelfLikedFail(result) {
        console.log(result);
      });


      // api.user_search('gym', {count:10}, params, function(err, users, remaining, limit) {
      //   console.log('user_search',JSON.stringify(users));
      // });

      // api.user_follows(params, function(err, result, pagination, remaining, limit) {
      //     console.log("user_follows",JSON.stringify(result));
      // });
      //
      // api.user_followers(params, function(err, users, pagination, remaining, limit) {
      //   console.log("user_followers",JSON.stringify(users));
      // });
      //
      // api.user_self_requested_by(params,function(err, users, remaining, limit) {
      //   console.log("user_self_requested_by",JSON.stringify(users));
      // });
      //
      // api.user_relationship(result.user.id, params, function(err, result, remaining, limit) {
      //   console.log("user_relationship", JSON.stringify(result));
      // });
      //
      // api.set_user_relationship(result.user.id, 'follow', params, function(err, result, remaining, limit) {
      //   console.log("set_user_relationship", JSON.stringify(result));
      // });

      // api.media('1380725277503741887_414187957', params, function(err, media, remaining, limit) {
      //     console.log("media", JSON.stringify(media));
      // });
      //
      // api.media_search(48.4335645654, 2.345645645, 2, params, function(err, medias, remaining, limit) {
      //   console.log("media_search", JSON.stringify(medias));
      // });
      //
      // api.media_shortcode('BMpUlMSA1-_', params, function(err, medias, remaining, limit) {
      //   console.log("media_shortcode", JSON.stringify(medias));
      // });

      // api.comments('1380725277503741887_414187957', params, function(err, result, remaining, limit) {
      //   console.log('comments', JSON.stringify(result));
      // });
      //
      // api.add_comment('1380725277503741887_414187957', 'ajajaajaj nice!!!!', params, function(err, result, remaining, limit) {
      //   console.log('add_comment', JSON.stringify(result));
      // });
      //
      // api.del_comment('1380725277503741887_414187957', '1', params, function(err, remaining, limit) {
      //      console.log('del_comment', JSON.stringify(err));
      // });

      // api.add_like('1380725277503741887_414187957', params, function(err, remaining, limit) {
      //   console.log('add_like', JSON.stringify(err));
      // });
      //
      // api.likes('1380725277503741887_414187957', params, function(err, result, remaining, limit) {
      //   console.log('likes', JSON.stringify(result));
      // });
      //
      // api.del_like('1380725277503741887_414187957', params, function(err, remaining, limit) {
      //   console.log('del_like', JSON.stringify(err));
      // });

      // api.tag('gym', params, function(err, result, remaining, limit) {
      //     console.log('tag', JSON.stringify(result));
      // });
      //
      // api.tag_media_recent('gym', {count: 10}, params, function(err, medias, pagination, remaining, limit) {
      //   console.log('tag_media_recent', JSON.stringify(medias));
      // });
      //
      // api.tag_search('gym', params, function(err, result, remaining, limit) {
      //   console.log('tag_search', JSON.stringify(result));
      // });

      // api.location('1020188658', params, function(err, result, remaining, limit) {
      //   console.log('location', JSON.stringify(result));
      // });
      //
      // /* OPTIONS: { [min_id], [max_id], [min_timestamp], [max_timestamp] }; */
      // api.location_media_recent('1020188658', {}, params, function(err, result, pagination, remaining, limit) {
      //   console.log('location_media_recent', JSON.stringify(result));
      // });
      //
      // /* SPECS: { lat, lng, facebook_places_id }; */
      // /* OPTIONS: { [distance] }; */
      // api.location_search({ lat: 37.9836749, lng: -1.1257176 }, {distance: 500}, params, function(err, result, remaining, limit) {
      //   console.log('location_search', JSON.stringify(result));
      // });

      // api.del_subscription({id:1}, function(err,subscriptions,limit){
      //   console.log('del_subscription', JSON.stringify(subscriptions));
      // })
      //
      // /* OPTIONS: { [verify_token] } */
      // api.add_tag_subscription('gym', 'http://shop.oik.es/ig/tags', {verify_token: 'jarderOreNow'}, function(err, result, remaining, limit){
      //   console.log('add_tag_subscription', JSON.stringify(err));
      // });
      //
      // /* OPTIONS: { [verify_token] } */
      // api.add_user_subscription('http://shop.oik.es/ig/user', {verify_token: 'jarderOreNow'}, function(err, result, remaining, limit){
      //   console.log('add_user_subscription', JSON.stringify(err));
      // });
      //
      // /* OPTIONS: { [verify_token] } */
      // api.add_geography_subscription(48.565464564, 2.34656589, 100, 'http://oik.es/ig/geo', {verify_token: 'jarderOreNow'}, function(err, result, remaining, limit){
      //   console.log('add_geography_subscription', JSON.stringify(err));
      // });
      //
      // /* OPTIONS: { [verify_token] } */
      // api.add_location_subscription(1257285, 'http://shop.oik.es/ig/loc', {verify_token: 'jarderOreNow'}, function(err, result, remaining, limit){
      //   console.log('add_location_subscription', JSON.stringify(err));
      // });
      //
      // api.subscriptions(function(err, result, remaining, limit){
      //   console.log('subscriptions', JSON.stringify(result));
      // });

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
