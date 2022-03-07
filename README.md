Copy following directory in your express root directory
- oauth/

add following codes after app.use(cookieParser()) and before app.use("/", indexRouter)

/////////////////////////////////////////////////////////////////////////////// <br />
// setup oauth must come after cookieParser() <br />
var Oauth = require('./oauth/oauth'); <br />
Oauth.setup(app); <br />
app.use("/oauth", express.static(path.join(__dirname, "oauth", "public"))); <br />
/////////////////////////////////////////////////////////////////////////////// <br />

Oauth configuration should be registered in your config file.
Please refer to the default_sample.json 
put the whole oauth element in your own configuration json

require packages

package.json

{<br />
	...<br />
	"config": "*",<br />
	"passport": "*",<br />
	"passport-google-oauth": "*",<br />
	"passport-instagram": "*",<br />
	"passport-kakao": "*",<br />
	"passport-local": "*",<br />
	"passport-twitter": "*",<br />
	"express-session": "*",<br />
	"redis": "3.1.2",<br />
	"connect-redis": "*",<br />
	"mongodb": "3.6.3"<br />
	...<br />
}
