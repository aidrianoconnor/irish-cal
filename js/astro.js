// shared helpers for the astronomical calculations in moon.js and seasons.js

function degSin(deg) {
    return Math.sin(deg * Math.PI / 180);
}

function degCos(deg) {
    return Math.cos(deg * Math.PI / 180);
}

function dateToJD(date) {
    return (date.getTime() / 86400000) + 2440587.5;
}

function jdToDate(jd) {
    return new Date((jd - 2440587.5) * 86400000);
}

// difference between Terrestrial Time and Universal Time, in seconds
// polynomial from Espenak & Meeus, valid 2005 - 2050
function deltaTSeconds(year) {
    var t = year - 2000;
    return 62.92 + (0.32217 * t) + (0.005589 * t * t);
}

// converts a Julian Ephemeris Day (Terrestrial Time) to a Date (UTC)
function jdeToDate(jde) {
    var approxYear = 2000 + ((jde - 2451545.0) / 365.25);
    return jdToDate(jde - (deltaTSeconds(approxYear) / 86400));
}

// builds a calendar entry in the same shape as the original USNO data
// ({day, month, phenom, time, year} in UTC, rounded to the minute)
function makeDataObjFromDate(date, phenom) {
    date = new Date(Math.round(date.getTime() / 60000) * 60000);
    return {
        day: date.getUTCDate(),
        month: date.getUTCMonth() + 1,
        phenom: phenom,
        time: ('0' + date.getUTCHours()).slice(-2) + ':' + ('0' + date.getUTCMinutes()).slice(-2),
        year: date.getUTCFullYear()
    };
}

// converting positions to the observer's sky
// sidereal time from Meeus chapter 12, obliquity from chapter 22, horizontal coordinates from chapter 13

// longitude of the moon's ascending node (degrees), which drives the main nutation terms
// T is Julian centuries from J2000.0
function lunarNodeLongitude(T) {
    return 125.04 - (1934.136 * T);
}

// true obliquity of the ecliptic (degrees): the tilt of the Earth's axis, including nutation
function trueObliquity(T) {
    var mean = 23 + (26 / 60) + (21.448 / 3600) - (((46.8150 * T) + (0.00059 * T * T) - (0.001813 * T * T * T)) / 3600);
    return mean + (0.00256 * degCos(lunarNodeLongitude(T)));
}

// mean sidereal time at Greenwich (degrees) at the given moment
function greenwichSiderealTime(date) {
    var jd = dateToJD(date);
    var T = (jd - 2451545.0) / 36525;
    var theta = 280.46061837 + (360.98564736629 * (jd - 2451545.0)) + (0.000387933 * T * T) - ((T * T * T) / 38710000);
    return ((theta % 360) + 360) % 360;
}

// how much the atmosphere lifts an object near the horizon (degrees), from Bennett's formula
function atmosphericRefraction(altitude) {
    if(altitude < -1) {
        return 0;
    }
    return (1.02 / Math.tan((altitude + (10.3 / (altitude + 5.11))) * Math.PI / 180)) / 60;
}

// converts right ascension / declination to azimuth / altitude for an observer (all degrees)
// latitude is positive north, longitude positive east; azimuth is clockwise from north
function equatorialToHorizontal(ra, dec, date, latitude, longitude) {
    var hourAngle = greenwichSiderealTime(date) + longitude - ra;

    var altitude = Math.asin((degSin(latitude) * degSin(dec)) + (degCos(latitude) * degCos(dec) * degCos(hourAngle))) * 180 / Math.PI;
    var azimuth = Math.atan2(
        -degCos(dec) * degSin(hourAngle),
        (degSin(dec) * degCos(latitude)) - (degCos(dec) * degCos(hourAngle) * degSin(latitude))
    ) * 180 / Math.PI;

    return { azimuth: ((azimuth % 360) + 360) % 360, altitude: altitude };
}
