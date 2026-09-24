// the sun's position in the sky for an observer
// low accuracy solar coordinates from Jean Meeus, "Astronomical Algorithms" (2nd ed.), chapter 25
// (good to about 0.01 deg); the conversion to the observer's sky is in astro.js

// the sun's apparent right ascension, declination and ecliptic longitude (degrees) at the given moment
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
    var lambda = L0 + C - 0.00569 - (0.00478 * degSin(lunarNodeLongitude(T)));

    var epsilon = trueObliquity(T);

    return {
        ra: Math.atan2(degCos(epsilon) * degSin(lambda), degCos(lambda)) * 180 / Math.PI,
        dec: Math.asin(degSin(epsilon) * degSin(lambda)) * 180 / Math.PI,
        longitude: lambda // apparent ecliptic longitude
    };
}

// the sun's position as seen by an observer at the given latitude / longitude (degrees) and moment:
// { azimuth, altitude } in degrees, with altitude as it appears (including refraction)
function calcSunPosition(date, latitude, longitude) {
    var eq = calcSunEquatorial(date);
    var pos = equatorialToHorizontal(eq.ra, eq.dec, date, latitude, longitude);
    pos.altitude += atmosphericRefraction(pos.altitude);
    return pos;
}

// the moment near approxDate when the sun's apparent ecliptic longitude reaches target (degrees), e.g. 45 for
// the midpoint between the March equinox and June solstice. within a few minutes (checked against
// calcSolarEvent in seasons.js for the equinoxes and solstices)
function calcSunLongitudeMoment(target, approxDate) {
    var t = approxDate.getTime();
    for(var i = 0; i < 6; i++) {
        var behind = ((((target - calcSunEquatorial(new Date(t)).longitude) % 360) + 540) % 360) - 180;
        t += (behind / 0.985647) * 86400000; // the sun moves about 0.9856 deg along the ecliptic a day
    }
    return new Date(t);
}

// sunrise and sunset on the observer's local day (or the day starting at dayStart, in ms, if given).
// as in almanacs, the sun rises / sets when its upper edge touches the horizon: its centre is then
// 0.833 deg below it (half its width plus the lift from refraction)
function calcSunRiseSet(date, latitude, longitude, dayStart) {
    var day = (dayStart === undefined) ? localDayWindow(date, longitude) : [dayStart, dayStart + 86400000];
    var altitudeAt = function(t) {
        var d = new Date(t);
        var eq = calcSunEquatorial(d);
        return equatorialToHorizontal(eq.ra, eq.dec, d, latitude, longitude).altitude;
    };
    return findHorizonCrossings(altitudeAt, -0.8333, day[0], day[1]);
}
