"use strict";

var startTime = new Date().getTime();

var conn = $.hdb.getConnection();
var querySelect = "SELECT TOP 50 \"id\", \"name\", \"address1\", \"address2\", \"city\", \"state\", \"code\", \"country\"" +
	" FROM \"CODEJAMGEO_HDI_VITALDB_1\".\"codejamgeo.vitaldb::main.breweries\"" + " WHERE \"gcstatus\" is NULL" + " ORDER BY \"id\"";
var queryUpdate = 'UPDATE "CODEJAMGEO_HDI_VITALDB_1"."codejamgeo.vitaldb::main.breweries"' 
	+' SET "latitude" = ?, "longitude" = ?, "gcstatus" = ?' 
	+' WHERE "id" = ?';

var rs = conn.executeQuery(querySelect);

var body = "";
var addressToQuery = "";
var locationPoint = "";

var client = new $.net.http.Client();

for (var i = 0; i < rs.length; i++) {
	addressToQuery = rs[i].address1 + "+" + rs[i].address2 + "+" + rs[i].city + "+" + rs[i].state + "+" + rs[i].code + "+" + rs[i].country;
	addressToQuery = addressToQuery.split("null").join("");
	body += "<p>" + addressToQuery;

	var workingUrl = "http://nominatim.openstreetmap.org/search?q=" + addressToQuery + "&limit=1&format=jsonv2";
	client.request($.net.http.GET, workingUrl);
	var response = client.getResponse();

	if (response.status === 200) {
		var headersR = response.headers; //TODO: try to catch JSON and HTML(when error is returned)
		var geoData = JSON.parse(response.body.asString());
		if (geoData.length > 0) {
			locationPoint = "POINT(" + geoData[0].lon + " " + geoData[0].lat + ")";
			body += " -> " + locationPoint;
			conn.executeUpdate(queryUpdate, geoData[0].lat, geoData[0].lon, "ADDRESS", rs[i].id);
		} else {
			body += " -> No results";
			//Second try - search by the POI name
			addressToQuery = rs[i].name;
			body += "<li>" + addressToQuery;
			workingUrl = "http://nominatim.openstreetmap.org/search?q=" + addressToQuery + "&limit=1&format=json";
			client.request($.net.http.GET, workingUrl);
			response = client.getResponse();

			if (response.status === 200) {
				geoData = JSON.parse(response.body.asString());
				if (geoData.length > 0) {
					locationPoint = "POINT(" + geoData[0].lon + " " + geoData[0].lat + ")";
					body += " -> " + locationPoint;
					conn.executeUpdate(queryUpdate, geoData[0].lat, geoData[0].lon, "POI", rs[i].id);
				} else {
					body += " -> No results";
					conn.executeUpdate(queryUpdate, null, null, "NO DATA", rs[i].id);
				}
			}
		}
	} else {
		console.log(response.status);
	}
	conn.commit();
	var currentTime = new Date().getTime();
	while (currentTime + 1000 >= new Date().getTime()) { /* Delay for 1 sec as per API requirement */ }
} //for i

conn.commit();
conn.close();

var processingTime = new Date().getTime() - startTime;
body += "<h3>" + rs.length + " records processed in (ms): " + processingTime;
$.response.setBody(body);
$.response.status = $.net.http.OK;