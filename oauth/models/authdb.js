var db = require('../db');
var passwd = require('../localpasswd');
var ObjectId = require('mongodb').ObjectID;
var config = require('config');
var col = config.get("oauth.mongodb.collection");

module.exports.numOfAdmin = function(cb) {
	var collection = db.get().collection(col);
	collection.find({isAdmin: true}).toArray(function(err, result) {
		if (err) {
			console.error(err);
			cb(err, null);
		} else {
			var num = result.length;
			cb(null, num);
		}
	});
}

module.exports.setAdmin = function(id, status, cb) {
	var collection = db.get().collection(col);
	collection.findOne({_id: ObjectId(id)}, function(err, ret) {
		if (err) {
			console.error(err);
			cb(err, null);
		} else {
			collection.updateOne({_id: ObjectId(id)}, {$set: {isAdmin: status}}, function(err, ret) {
				if (err) {
					console.error(err);
					cb(err, null);
				} else {
					var result = false;
					if (ret.result.ok)
						result = true;
					cb(null, result);
				}
			});
		}
	});
}

module.exports.dupIdCheck = function(oauth, user, cb) {
	var query = {};
	var doc = {};
	switch (oauth) {
		case "google":
			query = {"google.emails.value": user};
			break;
		case "kakao":
			query = {"kakao._json.kaccount_email": user};
			break;
		// case "instagram":
			// FIXME: instram oauth is missing for now
			//break;
		case "local":
			query = {id: user};
			break;
		default:
			console.error(oauth + " not supported oauth server");
			break;
	}
	console.log(oauth, query);
	var collection = db.get().collection(col);
	collection.findOne(query, function(err, item) {
		if (err) {
			console.error(err);
			cb(err, null);
		} else {
			console.log(item);
			if (item)
				cb(null, true);
			else
				cb(null, false);
		}
	});
}

module.exports.addLocalUser = function(credential, cb) {
	var collection = db.get().collection(col);
	collection.findOne({id: credential.id}, function(err, item) {
		if (err) {
			console.error("addLocalUser findOne error:", err);
			cb(err, null);
		} else {
			if (!item) {
				passwd.hashPassword(credential.passwd, function(err, res) {
					if (err) {
						console.error("hashPassword error:", err);
						cb(err, null);
					} else {
						credential.passwd = res;
						credential.isActive = false;
						collection.insertOne(credential, function(err, res) {
							if (err) {
								console.error("insertOne error:", err);
								cb(err, null, isAdmin);
							} else {
								var isAdmin = false;
								cb(null, res, isAdmin);
							}
						});
					}
				});
			} else {
				console.error(cretential.id, "exists");
				cb("Duplicate ID exists", null);
			}
		}
	});
}

module.exports.updateLocalUser = function(credential, cb) {
	var query = {id: credential.id};
	var collection = db.get().collection(col);
	collection.findOne(query, function(err, item) {
		if (err) {
			console.error("updateLocalUser findOne err:", err);
			cb(err, null);
		} else {
			if (!item) {
				console.error(credential.id, "no such user");
				cb(null, false);
			} else {
				if (credential.passwd) {
					passwd.hashPassword(credential.passwd, function(err, res) {
						if (err) {
							console.error("updateLocalUser hashPassword err:", err);
							cb(err, null);
						} else {
							credential.passwd = res;
							collection.updateOne({_id: ObjectId(item._id)}, {$set: credential}, function(err, ret) {
								if (err) {
									console.error(err);
									cb(err, null);
								} else {
									console.log("updated " + item._id + " with isActive false got " + ret);
									cb(null, ret);
								}
							});
						}
					});
				} else {
					collection.updateOne({_id: ObjectId(item._id)}, {$set: credential}, function(err, ret) {
						if (err) {
							console.error(err);
							cb(err, null);
						} else {
							console.log("updated " + item._id + " with isActive false got " + ret);
							cb(null, ret);
						}
					});
				}
			}
		}
	});
}

module.exports.isValidLocalUser = function(user, pass, cb) {
	var collection = db.get().collection(col);
	collection.findOne({ id: user }, function(err, item) {
		if (err) console.error(err);
		var isAdmin = false;
		if (!item) {
			cb(null, false, isAdmin);
		} else {
			if (item.isAdmin == true) isAdmin = true;
			// password hash in mongodb is in base64 format.
			// convert it into Buffer object
			console.log("isValidLocalUser item:", item);
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
	var collection = db.get().collection(col);
	var query = {};
	var doc = {};
	switch (oauthServer) {
		case "google":
			query = {googleId: profile.id};
			doc.googleId = profile.id;
			doc.google = profile;
			break;
		case "googleToken":
			query = {googleId: profile.sub};
			doc.googleId = profile.sub;
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
		var isActive = false;
		var isAdmin = false;
		if (!item) {
			doc.isActive = false;
			collection.insertOne(doc, function(err, res) {
				if (err) {
					cb(err, null, isActive, isAdmin);
				} else {
					cb(null, false, isActive, isAdmin);	// it makes account signup pending
				}
			});
		} else {
			if (item.isActive == true) {
				if (item.isAdmin == true) isAdmin = true;
				cb(err, true, item.isActive, isAdmin);
			} else {
				console.log("Pending account login trial");
				cb(err, false, isActive, isAdmin);
			}
		}
	});

}

module.exports.getPendingUser = function(cb) {
	var collection = db.get().collection(col);
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
	var collection = db.get().collection(col);
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
	var collection = db.get().collection(col);
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
	var collection = db.get().collection(col);
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
	var collection = db.get().collection(col);
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
	var collection = db.get().collection(col);
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
