var result = "";
var conn = $.hdb.getConnection();
var stmt =
	'INSERT INTO "CODEJAMGEO_HDI_VITALDB_1"."codejamgeo.vitaldb::main.breweries" ("id", "name", "location") VALUES(?, \'Test\', ST_GEOMFROMTEXT(TO_CHAR(?), 4326))';
try {
	var nrrecs = conn.executeUpdate(stmt, 3002, 'POINT(10 10)');
	result = "<p>Inserted records" + nrrecs.toString();
} catch (e) {
	result = e.toString();
}
var queryUpdate = 'UPDATE "CODEJAMGEO_HDI_VITALDB_1"."codejamgeo.vitaldb::main.breweries"' 
	+' SET "location" = ST_GEOMFROMTEXT(TO_CHAR(?), 4326), "gcloctype" = ?, "gcstatus" = ?' 
	+' WHERE "id" = ?';

try {
	nrrecs = conn.executeUpdate(queryUpdate, 'POINT(20 20)', 'TEST', 'OK', 3003);
	result += "<p>Updated records" + nrrecs.toString();
} catch (e) {
	result += e.toString();
}

conn.commit();
conn.close();
$.response.setBody(result);