// solstice / equinox and fire festival calculations, replacing the manually pasted USNO data
// solstice / equinox algorithm from Jean Meeus, "Astronomical Algorithms" (2nd ed.), chapter 27
// accurate to within a minute or so of the USNO data for the 21st century

// in calendar order through the year: March, June, September, December
var SOLAR_EVENTS = ['Spring Equinox', 'Summer Solstice', 'Fall Equinox', 'Winter Solstice'];

// mean event times, as polynomials in Y = (year - 2000) / 1000 (valid for years 1000 - 3000)
var SOLAR_EVENT_TERMS = [
    [2451623.80984, 365242.37404, 0.05169, -0.00411, -0.00057],
    [2451716.56767, 365241.62603, 0.00325, 0.00888, -0.00030],
    [2451810.21715, 365242.01767, -0.11575, 0.00337, 0.00078],
    [2451900.05952, 365242.74049, -0.06223, -0.00823, 0.00032]
];

// periodic terms [A, B, C] for the correction S = sum(A * cos(B + C*T))
var SOLAR_PERIODIC_TERMS = [
    [485, 324.96, 1934.136], [203, 337.23, 32964.467], [199, 342.08, 20.186], [182, 27.85, 445267.112],
    [156, 73.14, 45036.886], [136, 171.52, 22518.443], [77, 222.54, 65928.934], [74, 296.72, 3034.906],
    [70, 243.58, 9037.513], [58, 119.81, 33718.147], [52, 297.17, 150.678], [50, 21.02, 2281.232],
    [45, 247.54, 29929.562], [44, 325.15, 31555.956], [29, 60.93, 4443.417], [18, 155.12, 67555.328],
    [17, 288.79, 4562.452], [16, 198.04, 62894.029], [14, 199.76, 31436.921], [12, 95.39, 14577.848],
    [12, 287.11, 31931.756], [12, 320.81, 34777.259], [9, 227.73, 1222.114], [8, 15.45, 16859.074]
];

// the fire festivals, as observed on the first day of their month
var FIRE_FESTIVALS = [
    { phenom: 'Imbolc', month: 2 },
    { phenom: 'Bealtaine', month: 5 },
    { phenom: 'Lúnasa', month: 8 },
    { phenom: 'Samhain', month: 11 }
];

// eventIndex: 0 = spring equinox, 1 = summer solstice, 2 = fall equinox, 3 = winter solstice
// returns the moment of that event in the given year as a Date (UTC)
function calcSolarEvent(year, eventIndex) {
    var Y = (year - 2000) / 1000;
    var terms = SOLAR_EVENT_TERMS[eventIndex];
    var jde0 = terms[0] + (terms[1] * Y) + (terms[2] * Y * Y) + (terms[3] * Y * Y * Y) + (terms[4] * Y * Y * Y * Y);

    var T = (jde0 - 2451545.0) / 36525;
    var W = (35999.373 * T) - 2.47;
    var dL = 1 + (0.0334 * degCos(W)) + (0.0007 * degCos(2 * W));

    var S = 0;
    for(var i = 0; i < SOLAR_PERIODIC_TERMS.length; i++) {
        var t = SOLAR_PERIODIC_TERMS[i];
        S += t[0] * degCos(t[1] + (t[2] * T));
    }

    return jdeToDate(jde0 + ((0.00001 * S) / dL));
}

// builds solstice / equinox entries for the year before, of, and after the given date
function calcSeasonData(aroundDate) {
    var year = aroundDate.getUTCFullYear();
    var data = [];

    for(var y = year - 1; y <= year + 1; y++) {
        for(var e = 0; e < 4; e++) {
            data.push(makeDataObjFromDate(calcSolarEvent(y, e), SOLAR_EVENTS[e]));
        }
    }

    return data;
}

// builds fire festival entries for the year before, of, and after the given date
function calcFireFestivalData(aroundDate) {
    var year = aroundDate.getUTCFullYear();
    var data = [];

    for(var y = year - 1; y <= year + 1; y++) {
        for(var f = 0; f < FIRE_FESTIVALS.length; f++) {
            data.push(makeDataObjFromDate(new Date(Date.UTC(y, FIRE_FESTIVALS[f].month - 1, 1)), FIRE_FESTIVALS[f].phenom));
        }
    }

    return data;
}
