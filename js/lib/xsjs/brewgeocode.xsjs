"use strict";

$.import("keys","google");

var startTime = new Date().getTime();
var apikey = $.keys.google.mapsKey;
console.log("API key is: ", apikey);

var conn = $.hdb.getConnection();
var querySelect = 'SELECT TOP 1 "id", "name", "address1", "address2", "city", "state", "code", "country"' +
	' FROM "codejamgeo.vitaldb::main.breweries"' + ' WHERE "gcstatus" is NULL' + ' ORDER BY "id"';
var queryUpdate = 'UPDATE "codejamgeo.vitaldb::main.breweries"' +
	' SET "location" = ST_GEOMFROMTEXT(TO_CHAR(?), 4326), "gcloctype" = ?, "gcstatus" = ?' + ' WHERE "id" = ?';
var queryUpdateUnsuccessful = 'UPDATE "codejamgeo.vitaldb::main.breweries"' + ' SET "gcstatus" = ?' + ' WHERE "id" = ?';

var rs = conn.executeQuery(querySelect);
console.log(rs);

var body = "";
var addressToQuery = "";
var recsUpdated = 0;

for (var i = 0; i < rs.length; i++) {
	var currentTime = new Date().getTime();
	$.response.setBody(i);
	addressToQuery = encodeURIComponent(rs[i].address1) + "+" + encodeURIComponent(rs[i].address2) + "+" + encodeURIComponent(rs[i].city) +
		"+";
	addressToQuery += encodeURIComponent(rs[i].state) + "+" + encodeURIComponent(rs[i].code) + "+" + encodeURIComponent(rs[i].country);
	addressToQuery = addressToQuery.split("null").join("");
	body += "<p>" + addressToQuery + " with id=" + rs[i].id + " -> ";

	var client = new $.net.http.Client();
	var workingUrl = "https://maps.googleapis.com/maps/api/geocode/json?address=" + addressToQuery + "&key=" + apikey;
	console.log("URL: ", workingUrl);
	client.request($.net.http.GET, workingUrl);
	var response = client.getResponse();
	console.log("Response is: ", response);
	console.log("Response body result is: ", response.body.result);

	if (response.status === 200) {
		var geoData = JSON.parse(response.body.asString());
		console.log("geoData is: ", geoData);
		if (geoData.status === "OK") {
			var pointToUpdate = 'POINT(' + geoData.results[0].geometry.location.lng.toFixed(5) + ' ' + geoData.results[0].geometry.location.lat.toFixed(
				5) + ')';
			/* Google API can return coordinates with 14 digits after comma, which is around the thickness of an atom. Rounding to 5, which is ~11m */
			var nrrecs = conn.executeUpdate(queryUpdate, pointToUpdate, geoData.results[0].geometry.location_type, geoData.status, rs[i].id);
			conn.commit();
			recsUpdated += nrrecs;
			body += JSON.stringify(geoData.results[0].geometry.location) + " " + geoData.results[0].geometry.location_type;
		} else if (geoData.status === "REQUEST_DENIED") {
			body += " " + geoData.status + " Check your API key!";
		} else {
			var nrrecs = conn.executeUpdate(queryUpdateUnsuccessful, geoData.status, rs[i].id);
			conn.commit();
			body += " " + geoData.status;
		}
	} else {
		body += " " + response.status;
		//console.log(response);
	}
	while (currentTime + 0.1 * 1000 >= new Date().getTime()) { /* Delay if needed for 0.1 sec per iteration to stay within API limits */ }
} //for i
conn.commit();
conn.close();

var processingTime = new Date().getTime() - startTime;
body += "<h3> Records updated: " + recsUpdated + " out of " + rs.length + " processed in (ms): " + processingTime;
$.response.setBody(body);
$.response.status = $.net.http.OK;