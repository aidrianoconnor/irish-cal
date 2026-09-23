// calendar cycle definitions
// the event data for each cycle is calculated in the browser at startup by appInit:
//   seasonsData.data       - calcSeasonData (seasons.js)
//   fireFestivalsData.data - calcFireFestivalData (seasons.js)
//   moonData.data          - calcMoonPhaseData (moon.js)

var seasonsData = {
    data: [],
    cycleLengths: [1,4],
    cycleStartPhenom: "Winter Solstice",
    cycleLables: ['WINTER SOLSTICE','SPRING EQUINOX','SUMMER SOLSTICE','FALL EQUINOX'],
    cycleLblCMS: ['solar','solar','solar','solar']
};

var fireFestivalsData = {
    data: [],
    cycleLengths: [1,4],
    cycleStartPhenom: "Samhain",
    cycleLables: ['SAMHAIN','IMBOLC','BEALTAINE','LÚNASA'],
    cycleLblCMS: ['fireFestivals,samhain','fireFestivals,imbolc','fireFestivals,bealtaine','fireFestivals,lunasa']
};

var moonData = {
    data: [],
    cycleLengths: [1,4],
    cycleStartPhenom: "New Moon",
    cycleLables: ['NEW MOON','FIRST QUARTER','FULL MOON','LAST QUARTER'],
    cycleLblCMS: ['lunar','lunar','lunar','lunar']
};