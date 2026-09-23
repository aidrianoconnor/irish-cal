// moon phase calculations, replacing the manually pasted USNO moon data
// algorithm from Jean Meeus, "Astronomical Algorithms" (2nd ed.), chapter 49
// accurate to within a minute or so of the USNO data for the 21st century

var MOON_PHASES = ['New Moon', 'First Quarter', 'Full Moon', 'Last Quarter'];

// mean synodic month & the JDE of the new moon of Jan 6, 2000 (k = 0)
var SYNODIC_MONTH = 29.530588861;
var NEW_MOON_EPOCH_JDE = 2451550.09766;

// k is the lunation number (0 = new moon of Jan 6, 2000)
// phaseIndex: 0 = new, 1 = first quarter, 2 = full, 3 = last quarter
// returns the moment of that phase as a Date (UTC)
function calcMoonPhase(k, phaseIndex) {
    k = k + (phaseIndex / 4);

    var T = k / 1236.85;
    var T2 = T * T, T3 = T2 * T, T4 = T3 * T;

    var jde = NEW_MOON_EPOCH_JDE + (SYNODIC_MONTH * k) + (0.00015437 * T2) - (0.000000150 * T3) + (0.00000000073 * T4);

    // eccentricity of Earth's orbit
    var E = 1 - (0.002516 * T) - (0.0000074 * T2);
    var E2 = E * E;

    // sun's mean anomaly, moon's mean anomaly, moon's argument of latitude, longitude of ascending node
    var M = 2.5534 + (29.10535670 * k) - (0.0000014 * T2) - (0.00000011 * T3);
    var Mp = 201.5643 + (385.81693528 * k) + (0.0107582 * T2) + (0.00001238 * T3) - (0.000000058 * T4);
    var F = 160.7108 + (390.67050284 * k) - (0.0016118 * T2) - (0.00000227 * T3) + (0.000000011 * T4);
    var Om = 124.7746 - (1.56375588 * k) + (0.0020672 * T2) + (0.00000215 * T3);

    var c = 0;

    if(phaseIndex == 0 || phaseIndex == 2) {
        var isNew = (phaseIndex == 0);
        c += (isNew ? -0.40720 : -0.40614) * degSin(Mp);
        c += (isNew ? 0.17241 : 0.17302) * E * degSin(M);
        c += (isNew ? 0.01608 : 0.01614) * degSin(2 * Mp);
        c += (isNew ? 0.01039 : 0.01043) * degSin(2 * F);
        c += (isNew ? 0.00739 : 0.00734) * E * degSin(Mp - M);
        c += (isNew ? -0.00514 : -0.00515) * E * degSin(Mp + M);
        c += (isNew ? 0.00208 : 0.00209) * E2 * degSin(2 * M);
        c += -0.00111 * degSin(Mp - (2 * F));
        c += -0.00057 * degSin(Mp + (2 * F));
        c += 0.00056 * E * degSin((2 * Mp) + M);
        c += -0.00042 * degSin(3 * Mp);
        c += 0.00042 * E * degSin(M + (2 * F));
        c += 0.00038 * E * degSin(M - (2 * F));
        c += -0.00024 * E * degSin((2 * Mp) - M);
        c += -0.00017 * degSin(Om);
        c += -0.00007 * degSin(Mp + (2 * M));
        c += 0.00004 * degSin((2 * Mp) - (2 * F));
        c += 0.00004 * degSin(3 * M);
        c += 0.00003 * degSin(Mp + M - (2 * F));
        c += 0.00003 * degSin((2 * Mp) + (2 * F));
        c += -0.00003 * degSin(Mp + M + (2 * F));
        c += 0.00003 * degSin(Mp - M + (2 * F));
        c += -0.00002 * degSin(Mp - M - (2 * F));
        c += -0.00002 * degSin((3 * Mp) + M);
        c += 0.00002 * degSin(4 * Mp);
    } else {
        c += -0.62801 * degSin(Mp);
        c += 0.17172 * E * degSin(M);
        c += -0.01183 * E * degSin(Mp + M);
        c += 0.00862 * degSin(2 * Mp);
        c += 0.00804 * degSin(2 * F);
        c += 0.00454 * E * degSin(Mp - M);
        c += 0.00204 * E2 * degSin(2 * M);
        c += -0.00180 * degSin(Mp - (2 * F));
        c += -0.00070 * degSin(Mp + (2 * F));
        c += -0.00040 * degSin(3 * Mp);
        c += -0.00034 * E * degSin((2 * Mp) - M);
        c += 0.00032 * E * degSin(M + (2 * F));
        c += 0.00032 * E * degSin(M - (2 * F));
        c += -0.00028 * E2 * degSin(Mp + (2 * M));
        c += 0.00027 * E * degSin((2 * Mp) + M);
        c += -0.00017 * degSin(Om);
        c += -0.00005 * degSin(Mp - M - (2 * F));
        c += 0.00004 * degSin((2 * Mp) + (2 * F));
        c += -0.00004 * degSin(Mp + M + (2 * F));
        c += 0.00004 * degSin(Mp - (2 * M));
        c += 0.00003 * degSin(Mp + M - (2 * F));
        c += 0.00003 * degSin(3 * M);
        c += 0.00002 * degSin((2 * Mp) - (2 * F));
        c += 0.00002 * degSin(Mp - M + (2 * F));
        c += -0.00002 * degSin((3 * Mp) + M);

        var W = 0.00306 - (0.00038 * E * degCos(M)) + (0.00026 * degCos(Mp)) - (0.00002 * degCos(Mp - M)) + (0.00002 * degCos(Mp + M)) + (0.00002 * degCos(2 * F));
        c += (phaseIndex == 1) ? W : -W;
    }

    // planetary corrections, common to all phases
    var planetary = [
        [0.000325, 299.77 + (0.107408 * k) - (0.009173 * T2)],
        [0.000165, 251.88 + (0.016321 * k)],
        [0.000164, 251.83 + (26.651886 * k)],
        [0.000126, 349.42 + (36.412478 * k)],
        [0.000110, 84.66 + (18.206239 * k)],
        [0.000062, 141.74 + (53.303771 * k)],
        [0.000060, 207.14 + (2.453732 * k)],
        [0.000056, 154.84 + (7.306860 * k)],
        [0.000047, 34.52 + (27.261239 * k)],
        [0.000042, 207.19 + (0.121824 * k)],
        [0.000040, 291.34 + (1.844379 * k)],
        [0.000037, 161.72 + (24.198154 * k)],
        [0.000035, 239.56 + (25.513099 * k)],
        [0.000023, 331.55 + (3.592518 * k)]
    ];
    for(var i = 0; i < planetary.length; i++) {
        c += planetary[i][0] * degSin(planetary[i][1]);
    }

    return jdeToDate(jde + c);
}

// builds moon phase entries covering a few lunations either side of the given date
function calcMoonPhaseData(aroundDate) {
    var kNow = Math.floor((dateToJD(aroundDate) - NEW_MOON_EPOCH_JDE) / SYNODIC_MONTH);
    var data = [];

    for(var k = kNow - 2; k <= kNow + 2; k++) {
        for(var p = 0; p < 4; p++) {
            data.push(makeDataObjFromDate(calcMoonPhase(k, p), MOON_PHASES[p]));
        }
    }

    return data;
}

// the moon's position in the sky for an observer
// from Meeus chapter 47, using the largest terms of the lunar series (good to a few hundredths of a degree)

// periodic terms for longitude and distance: [D, M, M', F, longitude (1e-6 deg), distance (1e-3 km)]
var MOON_LONGITUDE_DISTANCE_TERMS = [
    [0, 0, 1, 0, 6288774, -20905355], [2, 0, -1, 0, 1274027, -3699111], [2, 0, 0, 0, 658314, -2955968],
    [0, 0, 2, 0, 213618, -569925], [0, 1, 0, 0, -185116, 48888], [0, 0, 0, 2, -114332, -3149],
    [2, 0, -2, 0, 58793, 246158], [2, -1, -1, 0, 57066, -152138], [2, 0, 1, 0, 53322, -170733],
    [2, -1, 0, 0, 45758, -204586], [0, 1, -1, 0, -40923, -129620], [1, 0, 0, 0, -34720, 108743],
    [0, 1, 1, 0, -30383, 104755], [2, 0, 0, -2, 15327, 10321], [0, 0, 1, 2, -12528, 0],
    [0, 0, 1, -2, 10980, 79661], [4, 0, -1, 0, 10675, -34782], [0, 0, 3, 0, 10034, -23210],
    [4, 0, -2, 0, 8548, -21636], [2, 1, -1, 0, -7888, 24208], [2, 1, 0, 0, -6766, 30824],
    [1, 0, -1, 0, -5163, -8379], [1, 1, 0, 0, 4987, -16675], [2, -1, 1, 0, 4036, -12831],
    [2, 0, 2, 0, 3994, -10445], [4, 0, 0, 0, 3861, -11650], [2, 0, -3, 0, 3665, 14403],
    [0, 1, -2, 0, -2689, -7003], [2, 0, -1, 2, -2602, 0], [2, -1, -2, 0, 2390, 10056],
    [1, 0, 1, 0, -2348, 6322], [2, -2, 0, 0, 2236, -9884]
];

// periodic terms for latitude: [D, M, M', F, latitude (1e-6 deg)]
var MOON_LATITUDE_TERMS = [
    [0, 0, 0, 1, 5128122], [0, 0, 1, 1, 280602], [0, 0, 1, -1, 277693], [2, 0, 0, -1, 173237],
    [2, 0, -1, 1, 55413], [2, 0, -1, -1, 46271], [2, 0, 0, 1, 32573], [0, 0, 2, 1, 17198],
    [2, 0, 1, -1, 9266], [0, 0, 2, -1, 8822], [2, -1, 0, -1, 8216], [2, 0, -2, -1, 4324],
    [2, 0, 1, 1, 4200], [2, 1, 0, -1, -3359], [2, -1, -1, 1, 2463], [2, -1, 0, 1, 2211],
    [2, -1, -1, -1, 2065], [0, 1, -1, -1, -1870], [4, 0, -1, -1, 1828], [0, 1, 0, 1, -1794]
];

var EARTH_RADIUS_KM = 6378.14;

// the moon's apparent (geocentric) right ascension and declination (degrees) and distance (km)
function calcMoonEquatorial(date) {
    // the lunar theory runs on Terrestrial Time, and the moon moves fast enough for the difference to matter
    var jde = dateToJD(date) + (deltaTSeconds(date.getUTCFullYear()) / 86400);
    var T = (jde - 2451545.0) / 36525;
    var T2 = T * T, T3 = T2 * T, T4 = T3 * T;

    // mean longitude, mean elongation, sun's and moon's mean anomalies, argument of latitude
    var Lp = 218.3164477 + (481267.88123421 * T) - (0.0015786 * T2) + (T3 / 538841) - (T4 / 65194000);
    var D = 297.8501921 + (445267.1114034 * T) - (0.0018819 * T2) + (T3 / 545868) - (T4 / 113065000);
    var M = 357.5291092 + (35999.0502909 * T) - (0.0001536 * T2) + (T3 / 24490000);
    var Mp = 134.9633964 + (477198.8675055 * T) + (0.0087414 * T2) + (T3 / 69699) - (T4 / 14712000);
    var F = 93.2720950 + (483202.0175233 * T) - (0.0036539 * T2) - (T3 / 3526000) + (T4 / 863310000);

    var A1 = 119.75 + (131.849 * T);
    var A2 = 53.09 + (479264.290 * T);
    var A3 = 313.45 + (481266.484 * T);

    // terms involving the sun's anomaly shrink with the Earth's orbital eccentricity
    var E = 1 - (0.002516 * T) - (0.0000074 * T2);

    var sumL = 0, sumR = 0, sumB = 0, i, t, arg, e;

    for(i = 0; i < MOON_LONGITUDE_DISTANCE_TERMS.length; i++) {
        t = MOON_LONGITUDE_DISTANCE_TERMS[i];
        arg = (t[0] * D) + (t[1] * M) + (t[2] * Mp) + (t[3] * F);
        e = Math.pow(E, Math.abs(t[1]));
        sumL += t[4] * e * degSin(arg);
        sumR += t[5] * e * degCos(arg);
    }
    for(i = 0; i < MOON_LATITUDE_TERMS.length; i++) {
        t = MOON_LATITUDE_TERMS[i];
        arg = (t[0] * D) + (t[1] * M) + (t[2] * Mp) + (t[3] * F);
        sumB += t[4] * Math.pow(E, Math.abs(t[1])) * degSin(arg);
    }

    // additional terms from Venus, Jupiter and the Earth's flattening
    sumL += (3958 * degSin(A1)) + (1962 * degSin(Lp - F)) + (318 * degSin(A2));
    sumB += (-2235 * degSin(Lp)) + (382 * degSin(A3)) + (175 * degSin(A1 - F)) + (175 * degSin(A1 + F))
          + (127 * degSin(Lp - Mp)) - (115 * degSin(Lp + Mp));

    // ecliptic longitude (with nutation) and latitude, and distance
    var lambda = Lp + (sumL / 1000000) - (0.00478 * degSin(lunarNodeLongitude(T)));
    var beta = sumB / 1000000;
    var distance = 385000.56 + (sumR / 1000);

    var epsilon = trueObliquity(T);

    return {
        ra: Math.atan2((degSin(lambda) * degCos(epsilon)) - (Math.tan(beta * Math.PI / 180) * degSin(epsilon)), degCos(lambda)) * 180 / Math.PI,
        dec: Math.asin((degSin(beta) * degCos(epsilon)) + (degCos(beta) * degSin(epsilon) * degSin(lambda))) * 180 / Math.PI,
        distance: distance
    };
}

// the moon's position as seen by an observer at the given latitude / longitude (degrees) and moment:
// { azimuth, altitude } in degrees, with altitude as it appears (including parallax and refraction),
// plus its distance (km) and apparent diameter (degrees)
function calcMoonPosition(date, latitude, longitude) {
    var eq = calcMoonEquatorial(date);
    var pos = equatorialToHorizontal(eq.ra, eq.dec, date, latitude, longitude);

    // parallax: seen from the Earth's surface rather than its centre, the moon sits lower in the sky
    var horizontalParallax = Math.asin(EARTH_RADIUS_KM / eq.distance) * 180 / Math.PI;
    pos.altitude -= horizontalParallax * degCos(pos.altitude);
    pos.altitude += atmosphericRefraction(pos.altitude);

    pos.distance = eq.distance;
    pos.diameter = 2 * Math.asin(1737.4 / eq.distance) * 180 / Math.PI;
    return pos;
}
