var config = require('config');
var path = require('path');
var passport = require('passport');
var localStrategy = require('passport-local').Strategy;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var KakaoStrategy = require('passport-kakao').Strategy;
var InstagramStrategy = require('passport-instagram').Strategy;
var session = require('express-session');
var redis = require('redis');
var redisClient = redis.createClient();
redisClient.on("error", function(error) {
	console.error(error);
	console.error("######################################\n\n");
	console.error("You may need a configured redis server\n\n");
	console.error("######################################\n\n");
	throw(error);
});
var redisStore = require('connect-redis')(session);

var mongodb = require('./db');
var authdb = require('./models/authdb');
mongodb.connect(config.get("oauth.mongodb.mongodb_auth"), function(err) {
	if (err) {
		console.log('Unable to connect to ' + config.credential.mongo_auth);
	}
});

var sessionSecret = config.get("oauth.session.secret");
var host = config.get("oauth.host");
var namespace= config.get("oauth.namespace");

var GOOGLE_CLIENT_ID = config.get("oauth.google.clientId");
var GOOGLE_CLIENT_SECRET = config.get("oauth.google.clientSecret");
var GOOGLE_CALLBACK = config.get("oauth.google.callbackURL");

var KAKAO_CLIENT_ID = config.get("oauth.kakao.clientId");
var KAKAO_CLIENT_SECRET = config.get("oauth.kakao.clientSecret");
var KAKAO_CALLBACK = config.get("oauth.kakao.callbackURL");

var INSTAGRAM_CLIENT_ID = config.get("oauth.instagram.clientId");
var INSTAGRAM_CLIENT_SECRET = config.get("oauth.instagram.clientSecret");
var INSTAGRAM_CALLBACK = config.get("oauth.instagram.callbackURL");

passport.serializeUser(function(user, done) {
	done(null, user);
});

passport.deserializeUser(function(obj, done) {
	done(null, obj);
});
passport.use(new GoogleStrategy({
	clientID: GOOGLE_CLIENT_ID,
	clientSecret: GOOGLE_CLIENT_SECRET,
	callbackURL: GOOGLE_CALLBACK
},
	function(accessToken, refreshToken, profile, done) {
		// asynchronous verification, for effect...
		process.nextTick(function () {

			// To keep the example simple, the user's Google profile is returned to
			// represent the logged-in user.  In a typical application, you would want
			// and return that user instead.
			authdb.isValidUser("google", profile, function(err, ret, isAdmin) {
				if (err) {
					return done(err, null);
				} else {
					if (ret) {
						return done(null, profile);
					} else {
						// TODO: authdb user add as pending
						return done(null, null);
					}
				}
			});
		});
	}
));

passport.use(new KakaoStrategy({
	clientID : KAKAO_CLIENT_ID,
	clientSecret: KAKAO_CLIENT_SECRET,
	callbackURL : KAKAO_CALLBACK
},
	function(accessToken, refreshToken, profile, done) {
		// asynchronous verification, for effect...
		process.nextTick(function () {

			// To keep the example simple, the user's Google profile is returned to
			// represent the logged-in user.  In a typical application, you would want
			// to associate the Google account with a user record in your database,
			// and return that user instead.
			authdb.isValidUser("kakao", profile, function(err, ret, isAdmin) {
				if (err) {
					return done(err, null);
				} else {
					if (ret) {
						return done(null, profile);
					} else {
						// TODO: authdb user add as pending
						return done(null, null);
					}
				}
			});
		});
	}
));

passport.use(new InstagramStrategy({
	clientID: INSTAGRAM_CLIENT_ID,
	clientSecret: INSTAGRAM_CLIENT_SECRET,
	callbackURL: INSTAGRAM_CALLBACK
},
	function(accessToken, refreshToken, profile, done) {
		process.nextTick(function () {
			authdb.isValidUser("instagram", profile, function(err, ret, isAdmin) {
				if (err) {
					return done(err, null);
				} else {
					if (ret) {
						return done(null, profile);
					} else {
						// TODO: authdb user add as pending
						return done(null, null);
					}
				}
			});
		});
	}
));

passport.use(new localStrategy({
	usernameField: 'username',
	passwordField: 'password'
},
	function(username, password, cb) {
		console.log("local auth strategy " + username);
		authdb.isValidLocalUser(username, password, function(err, user, isAdmin) {
			if (err) {
				console.error(err);
				return cb(err);
			} else {
				if (!user) {
					return cb(null, false);
				} else {
					return cb(null, user);
				}
			}
		});
	}));

var setupAdmin = function(app) {
	app.get('/admin', ensureAdmin, function(req, res, next) {
		res.sendFile(path.join(__dirname, 'public', 'admin.html'));
	});

	app.get('/admin/user/pending', ensureAdmin, function(req, res, next) {
		authdb.getPendingUser(function(err, ret) {
			if (err) {
				res.status(503);
				res.send(err);
			} else {
				res.json(ret);
			}
		});
	});

	app.get('/admin/user/active', ensureAdmin, function(req, res, next) {
		authdb.getActiveUser(function(err, ret) {
			if (err) {
				res.status(503);
				res.send(err);
			} else {
				res.send(ret);
			}
		});
	});

	// set isActive to false
	app.post('/admin/user/:id/suspend', ensureAdmin, function(req, res, next) {
		var id = req.params.id;
		authdb.deactivateUser(id, function(err, ret) {
			if (err) {
				res.status(503);
				res.send(err);
			} else {
				res.send(ret);
			}
		});
	});

	app.post('/admin/confirmPendingUser/:id/:confirm', ensureAdmin, function(req, res, next) {
		var id = req.params.id;
		var confirm = req.params.confirm;		// true on adding user, false on deleting user
		var string = "";
		console.log("/admin confirm pending user " + id + " with " + confirm);
		authdb.getUserById(id, function(e, r) {
			if (e) {
				res.status(503);
				res.send(e);
			} else {
				var user = r;
				console.log(user);

				var credJobs = [];

				var dbJob = new Promise(function(resolve, reject) {
					authdb.approveUser(id, confirm, function(err, ret) {
						if (err) {
							reject(err);
						} else {
							// Creating or deleting user RSA key
							if (confirm == true) {
								string += "Activating user " + id + " got " + ret;
							} else if (confirm == false) {
								string += "Deleting user " + id + " got " + ret;
							}
							resolve(string);
						}
					});
				});
				credJobs.push(dbJob);

				Promise.all(credJobs).then(function(ret) {
					res.send(string);
				}).catch(function(err) {
					console.error(err);
					res.status(503);
					res.send(err);
				});
			}
		});
	});
}

var setup = function (app) {
	app.use(session({ secret: sessionSecret
		, name: "_authManagerRedis"
		, cookie: { maxAge: 1000 * 60 * 60 * 24}
		, rolling: true, resave: false, saveUninitialized: true
		, store: new redisStore({ host: 'localhost', port: 6379, client: redisClient, ttl: 86400 })
	}));
	app.use(passport.initialize());
	app.use(passport.session());

	setupAdmin(app);

	app.get('/login', function(req, res, next) {
		console.log("/login", "referer=", req.query.referer);
		res.sendFile(path.join(__dirname, 'public', 'login.html'));
	});

	app.get('/signup', function(req, res, next) {
		res.render('signup', { title: 'Signup pending for confirmation' });
	});

	app.get('/account', ensureAuthenticated, function(req, res, next) {
		res.sendFile(path.join(__dirname, 'public', 'account.html'));
	});
	app.get('/account/data', ensureAuthenticated, function(req, res, next) {
		var account = req.user;
		res.json(account);
	});

	app.post('/oauth/local',
		passport.authenticate('local', { failureRedirect: namespace + '/login', failureFlash: true}),
		function(req, res) {
			console.log("local login isAdmin " + req.user.id + ": " + req.user.isAdmin);
			var referer = req.body.referer;
			if (!req.body.referer)
				referer = namespace + "/account";
			res.redirect(referer);
		});

	// https://console.developers.google.com/apis/credentials?project=seahaven-auth
	app.get('/oauth/google',
		passport.authenticate('google', { prompt: 'select_account', scope: ['openid', 'email'] }),
		function(req, res){
			// The request will be redirected to Google for authentication, so this
			// function will not be called.
		});

	app.get('/oauth/google/callback',
		passport.authenticate('google', { prompt: 'select_account', failureRedirect: namespace + '/signup' }),
		function(req, res) {
			var id = req.user.emails[0].value;
			var photo = req.user.photos[0].value;
			var username = req.user.displayName;

			var cred = {oauth: "google", id: id, profile: req.user};

			var userquery = encodeURIComponent("google@"+id);
			res.cookie("userphoto", photo);
			res.cookie("username", username);
			res.cookie("admin", req.user.isAdmin);
			res.cookie("user", id);
			res.cookie("oauth", "google");
			res.redirect(namespace);

		});

	app.get('/logout', function(req, res){
		req.logout();
		res.clearCookie("admin");
		res.clearCookie("usertoken");
		res.clearCookie("userphoto");
		res.clearCookie("username");
		res.clearCookie("user");
		res.clearCookie("oauth");
		res.redirect(namespace);
	});

	app.get('/oauth/kakao',
		passport.authenticate('kakao', { state: "" }),
		function(req, res){
			// The request will be redirected to Google for authentication, so this
			// function will not be called.
		});

	app.get('/oauth/kakao/callback',
		passport.authenticate('kakao', { failureRedirect: namespace + '/signup' }),
		function(req, res) {
			var id = req.user._json.kaccount_email;
			var username = req.user.displayName;
			var userphoto = "";
			if (req.user._json.properties.profile_image == null) userphoto = "img/kakaotalk.png";
			else userphoto = req.user._json.properties.profile_image;

			var cred = {oauth: "kakao", id: id, profile: req.user};
			var userquery = encodeURIComponent("kakao@"+id);
			res.cookie("userphoto", userphoto);
			res.cookie("username", username);
			res.cookie("admin", req.user.isAdmin);
			res.cookie("user", id);
			res.cookie("oauth", "kakao");
			res.redirect(namespace + '/?user=' + userquery);
		});

	app.get('/oauth/instagram', passport.authenticate('instagram'));
	app.get('/oauth/instagram/callback',
		passport.authenticate('instagram', { failureRedirect: namespace + '/signup' }),
		function(req, res) {
			var id = req.user.id;
			var username = req.user.username;
			var userphoto = "";

			if (req.user._json.data.profile_picture == null) userphoto = "img/instagram_profile.png";
			else userphoto = req.user._json.data.profile_picture;

			var cred = {oauth: "instagram", id: id, profile: req.user};

			var userquery = encodeURIComponent("instagram@"+id);
			res.cookie("userphoto", userphoto);
			res.cookie("username", username);
			res.cookie("admin", req.user.isAdmin);
			res.cookie("user", id);
			res.cookie("oauth", "instagram");
			res.redirect(namespace + '/?user=' + userquery);
		});
};

exports.setup = setup;

var ensureAuthenticated = function (req, res, next) {
	console.log(namespace + req.originalUrl
		, "ensureAuthenticated isAuthenticated?: ", req.isAuthenticated()
		, " isActive?:", req.user);
	if (req.isAuthenticated()) { return next(); }
	res.redirect(namespace + '/login?referer=' + namespace + req.originalUrl);
};
exports.ensureAuthenticated = ensureAuthenticated;

var ensureAdmin = function (req, res, next) {
	console.log(namespace + req.originalUrl, "ensureAdmin isAuthenticated?: ", req.isAuthenticated());
	if (req.isAuthenticated() && req.user.isAdmin == true) { return next(); }
	// FIXME: namespace disappears on client side html. doubling is a workaround but not pretty.
	//var redirectUrl = "https://" + host + namespace + "/login?referer=" + namespace + req.originalUrl;
	var redirectUrl = "https://" + host + namespace + "/login?referer=" + namespace + req.originalUrl;
	console.log("redirectUrl:", redirectUrl);
	var html = "<script type='text/javascript'>alert('You are not admin');</script><h3>Admin credential required</h3>"
	res.status(401);
	res.send(html);
};
exports.ensureAdmin = ensureAdmin;

var isAdmin = function (req) {
	if (req.user.isAdmin == true) {
		return true;
	} else {
		return false;
	}
};
exports.isAdmin = isAdmin;

function getOauthProvider(user) {
	var keys = Object.keys(user);
	var ret = false;
	if (keys.indexOf("googleId") > -1) {
		ret = "google";
	} else if (keys.indexOf("instagramId") > -1) {
		ret = "instagram";
	} else if (keys.indexOf("kakaoId") > -1) {
		ret = "kakao";
	} else if (keys.indexOf("passwd") > -1) {
		ret = "local";
	} else {
		console.error("Unsupported oauth type");
	}
	return ret;
}

function getOauthId(user) {
	var id = false;
	switch (getOauthProvider(user)) {
		case "google":
			id = user.google.emails[0].value;
			break;
		case "instagram":
			id = user.instagram.id;
			break;
		case "kakao":
			id = user.kakao._json.kaccount_email;
			break;
		case "local":
			id = user.id;
			break;
		default:
			break;
	}
	return id;
}

