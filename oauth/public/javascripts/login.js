var urlParams = new URLSearchParams(window.location.search);
var referer = urlParams.get('referer');
if (!referer)
	referer = "/" + window.location.pathname.split("/")[1];
var refererInput = document.getElementById("input-referer");
refererInput.value = referer;
