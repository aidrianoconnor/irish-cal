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
