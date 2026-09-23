// the sun's position in the sky for an observer
// low accuracy solar coordinates from Jean Meeus, "Astronomical Algorithms" (2nd ed.), chapter 25
// (good to about 0.01 deg), sidereal time from chapter 12 and horizontal coordinates from chapter 13

// the sun's apparent right ascension and declination (degrees) at the given moment
function calcSunEquatorial(date) {
    var jd = dateToJD(date);
    var T = (jd - 2451545.0) / 36525;

    // geometric mean longitude and mean anomaly
    var L0 = 280.46646 + (36000.76983 * T) + (0.0003032 * T * T);
    var M = 357.52911 + (35999.05029 * T) - (0.0001537 * T * T);

    // equation of centre, giving the true longitude
    var C = ((1.914602 - (0.004817 * T) - (0.000014 * T * T)) * degSin(M))
          + ((0.019993 - (0.000101 * T)) * degSin(2 * M))
          + (0.000289 * degSin(3 * M));

    // apparent longitude, corrected for nutation and aberration
    var omega = 125.04 - (1934.136 * T);
    var lambda = L0 + C - 0.00569 - (0.00478 * degSin(omega));

    // obliquity of the ecliptic
    var epsilon = 23 + (26 / 60) + (21.448 / 3600) - (((46.8150 * T) + (0.00059 * T * T) - (0.001813 * T * T * T)) / 3600);
    epsilon += 0.00256 * degCos(omega);

    return {
        ra: Math.atan2(degCos(epsilon) * degSin(lambda), degCos(lambda)) * 180 / Math.PI,
        dec: Math.asin(degSin(epsilon) * degSin(lambda)) * 180 / Math.PI
    };
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

// the sun's position as seen by an observer at the given latitude / longitude (degrees) and moment:
// { azimuth, altitude } in degrees, with altitude as it appears (including refraction)
function calcSunPosition(date, latitude, longitude) {
    var eq = calcSunEquatorial(date);
    var pos = equatorialToHorizontal(eq.ra, eq.dec, date, latitude, longitude);
    pos.altitude += atmosphericRefraction(pos.altitude);
    return pos;
}
