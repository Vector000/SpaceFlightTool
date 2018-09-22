function getSunOverlay()
{

	var j = jd();
	var dec = sunDecRA(1,j);
	var dt = new Date();
	var LT = dt.getUTCHours() + dt.getUTCMinutes()/60;
//	var tau = 15*(LT-12); INCORRECT!

	let DY = dayofyear(dt);
	let g = (360/365.25)*(DY + LT/24);
	let TC = 0.004297+0.107029*Math.cos(g*Math.PI/180)-1.837877*Math.sin(g*Math.PI/180)-0.837378*Math.cos(2*g*Math.PI/180)-2.340475*Math.sin(2*g*Math.PI/180);
	let SHA = (LT-12)*15 + TC;

	var icon = L.icon({
		iconUrl: 'local-lib/images/sun.gif',
		iconSize:     [16, 16], // size of the icon
	});
	var pos = L.latLng(dec, -SHA);
	var sunMarker = L.marker(pos, {icon: icon});
	return sunMarker;
}
function jd() {
	let dt = new Date();
  let MM=dt.getUTCMonth() + 1;
  let DD=dt.getUTCDate();
  let YY=dt.getUTCFullYear();
  let HR=dt.getUTCHours();
  let MN= dt.getUTCMinutes();
  //SC=0;
	let SC = dt.getUTCSeconds();
	HR = HR + (MN / 60) + (SC/3600);
	let GGG = 1;
	if (YY <= 1585) GGG = 0;
	let JD = -1 * Math.floor(7 * (Math.floor((MM + 9) / 12) + YY) / 4);
	let S = 1;
	if ((MM - 9)<0) S=-1;
	let A = Math.abs(MM - 9);
	let J1 = Math.floor(YY + S * Math.floor(A / 7));
	J1 = -1 * Math.floor((Math.floor(J1 / 100) + 1) * 3 / 4);
	JD = JD + Math.floor(275 * MM / 9) + DD + (GGG * J1);
	JD = JD + 1721027 + 2 * GGG + 367 * YY - 0.5;
	JD = JD + (HR / 24);
  return JD;
}
function sunDecRA (what, jd) {
		var PI2 = 2.0*Math.PI;
		var cos_eps = 0.917482;
		var sin_eps = 0.397778;
		var M, DL, L, SL, X, Y, Z, R;
		var T, dec, ra;
		T = (jd - 2451545.0) / 36525.0;	// number of Julian centuries since Jan 1, 2000, 0 GMT
		M = PI2*frac(0.993133 + 99.997361*T);
		DL = 6893.0*Math.sin(M) + 72.0*Math.sin(2.0*M);
		L = PI2*frac(0.7859453 + M/PI2 + (6191.2*T+DL)/1296000);
		SL = Math.sin(L);
		X = Math.cos(L);
		Y = cos_eps*SL;
		Z = sin_eps*SL;
		R = Math.sqrt(1.0-Z*Z);
		dec = (360.0/PI2)*Math.atan(Z/R);
		ra = (48.0/PI2)*Math.atan(Y/(X+R));
		if (ra<0) ra = ra + 24.0;
		if (what==1) return dec; else return ra;
}
function frac(X) {
 X = X - Math.floor(X);
 if (X<0) X = X + 1.0;
 return X;
}

function dayofyear(d) {   // d is a Date object
var yn = d.getFullYear();
var mn = d.getMonth();
var dn = d.getDate();
var d1 = new Date(yn,0,1,12,0,0); // noon on Jan. 1
var d2 = new Date(yn,mn,dn,12,0,0); // noon on input date
var ddiff = Math.round((d2-d1)/864e5);
return ddiff+1; }
