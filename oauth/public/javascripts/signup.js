var urlParams = new URLSearchParams(window.location.search);
var referer = urlParams.get('referer');
if (!referer)
	referer = "/" + window.location.pathname.split("/")[1];
var refererInput = document.getElementById("input-referer");
refererInput.value = referer;


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

// check duplicated id (true on duplicated)
function dupIdCheck() {
	var id = document.getElementById("id").value;
	$.ajax({
		url: '../../dupidcheck/local/' + id,
		type: 'get',
		success: function(data) {
			if (data) {
				alert(id + " already exists");
				document.getElementById("idVerified").value = false;
			} else {
				alert(id + " is good to go");
				document.getElementById("idVerified").value = true;
			}
		},
		error: function(jqXHR, textStatus, errorThrown) {
			console.error(jqXHR.status);
		}
	});
}

function checkForm() {
	var idVerified = document.getElementById("idVerified").value;
	var passwdVerified = document.getElementById("passwdVerified").value;
	var name = document.getElementById("realname").value;
	if (idVerified == "false") {
		alert("Please check ID");
		return false;
	}
	if (passwdVerified == "false") {
		alert("Please check password");
		return false;
	}
	if (name.length < 3) {
		alert("Please check name");
		return false;
	}
	return true;
}

$(document).ready(function () {
	$("#passwordConfirm").keyup(checkPasswordMatch);
});
