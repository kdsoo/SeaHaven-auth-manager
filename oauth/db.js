var config = require('config');
var MongoClient = require('mongodb').MongoClient
var dbName = config.get("oauth.mongodb.dbName");

var state = { db: null };

module.exports.connect = function(url, done) {
	if (state.db) return done();

	MongoClient.connect(url, {useUnifiedTopology:true}, function(err, client) {
		if (err) return done(err);

		state.db = client.db(dbName);
		done();
	});
};

module.exports.get = function() {
	return state.db;
};

module.exports.close = function(done) {
	if (state.db) {
		state.db.close(function(err, result) {
			state.db = null;
			state.mode = null;
			done(err);
		});
	}
};

