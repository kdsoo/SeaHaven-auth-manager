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
