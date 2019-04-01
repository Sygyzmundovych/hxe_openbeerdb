"use strict";

var startTime = new Date().getTime();
var apikey="AIzaSyAV31oB5fuBLVprCpW3W0kvVu3Q0TABs9U";

var conn = $.hdb.getConnection();
var querySelect = 'SELECT TOP 50 "id", "name", "address1", "address2", "city", "state", "code", "country"'
	+ ' FROM "CODEJAMGEO_HDI_VITALDB_1"."codejamgeo.vitaldb::main.breweries"'
	+ ' WHERE "gcstatus" is NULL'
	+ ' ORDER BY "id"'
	;
var queryUpdate = 'UPDATE "CODEJAMGEO_HDI_VITALDB_1"."codejamgeo.vitaldb::main.breweries"' 
	+' SET "location" = ST_GEOMFROMTEXT(TO_CHAR(?), 4326), "gcloctype" = ?, "gcstatus" = ?' 
	+' WHERE "id" = ?'
	;
var queryUpdateUnsuccessful = 'UPDATE "CODEJAMGEO_HDI_VITALDB_1"."codejamgeo.vitaldb::main.breweries"' 
	+' SET "gcstatus" = ?' 
	+' WHERE "id" = ?';
	
var rs = conn.executeQuery(querySelect);

var body = ""; 
var addressToQuery = "";
var recsUpdated = 0;

for(var i = 0; i < rs.length; i++){
	var currentTime = new Date().getTime();
	$.response.setBody(i);
	addressToQuery = encodeURIComponent(rs[i].address1)+"+"+encodeURIComponent(rs[i].address2)+"+"+encodeURIComponent(rs[i].city)+"+";
	addressToQuery += encodeURIComponent(rs[i].state)+"+"+encodeURIComponent(rs[i].code)+"+"+encodeURIComponent(rs[i].country);
	addressToQuery = addressToQuery.split("null").join("");
	body += "<p>"+addressToQuery+" with id="+rs[i].id+" -> ";
  
	var client = new $.net.http.Client();
	var workingUrl = "https://maps.googleapis.com/maps/api/geocode/json?address="+addressToQuery + "&key="+apikey;
	client.request($.net.http.GET, workingUrl);
	var response = client.getResponse();

	if (response.status === 200) {
		var geoData = JSON.parse(response.body.asString());
		if (geoData.status === "OK")
		{
			var pointToUpdate = 'POINT('+geoData.results[0].geometry.location.lng.toFixed(5)+' '+geoData.results[0].geometry.location.lat.toFixed(5)+')';
			/* Google API can return coordinates with 14 digits after comma, which is around the thickness of an atom. Rounding to 5, which is ~11m */
			var nrrecs = conn.executeUpdate(queryUpdate, pointToUpdate, geoData.results[0].geometry.location_type, geoData.status, rs[i].id);
			conn.commit();
			recsUpdated += nrrecs;
			body += JSON.stringify(geoData.results[0].geometry.location)
				+" "+geoData.results[0].geometry.location_type;
		}else{
			var nrrecs = conn.executeUpdate(queryUpdateUnsuccessful, geoData.status, rs[i].id);
			conn.commit();
			body += " " + geoData.status;
		}
	} else {
		body += " " + response.status;
	}
	while (currentTime + 0.1*1000 >= new Date().getTime()) 
		{ /* Delay if needed for 0.1 sec per iteration to stay within API limits */ }
} //for i
conn.commit();
conn.close();

var processingTime = new Date().getTime() - startTime;
body += "<h3> Records updated: " + recsUpdated + " out of " + rs.length + " processed in (ms): " + processingTime;
$.response.setBody(body);
$.response.status = $.net.http.OK;