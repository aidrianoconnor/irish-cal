// moon phase calculations, replacing the manually pasted USNO moon data
// algorithm from Jean Meeus, "Astronomical Algorithms" (2nd ed.), chapter 49
// accurate to within a minute or so of the USNO data for the 21st century

var MOON_PHASES = ['New Moon', 'First Quarter', 'Full Moon', 'Last Quarter'];

// mean synodic month & the JDE of the new moon of Jan 6, 2000 (k = 0)
var SYNODIC_MONTH = 29.530588861;
var NEW_MOON_EPOCH_JDE = 2451550.09766;

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

    jde += c;

    // JDE is in Terrestrial Time; convert to UT
    var approxYear = 2000 + (k / 12.3685);
    return jdToDate(jde - (deltaTSeconds(approxYear) / 86400));
}

// builds moon phase entries in the same shape as the USNO data
// ({day, month, phenom, time, year} in UTC, rounded to the minute),
// covering a few lunations either side of the given date
function calcMoonPhaseData(aroundDate) {
    var kNow = Math.floor((dateToJD(aroundDate) - NEW_MOON_EPOCH_JDE) / SYNODIC_MONTH);
    var data = [];

    for(var k = kNow - 2; k <= kNow + 2; k++) {
        for(var p = 0; p < 4; p++) {
            var date = new Date(Math.round(calcMoonPhase(k, p).getTime() / 60000) * 60000);
            data.push({
                day: date.getUTCDate(),
                month: date.getUTCMonth() + 1,
                phenom: MOON_PHASES[p],
                time: ('0' + date.getUTCHours()).slice(-2) + ':' + ('0' + date.getUTCMinutes()).slice(-2),
                year: date.getUTCFullYear()
            });
        }
    }

    return data;
}
