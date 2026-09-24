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

// precession: the slow turning of the Earth's axis (about 50 arcseconds a year) moves the celestial pole and
// equinox, so star positions given for J2000 need turning to the given date's. from Meeus chapter 21 (rigorous
// method), as a rotation matrix (row-major, 9 numbers) taking a J2000 unit vector (x towards the equinox,
// z towards the pole) to the date's
function precessionMatrix(date) {
    var T = (dateToJD(date) - 2451545.0) / 36525;
    var arcsec = Math.PI / (180 * 3600);
    var zeta = ((2306.2181 * T) + (0.30188 * T * T) + (0.017998 * T * T * T)) * arcsec;
    var z = ((2306.2181 * T) + (1.09468 * T * T) + (0.018203 * T * T * T)) * arcsec;
    var theta = ((2004.3109 * T) - (0.42665 * T * T) - (0.041833 * T * T * T)) * arcsec;

    // turn by zeta about the pole, tilt by theta, then turn by z
    var cz = Math.cos(zeta), sz = Math.sin(zeta), ct = Math.cos(theta), st = Math.sin(theta), cZ = Math.cos(z), sZ = Math.sin(z);
    return [
        (cZ * ct * cz) - (sZ * sz), -(cZ * ct * sz) - (sZ * cz), -cZ * st,
        (sZ * ct * cz) + (cZ * sz), -(sZ * ct * sz) + (cZ * cz), -sZ * st,
        st * cz, -st * sz, ct
    ];
}

// rising and setting

// the local day containing the given moment, as [start, end) in ms: midnight to midnight in local mean solar
// time at the given longitude (degrees, east positive), which is close to local clock time anywhere
function localDayWindow(date, longitude) {
    var offset = (longitude / 15) * 3600000; // local mean solar time is ahead of UTC by this much
    var local = date.getTime() + offset;
    var start = (Math.floor(local / 86400000) * 86400000) - offset;
    return [start, start + 86400000];
}

// finds when altitudeAt(t) (degrees, t in ms) crosses h0 between start and end:
// { rise, set } as Dates (either can be null if it doesn't happen in the window),
// plus alwaysAbove / alwaysBelow when it never crosses (e.g. midnight sun, polar night)
function findHorizonCrossings(altitudeAt, h0, start, end) {
    var STEP = 10 * 60000;
    var result = { rise: null, set: null, alwaysAbove: false, alwaysBelow: false };

    // the moment within a minute between t1 and t2 when the altitude crosses h0
    var refine = function(t1, t2) {
        var above1 = altitudeAt(t1) > h0;
        while(t2 - t1 > 60000) {
            var mid = (t1 + t2) / 2;
            if((altitudeAt(mid) > h0) == above1) {
                t1 = mid;
            } else {
                t2 = mid;
            }
        }
        return new Date(Math.round(((t1 + t2) / 2) / 60000) * 60000);
    };

    var prevT = start;
    var prevAbove = altitudeAt(start) > h0;
    var anyAbove = prevAbove, anyBelow = !prevAbove;
    for(var t = start + STEP; t <= end; t += STEP) {
        var tt = Math.min(t, end);
        var above = altitudeAt(tt) > h0;
        anyAbove = anyAbove || above;
        anyBelow = anyBelow || !above;
        if(above && !prevAbove && !result.rise) {
            result.rise = refine(prevT, tt);
        } else if(!above && prevAbove && !result.set) {
            result.set = refine(prevT, tt);
        }
        prevT = tt;
        prevAbove = above;
    }

    result.alwaysAbove = anyAbove && !anyBelow;
    result.alwaysBelow = anyBelow && !anyAbove;
    return result;
}
