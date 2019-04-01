/*eslint no-console: 0, no-unused-vars: 0, dot-notation: 0*/
"use strict";

var conn = $.hdb.getConnection();
var query = 'SELECT \'Feature\' as "type", "id" as "id", "location".st_asGeoJSON() as "geometry"'
+ ' FROM "codejamgeo.vitaldb::main.breweries"'
+ ' WHERE "id"<10000';

/* Old view-based 
var query = "SELECT 'Feature' as \"type\", \"brewery_id\" as \"id\", \"geopoint\".st_asGeoJSON() as \"geometry\""
+ " FROM \"codejamgeo.vitaldb::main.breweries_geoview\""
+ " WHERE \"brewery_id\"<10000";
*/

var rs = conn.executeQuery(query);

var body = {};
body.type="FeatureCollection";

for (var row in rs) {
	rs[row].geometry=JSON.parse(rs[row].geometry);
	rs[row].properties = { breweryid : rs[row].id };
}

body.features = rs;

$.response.contentType = "application/json";
$.response.setBody(body);
$.response.status = $.net.http.OK;