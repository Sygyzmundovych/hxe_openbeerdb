# hxe_openbeerdb
HXE sample app based on OpenBeerDB

## Additional steps

1. Google certificates should be imported into XSA Cockpit

With Firefox (in my case) open https://maps.googleapis.com/maps/api/ and then:

1/ Go to Page Info -> Security -> View certificate -> Details -> Export

2/ Export **both** host's PEM certificate and root's ("...with chain")

3/ As an XSA admin user add **both** certificates via HANA XS Advanced Cockpit -> Trust Certificates, or `xs trust-certificate` command

4/ Restart XSA (it takes time, so I tried to find minimum services that should be restarted, but with no luck. If you know the trick, please share in comments)

2. `/js/lib/keys/` should contain `google.xsjslib` file with the entry

```
var mapsKey = "YourAPICodeToGoogleGeoCodingService";
```
