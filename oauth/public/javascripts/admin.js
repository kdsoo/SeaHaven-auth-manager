var searchParams = new URLSearchParams(window.location.search);

$(document).ready(function(){
	var category = searchParams.get("cat");
	if (category == "pending") {
		getPendingUsers();
		document.getElementById("pending-tab").className = "nav-link active";
		document.getElementById("active-tab").className = "nav-link";
	} else if (category == "active") {
		getActiveUsers();
		document.getElementById("active-tab").className = "nav-link active";
		document.getElementById("pending-tab").className = "nav-link";
	} else {
		getActiveUsers();
		document.getElementById("active-tab").className = "nav-link active";
		document.getElementById("pending-tab").className = "nav-link";
	}
});

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

function getUserDesc(user) {
	var desc = "";
	switch (getOauthProvider(user)) {
		case "google":
			desc = "[google]: " + user.google.displayName + ", " + user.google.emails[0].value;
			break;
		case "instagram":
			desc = "[instagram]: " + user.instagram.username + ", " + JSON.stringify(user.instagram.name) + ", " + user.instagram._json.data.bio;
			break;
		case "kakao":
			desc = "[kakao]: " + user.kakao.username + ", " + user.kakao._json.kaccount_email + ", " + user.kakao.displayName;
			break;
		case "local":
			desc = "[local]: " + user.displayName + ", " + user.id;
			break;
		default:
			desc = "unsupported";
			break;
	}
	console.log(desc);
	return desc;
}

function getUserId(user) {
	var id = "";
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
			id = "unsupported";
			break;
	}
	return id;
}

function getUserPhoto(user) {
	var photo = "";
	switch (getOauthProvider(user)) {
		case "google":
			photo = user.google.photos[0].value;
			break;
		case "instagram":
			photo = user.instagram._json.data.profile_picture;
			break;
		case "kakao":
			photo = user.kakao._json.properties.profile_image;
			if (photo == null) photo = "oauth/images/kakaotalk.png";
			break;
		case "local":
			photo = user.userphoto;
			break;
		default:
			if (!photo) photo = "oauth/images/person.png";
			break;
	}
	return photo;
}

function confirmUserAccept(elem) {
	var id = elem.id.split("accept-")[1];
	if (confirm("Accept this user?") == true) {
		$.ajax({
			url: 'admin/confirmPendingUser/' + id + '/true',
			type: 'post',
			success: function(data) {
				console.log(data);
					alert(id + " user accepted");
					var tr = document.getElementById(id);
					tr.parentNode.removeChild(tr);
			}
		});
	} else {
		document.getElementById(elem.id).checked = false;
	}
};

function confirmUserReject(elem) {
	console.log(elem);
	var id = elem.id.split("drop-")[1];
	if (confirm("Drop this user?") == true) {
		$.ajax({
			url: 'admin/confirmPendingUser/' + id + '/false',
			type: 'post',
			success: function(data) {
				console.log(data);
				alert(id + " user droped");
				var tr = document.getElementById(id);
				tr.parentNode.removeChild(tr);
			}
		});
	} else {
		document.getElementById(elem.id).checked = false;
	}
}

function suspendUser(elem) {
	var id = elem.id.split("accept-")[1];
	$.ajax({
		url: 'admin/user/' + id + '/suspend',
		type: 'post',
		success: function(data) {
			console.log(data);
			if (data.ok == 1) {
				alert(id + " user suspended");
				var tr = document.getElementById(id);
				tr.parentNode.removeChild(tr);
			} else {
				alert("SUSPEND FAILED");
			}
		},
		error: function(jqXHR, textStatus, errorThrown) {
			console.error(jqXHR.status);
			if (jqXHR.status == 401) {
				window.location.href = "login";
			}
		}
	});
};

function generateKey(elem) {
	var id = elem.id.split("keygen-")[1];
	console.log(elem);
	var confirmTTL = prompt("TTL in hours for this ID(0 is permanent)", "24");
	if (confirmTTL == null || confirmTTL == "") {
		document.getElementById(elem.id).checked = false;
	} else {
		ttl = parseInt(confirmTTL);
		if (!ttl && ttl != 0) {
			alert("TTL must be given in integer number");
			document.getElementById(elem.id).checked = false;
		} else {
			ttl = ttl * 60 * 60;
			$.ajax({
				url: 'admin/user/' + id + '/key/ttl/' + ttl,
				type: 'post',
				success: function(data) {
					console.log(data);
					alert(id + " user key generated with " + ttl + " hours TTL");
				}
			});
		}
	}
};

function generateQR(elem) {
	var id = elem.id.split("genqr-")[1];
	var admin = getCookie("oauth") + "@" + getCookie("user");
	console.log("generateQR id: " + id);
	// user: getOauthProvider @ getUserId
	// admin: getCookie(oauth) @ getCookie(user)
	if (confirm("Give this user Onetime access url?") == true) {
		var data = {user: id, delivery: "admin", admin: admin};
		$.ajax({
			url: 'sendtoken',
			type: 'post',
			data: data,
			success: function(data) {
				console.log(data);
			}
		});
	} else {
		document.getElementById(elem.id).checked = false;
	}
};

function getPendingUsers() {
	$.ajax({
		url: "admin/user/pending", type: "GET",
		success: function(users) {
			var list = document.getElementById("userlist");
			for (var i = 0; i < users.length; i++) {
				var tr = document.createElement("tr");
				tr.id = users[i]._id;
				// td
				var num = document.createElement("th");
				num.setAttribute("scope", "row");
				num.innerHTML = i + 1;
				tr.appendChild(num);

				var provider = document.createElement("td");
				provider.innerHTML = getOauthProvider(users[i]);
				tr.appendChild(provider);

				var userid = document.createElement("td");
				userid.innerHTML = getUserId(users[i]);
				tr.appendChild(userid);

				var desc = document.createElement("td");
				desc.innerHTML = getUserDesc(users[i]);
				tr.appendChild(desc);

				var photoholder = document.createElement("td");
				var photo = document.createElement("img");
				photo.setAttribute("src", getUserPhoto(users[i]));
				photo.style.height = "30px";
				photoholder.appendChild(photo);
				tr.appendChild(photoholder);

				var confirm = document.createElement("td");
				var cbutton = document.createElement("button");
				cbutton.className = "btn btn-success btn-sm";
				cbutton.type = "button";
				cbutton.innerHTML = "accept";
				cbutton.id = "accept-" + users[i]._id;
				cbutton.onclick = function() { confirmUserAccept(this); };
				confirm.appendChild(cbutton);
				tr.appendChild(confirm);

				var reject = document.createElement("td");
				var rbutton = document.createElement("button");
				rbutton.className = "btn btn-danger btn-sm";
				rbutton.type = "button";
				rbutton.innerHTML = "reject";
				rbutton.id = "drop-" + users[i]._id;
				rbutton.onclick = function() { confirmUserReject(this); };
				reject.appendChild(rbutton);
				tr.appendChild(reject);

				var suspend = document.createElement("td");
				var sbutton = document.createElement("button");
				sbutton.className = "btn btn-info btn-sm";
				sbutton.type = "button";
				sbutton.innerHTML = "N/A";
				sbutton.id = "accept-" + users[i]._id;
				sbutton.onclick = function() { alert("Not available"); };
				suspend.appendChild(sbutton);
				tr.appendChild(suspend);

				list.appendChild(tr);
			}
		},
		error: function(jqXHR, textStatus, errorThrown) {
			console.error(textStatus);
			if (jqXHR.status == 401) {
				window.location.href = "login";
			}
		}
	});

}

function getActiveUsers() {
	$.ajax({
		url: "admin/user/active", type: "GET",
		success: function(users) {
			var list = document.getElementById("userlist");
			for (var i = 0; i < users.length; i++) {
				var tr = document.createElement("tr");
				tr.id = users[i]._id;
				// td
				var num = document.createElement("th");
				num.setAttribute("scope", "row");
				num.innerHTML = i + 1;
				tr.appendChild(num);

				var provider = document.createElement("td");
				provider.innerHTML = getOauthProvider(users[i]);
				tr.appendChild(provider);

				var userid = document.createElement("td");
				userid.innerHTML = getUserId(users[i]);
				tr.appendChild(userid);

				var desc = document.createElement("td");
				desc.innerHTML = getUserDesc(users[i]);
				tr.appendChild(desc);

				var photoholder = document.createElement("td");
				var photo = document.createElement("img");
				photo.setAttribute("src", getUserPhoto(users[i]));
				photo.style.height = "30px";
				photoholder.appendChild(photo);
				tr.appendChild(photoholder);

				var confirm = document.createElement("td");
				var cbutton = document.createElement("button");
				cbutton.className = "btn btn-success btn-sm";
				cbutton.type = "button";
				cbutton.innerHTML = "accept";
				cbutton.id = "accept-" + users[i]._id;
				cbutton.onclick = function() { confirmUserAccept(this); };
				confirm.appendChild(cbutton);
				tr.appendChild(confirm);

				var reject = document.createElement("td");
				var rbutton = document.createElement("button");
				rbutton.className = "btn btn-danger btn-sm";
				rbutton.type = "button";
				rbutton.id = "drop-" + users[i]._id;
				rbutton.innerHTML = "reject";
				rbutton.onclick = function() { confirmUserReject(this); };
				reject.appendChild(rbutton);
				tr.appendChild(reject);

				var suspend = document.createElement("td");
				var sbutton = document.createElement("button");
				sbutton.className = "btn btn-info btn-sm";
				sbutton.type = "button";
				sbutton.innerHTML = "suspend";
				sbutton.id = "accept-" + users[i]._id;
				sbutton.onclick = function() { suspendUser(this); };
				suspend.appendChild(sbutton);
				tr.appendChild(suspend);

				list.appendChild(tr);
			}
		},
		error: function(jqXHR, textStatus, errorThrown) {
			console.error(jqXHR.status);
			if (jqXHR.status == 401) {
				window.location.href = "login";
			}
		}
	});
}

function secondsToString(seconds) {
	var numdays = Math.floor(seconds / 86400);
	var numhours = Math.floor((seconds % 86400) / 3600);
	var numminutes = Math.floor(((seconds % 86400) % 3600) / 60);
	var numseconds = ((seconds % 86400) % 3600) % 60;
	return numdays + " days " + numhours + " hours " + numminutes + " minutes " + numseconds + " seconds";
}

