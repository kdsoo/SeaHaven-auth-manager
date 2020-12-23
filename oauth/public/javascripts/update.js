var urlParams = new URLSearchParams(window.location.search);
var referer = urlParams.get('referer');
if (!referer)
	referer = "/" + window.location.pathname.split("/")[1];
var refererInput = document.getElementById("input-referer");
refererInput.value = referer;

function getAccountData() {
	$.getJSON("account/data", function(data){
		console.log(data);
		var keys = Object.keys(data);
		console.log(keys);
		var username = document.getElementById("id");
		username.value = data["id"];
		var realname = document.getElementById("realname");
		realname.value = data["displayName"];
	});
}

function checkPasswordMatch() {
	var password = $("#password").val();
	var confirmPassword = $("#passwordConfirm").val();

	if (password.length > 0) {
		if (password != confirmPassword) {
			$("#passwordMatch").html("Passwords do not match!");
			$("#passwdVerified").val(false);
		} else {
			$("#passwordMatch").html("Passwords match.");
			$("#passwdVerified").val(true);
		}
	}
}


function checkForm() {
	var currentPassword = document.getElementById("currentPassword").value;
	var password = document.getElementById("password").value;
	var passwdVerified = document.getElementById("passwdVerified").value;
	var name = document.getElementById("realname").value;
	console.log("new password:", password);

	if (!currentPassword) {
		alert("Please give current password");
		return false;
	}
	if (password && passwdVerified == "false") {
		alert("Please check password");
		return false;
	}
	if (name.length < 3) {
		alert("Please check name");
		return false;
	}
	return true;
}

$(window).bind("pageshow", function(event) {
	if (event.originalEvent.persisted) {
		console.log("page reloading");
		window.location.reload();
	}
});
$(document).ready(function () {
	$("#passwordConfirm").keyup(checkPasswordMatch);
	getAccountData();
});
