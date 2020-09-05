var db = require('../db');
var passwd = require('../localpasswd');
var ObjectId = require('mongodb').ObjectID;

module.exports.isValidLocalUser = function(user, pass, cb) {
	var collection = db.get().collection('users');
	collection.findOne({ id: user }, function(err, item) {
		if (err) console.error(err);
		var isAdmin = false;
		if (!item) {
			cb(null, false, isAdmin);
		} else {
			if (item.isAdmin == true) isAdmin = true;
			// password hash in mongodb is in base64 format.
			// convert it into Buffer object
			var combined = new Buffer(item.passwd, "base64");
			passwd.verifyPassword(pass, combined, function(error, res) {
				if (error) {
					console.error(error);
					cb(error, null, isAdmin);
				} else {
					console.log("isValidLocalUser " + user + " verification got " + res);
					console.log("isValidLocalUser " + user + " isAdmin " + isAdmin);
					if (res == true) {
						cb(null, item, isAdmin);
					} else {
						cb(null, res, isAdmin);
					}
				}
			});
		}
	});
}


module.exports.isValidUser = function(oauthServer, profile, cb) {
	var collection = db.get().collection('users');
	var query = {};
	var doc = {};
	switch (oauthServer) {
		case "google":
			query = {googleId: profile.id};
			doc.googleId = profile.id;
			doc.google = profile;
			break;
		case "kakao":
			query = {kakaoId: profile.id.toString()};
			doc.kakaoId = profile.id.toString();
			profile.id = profile.id.toString();
			doc.kakao = profile;
			break;
		case "instagram":
			query = {instagramId: profile.id.toString()};
			doc.instagramId = profile.id.toString();
			profile.id = profile.id.toString();
			doc.instagram = profile;
			break;

		default:
			console.error(oauthServer + " not supported oauth server");
			break;
	}
	console.log("isValidUser query " + oauthServer + ": " + JSON.stringify(query));
	collection.findOne(query, function(err, item) {
		if (err) console.error(err);
		var isAdmin = false;
		if (!item) {
			doc.isActive = false;
			collection.insertOne(doc, function(err, res) {
				if (err) {
					cb(err, null, isAdmin);
				} else {
					console.log("Account signup: ");
					console.log(doc);
					cb(null, false, isAdmin);	// it makes account signup pending
				}
			});
		} else {
			if (item.isActive == true) {
				console.log(item)
				if (item.isAdmin == true) isAdmin = true;
				cb(err, true, isAdmin);
			} else {
				console.log("Pending account login trial");
				console.log(item)
				cb(err, false, isAdmin);
			}
		}
	});

}

module.exports.getPendingUser = function(cb) {
	var collection = db.get().collection('users');
	collection.find({isActive: false}).toArray(function(err, result) {
		if (err) {
			console.error(err);
			cb(err, null);
		} else {
			cb(null, result);
		}
	});
}

module.exports.getActiveUser = function(cb) {
	var collection = db.get().collection('users');
	collection.find({isActive: true}).toArray(function(err, result) {
		if (err) {
			console.error(err);
			cb(err, null);
		} else {
			cb(null, result);
		}
	});
}

module.exports.getUserById = function(id, cb) {
	var collection = db.get().collection('users');
	collection.findOne({ _id: ObjectId(id) }, function(err, result) {
		if (err) {
			console.error(err);
			cb(err, null);
		} else {
			cb(null, result);
		}
	});
}

module.exports.getOauthUser = function(cred, cb) {
	var collection = db.get().collection('users');
	collection.findOne(cred, function(err, result) {
		if (err) {
			console.error(err);
			cb(err, null);
		} else {
			cb(null, result);
		}
	});
}

module.exports.deactivateUser = function(id, cb) {
	var collection = db.get().collection('users');
	collection.findOne({_id: ObjectId(id)}, function(err, res) {
		if (err) {
			console.error(err);
			cb(err, null);
		} else {
			if (res.isAdmin == true) {
				console.error("Cannot deactivate Admin user");
				cb("Cannot deactivate Admin user", null);
			} else {
				collection.updateOne({_id: ObjectId(id)}, {$set: {isActive: false}}, function(err, ret) {
					if (err) {
						console.error(err);
						cb(err, null);
					} else {
						console.log("updated " + id + " with isActive false got " + ret);
						cb(null, ret);
					}
				});
			}
		}
	});
}

module.exports.approveUser = function(id, confirm, cb) {
	var collection = db.get().collection('users');
	// id is Objectid(_id) in mongodb
	if (confirm == "true") {
		collection.updateOne({_id: ObjectId(id)}, {$set: {isActive: true}}, function(err, ret) {
			if (err) {
				console.error(err);
				cb(err, null);
			} else {
				console.log("updated " + id + " with isActive " + confirm + " got " + ret);
				cb(null, ret);
			}
		});
	} else if (confirm == "false") {
		// this user got rejected. remove from db
		collection.findOne({_id: ObjectId(id)}, function(err, ret) {
			if (err) {
				console.error(err);
				cb(err, null);
			} else {
				if (ret.isAdmin == true) {
					console.error("Admin user cannot be removed");
					cb("Admin user ccannot be removed", null);
				} else {
					collection.remove({_id: ObjectId(id)}, function(err, ret) {
						console.log(err);
						console.log(ret);
						if (err) {
							console.error(err);
							cb(err, null);
						} else {
							console.log("Rmoved " + id + " done with " + ret);
							cb(null, ret);
						}
					});
				}
			}
		});
	} else {
		console.error("approveUser must be given confirm parameter");
		cb("not supported command", null);
	}
}
