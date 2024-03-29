var express = require('express');
var router = express.Router();
var path = require('path');
var auth = require('../oauth/oauth');

/* GET home page. */
router.get('/', function(req, res, next) {
	//res.sendFile(path.join(__dirname, 'public', 'index.html'));
	res.sendFile(path.join(__dirname, '..', 'oauth', 'public', 'admin.html'));
});

router.get("/test", auth.ensureAuthenticated, function(req, res, next) {
	res.send(JSON.stringify(req.user) + " authenticated");
});

router.get("/test/local", auth.ensureLocalAuthenticated, function(req, res, next) {
	res.send("local authenticated");
});

module.exports = router;
