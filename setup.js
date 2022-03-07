// latest release api: https://api.github.com/repos/kdsoo/SeaHaven-auth-manager/releases/latest
// "Accept: application/vnd.github.v3+json"
const https = require('https');
const url = require('url');
const path = require('path');
const fs = require('fs');
const zlib = require("zlib");
const spawn = require('child_process').spawn;

var tempfile = "auth-manager-temp.zip";
const releaseURL = {
  hostname: 'api.github.com',
  port: 443,
  path: '/repos/kdsoo/SeaHaven-auth-manager/releases/latest',
	headers: {
    'user-agent': 'node.js'
  },
	method: 'GET'
};

function getMeta(options) {
	return new Promise((resolve, reject) => {
		https.get(options, (res) => {
			var data = '';
			res.on('data', (d) => {
				data += d;
			});
			res.on('end', (d) => {
				resolve(data);
			});

		}).on('error', (e) => {
			reject(e);
		});
	});
}

function downloadFile(endpoint) {
	var s = "https://";
	var p = endpoint.split(s)[1].split("/");
	var hostname = p[0];
	p.shift();
	var url_path = "/" + p.join("/");
	const o = {
		hostname: hostname,
		port: 443,
		path: url_path,
		headers: {
			'user-agent': 'node.js'
		},
		method: 'GET'
	};

	var tempdest = fs.mkdtempSync("seahaven-auth-manager-");

	return new Promise((resolve, reject) => {
		https.get(o, (res) => {
			if (res.statusCode > 300 && res.statusCode < 400 && res.headers.location) {
				if (url.parse(res.headers.location).hostname) {
					// Hostname included; make request to res.headers.location	
					console.log("Start download file:", res.headers.location);
					https.get(res.headers.location, (res) => {
						if (res.headers["content-disposition"]) {
							tempfile = res.headers["content-disposition"].split("=")[1];
						}
						var file = fs.createWriteStream(path.join(tempdest, tempfile));
						res.on('data', (d) => {
							// do nothing. res.pipe is handling
						});
						res.pipe(file);
						file.on('finish', function() {
							file.close();
							resolve(path.join(tempdest, tempfile));
						});
					}).on('error', (e) => {
						fs.unlink(path.join(tempdest, tempfile));
						fs.rmdirSync(tempdest);
						reject(e);
					});
				} else {
					// Hostname not included; get host from requested URL (url.parse()) and prepend to location.
				}
			} else {
				console.log("Start download file:", endpoint);
				if (res.headers["content-disposition"]) {
					tempfile = res.headers["content-disposition"].split("=")[1];
				}
				var file = fs.createWriteStream(path.join(tempdest, tempfile));
				res.on('data', (d) => {
					// do nothing. res.pipe is handling
				});
				res.pipe(file);
				file.on('finish', function() {
					file.close();
					resolve(path.join(tempdest, tempfile));
				});
			}
		}).on('error', (e) => {
			fs.unlink(path.join(tempdest, tempfile));
			fs.rmdirSync(tempdest);
			reject(e);
		});
	});
}

function checkUnzipper() {
	try {
		var unzipper = require("unzipper");
	} catch(e) {
		return false;
	}
	return true;
}

function checkFsExtra() {
	try {
		var fsextra = require("fs-extra");
	} catch(e) {
		return false;
	}
	return true;
}

function installPackages() {
	return new Promise((resolve, reject) => {
		var cmd = ['install'];
		var params = [];
		if (!checkUnzipper())
			params.push("unzipper");
		if (!checkFsExtra())
			params.push("fs-extra");
		cmd = cmd.concat(params);

		if (params.length == 0) {
			resolve(true);
		} else {
			const install = spawn('npm', cmd);

			install.stdout.on('data', (data) => {
				//console.log("unzipper installer:", data.toString());
			});

			install.stderr.on('data', (data) => {
				//console.error("unzipper installer err:", data.toString());
			});

			install.on('error', (err) => {
				reject(err);
			});

			install.on('close', (code) => {
				resolve(code);
			});
		}
	});
}

function parseZipball(f) {
	return new Promise((resolve, reject) => {
		const unzipper = require('unzipper');
		fs.createReadStream(f)
			.pipe(unzipper.Parse())
			.on('entry', function (entry) {
				const fileName = entry.path;
				const type = entry.type; // 'Directory' or 'File'
				const size = entry.vars.uncompressedSize; // There is also compressedSize;
				//console.log(type, fileName);
				resolve(fileName);
			});
	});
}

function extract(f, outputPath) {
	return new Promise((resolve) => {
		fs.createReadStream(f)
			.pipe(unzipper.Extract({ path: outputPath }))
			.on('close', () => {
				resolve()
			})
	})
}

function unzipZipball(f) {
	var dir = f.split("/")[0];
	return new Promise((resolve, reject) => {
		const unzipper = require('unzipper');
		parseZipball(f).then((filename) => {
			fs.createReadStream(f)
				.pipe(unzipper.Extract({ path: dir}))
				.on('error', (e) => {
					reject(e);
				})
				.on('close', () => {
					resolve(filename)
				})
			})
	});
}

function backupFile(f, overwrite) {
	return new Promise((resolve, reject) => {
		var option = fs.constants.COPYFILE_EXCL;
		const dest = f + ".backup";
		if (overwrite == true)
			option = 0;
		fs.copyFile(f, dest, option, (err) => {
			if (err) {
				reject(err);
			} else {
				resolve(dest);
			}
		});
	});
}

function updatePackageList() {
	return new Promise((resolve, reject) => {
		var packageList = require("./package.json")
		var requiredList = require("./oauth/required-packages.json");

		var sourceList = Object.keys(packageList.dependencies);
		var newList = Object.keys(requiredList);
		var diff = newList.filter(x => !sourceList.includes(x));
		if (diff.length > 0) {
			for (var i = 0; i < diff.length; i++) {
				var item = diff[i];
				var ver = requiredList[item];
				console.log("adding", item, ver);
				packageList.dependencies[item] = ver;
			}
			fs.writeFile("package.json", JSON.stringify(packageList, null, 4).concat('\n'), (err) => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		} else {
			console.log("Pre-requisite packages already installed");
			resolve();
		}
	});
}

async function copyDirAsync(src, dest) {
	await fs.mkdir(dest, { recursive: true });
	let entries = await fs.readdir(src, { withFileTypes: true });

	for (let entry of entries) {
		let srcPath = path.join(src, entry.name);
		let destPath = path.join(dest, entry.name);

		entry.isDirectory() ?
			await copyDir(srcPath, destPath) :
			await fs.copyFile(srcPath, destPath);
	}
}

function mkdir(dir) {
	try {
		fs.mkdirSync(dir, 0755);
	} catch(e) {
		if(e.code != "EEXIST") {
			throw e;
		}
	}
}

function copyDir2(src, dest) {
	mkdir(dest);
	var files = fs.readdirSync(src);
	for(var i = 0; i < files.length; i++) {
			var current = fs.lstatSync(path.join(src, files[i]));
			if(current.isDirectory()) {
						copyDir2(path.join(src, files[i]), path.join(dest, files[i]));
					} else if(current.isSymbolicLink()) {
								var symlink = fs.readlinkSync(path.join(src, files[i]));
								fs.symlinkSync(symlink, path.join(dest, files[i]));
							} else {
										copy(path.join(src, files[i]), path.join(dest, files[i]));
									}
		}
}

function copyDir(src, dest) {
	if (fs.existsSync(dest)) {
		console.error(dest, "dir already exists");
		return false;
	} else {
		fs.mkdirSync(dest, { recursive: true });
		const entries = fs.readdirSync(src, { withFileTypes: true });

		for (let entry of entries) {
			const srcPath = path.join(src, entry.name);
			const destPath = path.join(dest, entry.name);
			console.log(entries.length, "copyDir:", srcPath, destPath);
			entry.isDirectory() ?
				copyDir(srcPath, destPath) :
				fs.copyFileSync(srcPath, destPath);
		}
	}
}

function rmdir(path) {
	if (fs.existsSync(path)) {
		const files = fs.readdirSync(path)

		if (files.length > 0) {
			files.forEach(function(filename) {
				if (fs.statSync(path + "/" + filename).isDirectory()) {
					rmdir(path + "/" + filename)
				} else {
					fs.unlinkSync(path + "/" + filename)
				}
			})
			fs.rmdirSync(path)
		} else {
			fs.rmdirSync(path)
		}
	} else {
		console.log("Directory path not found.")
	}
}

backupFile("package.json", true).then((r) => {
	console.log("backup done", r);
}).catch((e) => {
	if (e.code == "EEXIST") {
		console.error("package.json.backup file already exists. Please check and remove properly");
	} else {
		console.error(e);
	}
	process.exit();
});

getMeta(releaseURL).then((data) => {
	var ret = JSON.parse(data);
	var version = ret.tag_name;
	var timestamp = ret.published_at;
	var tarball = ret.tarball_url;
	var zipball = ret.zipball_url;

	if (fs.existsSync("oauth")) {
		console.error("#################################")
		console.error("oauth directory already installed");
		console.error("check your", path.join(__dirname, "oauth"), "directory and try agrain");
		console.error("you can rename the oauth directory or remove it for good");
		console.error("#################################")
	} else {
		installPackages().then((ret) => {
			console.log("Installing unzipper module done with", ret);
			downloadFile(zipball).then((f) => {
				console.log("download done in", f);
				const fsextra = require('fs-extra');
				const unzipper = require('unzipper');
				const dir = f.split("/")[0];
				const file = f.split("/")[1];
				console.log(dir, file);
				const filestream = fs.createReadStream(f);
				var unzipped = null;
				unzipZipball(f).then((ret) => {
					console.log("Unzip file", f, ret, "succeed");
					var unzippedPath = path.join(f.split("/")[0], ret);
					var oauthPath = path.join(unzippedPath, "oauth");

					fsextra.copy(oauthPath, "oauth")
						.then(() => {
							fsextra.removeSync(dir);
							updatePackageList().then(() => {
								console.log("package.json update done");
							}).catch((e) => {
								console.error("package.json update error:", e);
							});
							console.log('success!')
						})
						.catch(err => {
							fsextra.removeSync(dir);
							console.error(err)
						})
				}).catch(() => {
					const dir = f.split("/")[0];
					fsextra.removeSync(dir);
					console.error("Unzip file", f, "failed");
				});
			}).catch((err) => {
				console.error(err);
			});
		}).catch((e) => {
			console.log("Installing unzipper module ERROR with", e);
		});
	}
}).catch((err) => {
	console.error(err);
});

/*
updatePackageList().then(() => {
	console.log("package.json update done");
}).catch((e) => {
	console.error("package.json update error:", e);
});
*/

