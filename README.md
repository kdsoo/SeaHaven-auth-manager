Copy following directory in your express root directory
- oauth/

add following codes after app.use(cookieParser()) and before app.use("/", indexRouter)

///////////////////////////////////////////////////////////////////////////////
// setup oauth must come after cookieParser()
var Oauth = require('./oauth/oauth');
Oauth.setup(app);
app.use("/oauth", express.static(path.join(__dirname, "oauth", "public")));
///////////////////////////////////////////////////////////////////////////////

Oauth configuration should be registered in your config file.
Please refer to the default_sample.json 
put the whole oauth element in your own configuration json

require packages

package.json
{
	...
	"config": "*",
	"passport": "*",
	"passport-google-oauth": "*",
	"passport-instagram": "*",
	"passport-kakao": "*",
	"passport-local": "*",
	"passport-twitter": "*",
	"express-session": "*",
	"redis": "*",
	"connect-redis": "*",
	"mongodb": "3.6.3"
	...
}
