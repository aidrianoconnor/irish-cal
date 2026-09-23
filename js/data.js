// base data from: https://aa.usno.navy.mil/data/api

// using UTC / no day savings
// https://aa.usno.navy.mil/api/seasons?ID=irishcal&year=2024&tz=0.00&tz_sign=-1&tz_label=false&dst=false
// paste in data and delete Perihelion & Aphelion,then update phenom labels
var seasonsData = {
    data: [
    {
        "day": 21,
        "month": 12,
        "phenom": "Winter Solstice",
        "time": "21:48",
        "year": 2022
    },
    {
        "day": 20,
        "month": 3,
        "phenom": "Spring Equinox",
        "time": "21:24",
        "year": 2023
    },
    {
        "day": 21,
        "month": 6,
        "phenom": "Summer Solstice",
        "time": "14:58",
        "year": 2023
    },
    {
        "day": 23,
        "month": 9,
        "phenom": "Fall Equinox",
        "time": "06:50",
        "year": 2023
    },
    {
        "day": 22,
        "month": 12,
        "phenom": "Winter Solstice",
        "time": "03:27",
        "year": 2023
    },
    {
      "day": 20,
      "month": 3,
      "phenom": "Spring Equinox",
      "time": "03:06",
      "year": 2024
    },
    {
      "day": 20,
      "month": 6,
      "phenom": "Summer Solstice",
      "time": "20:51",
      "year": 2024
    },
    {
      "day": 22,
      "month": 9,
      "phenom": "Fall Equinox",
      "time": "12:44",
      "year": 2024
    },
    {
      "day": 21,
      "month": 12,
      "phenom": "Winter Solstice",
      "time": "09:20",
      "year": 2024
    },
    {
      "day": 20,
      "month": 3,
      "phenom": "Spring Equinox",
      "time": "09:01",
      "year": 2025
    },
    {
      "day": 21,
      "month": 6,
      "phenom": "Summer Solstice",
      "time": "02:42",
      "year": 2025
    },
    {
      "day": 22,
      "month": 9,
      "phenom": "Fall Equinox",
      "time": "18:19",
      "year": 2025
    },
    {
      "day": 21,
      "month": 12,
      "phenom": "Winter Solstice",
      "time": "15:03",
      "year": 2025
    },
    {
      "day": 20,
      "month": 3,
      "phenom": "Spring Equinox",
      "time": "14:46",
      "year": 2026
      },
      {
      "day": 21,
      "month": 6,
      "phenom": "Summer Solstice",
      "time": "08:24",
      "year": 2026
      },
      {
      "day": 23,
      "month": 9,
      "phenom": "Fall Equinox",
      "time": "00:05",
      "year": 2026
      },
      {
      "day": 21,
      "month": 12,
      "phenom": "Winter Solstice",
      "time": "20:50",
      "year": 2026
      },
      {
      "day": 20,
      "month": 3,
      "phenom": "Spring Equinox",
      "time": "20:25",
      "year": 2027
      },
      {
      "day": 21,
      "month": 6,
      "phenom": "Summer Solstice",
      "time": "14:11",
      "year": 2027
      },
      {
      "day": 23,
      "month": 9,
      "phenom": "Fall Equinox",
      "time": "06:02",
      "year": 2027
      },
      {
      "day": 22,
      "month": 12,
      "phenom": "Winter Solstice",
      "time": "02:42",
      "year": 2027
      },
      {
      "day": 20,
      "month": 3,
      "phenom": "Spring Equinox",
      "time": "02:17",
      "year": 2028
      },
      {
      "day": 20,
      "month": 6,
      "phenom": "Summer Solstice",
      "time": "20:02",
      "year": 2028
      },
      {
      "day": 22,
      "month": 9,
      "phenom": "Fall Equinox",
      "time": "11:45",
      "year": 2028
      },
      {
      "day": 21,
      "month": 12,
      "phenom": "Winter Solstice",
      "time": "08:19",
      "year": 2028
      }],
    cycleLengths: [1,4],
    cycleStartPhenom: "Winter Solstice",
    cycleLables: ['WINTER SOLSTICE','SPRING EQUINOX','SUMMER SOLSTICE','FALL EQUINOX'],
    cycleLblCMS: ['solar','solar','solar','solar']
};

// just copy current year data and update year value in new entries
var fireFestivalsData = {
    data: [
    {
        "day": 1,
        "month": 11,
        "phenom": "Samhain",
        "time": "00:00",
        "year": 2021
    },
    {
        "day": 1,
        "month": 2,
        "phenom": "Imbolc",
        "time": "00:00",
        "year": 2022
    },
    {
        "day": 1,
        "month": 5,
        "phenom": "Bealtaine",
        "time": "00:00",
        "year": 2022
    },
    {
        "day": 1,
        "month": 8,
        "phenom": "Lúnasa",
        "time": "00:00",
        "year": 2022
    },
    {
        "day": 1,
        "month": 11,
        "phenom": "Samhain",
        "time": "00:00",
        "year": 2022
    },
    {
        "day": 1,
        "month": 2,
        "phenom": "Imbolc",
        "time": "00:00",
        "year": 2023
    },
    {
        "day": 1,
        "month": 5,
        "phenom": "Bealtaine",
        "time": "00:00",
        "year": 2023
    },
    {
        "day": 1,
        "month": 8,
        "phenom": "Lúnasa",
        "time": "00:00",
        "year": 2023
    },
    {
        "day": 1,
        "month": 11,
        "phenom": "Samhain",
        "time": "00:00",
        "year": 2023
    },
    {
        "day": 1,
        "month": 2,
        "phenom": "Imbolc",
        "time": "00:00",
        "year": 2024
    },
    {
        "day": 1,
        "month": 5,
        "phenom": "Bealtaine",
        "time": "00:00",
        "year": 2024
    },
    {
        "day": 1,
        "month": 8,
        "phenom": "Lúnasa",
        "time": "00:00",
        "year": 2024
    },
    {
        "day": 1,
        "month": 11,
        "phenom": "Samhain",
        "time": "00:00",
        "year": 2024
    },
    {
      "day": 1,
      "month": 2,
      "phenom": "Imbolc",
      "time": "00:00",
      "year": 2025
    },
    {
      "day": 1,
      "month": 5,
      "phenom": "Bealtaine",
      "time": "00:00",
      "year": 2025
    },
    {
        "day": 1,
        "month": 8,
        "phenom": "Lúnasa",
        "time": "00:00",
        "year": 2025
    },
    {
        "day": 1,
        "month": 11,
        "phenom": "Samhain",
        "time": "00:00",
        "year": 2025
    },
    {
      "day": 1,
      "month": 2,
      "phenom": "Imbolc",
      "time": "00:00",
      "year": 2026
    },
    {
      "day": 1,
      "month": 5,
      "phenom": "Bealtaine",
      "time": "00:00",
      "year": 2026
    },
    {
        "day": 1,
        "month": 8,
        "phenom": "Lúnasa",
        "time": "00:00",
        "year": 2026
    },
    {
        "day": 1,
        "month": 11,
        "phenom": "Samhain",
        "time": "00:00",
        "year": 2026
    },
    {
      "day": 1,
      "month": 2,
      "phenom": "Imbolc",
      "time": "00:00",
      "year": 2027
    },
    {
      "day": 1,
      "month": 5,
      "phenom": "Bealtaine",
      "time": "00:00",
      "year": 2027
    },
    {
        "day": 1,
        "month": 8,
        "phenom": "Lúnasa",
        "time": "00:00",
        "year": 2027
    },
    {
        "day": 1,
        "month": 11,
        "phenom": "Samhain",
        "time": "00:00",
        "year": 2027
    },
    {
      "day": 1,
      "month": 2,
      "phenom": "Imbolc",
      "time": "00:00",
      "year": 2028
    },
    {
      "day": 1,
      "month": 5,
      "phenom": "Bealtaine",
      "time": "00:00",
      "year": 2028
    },
    {
        "day": 1,
        "month": 8,
        "phenom": "Lúnasa",
        "time": "00:00",
        "year": 2028
    },
    {
        "day": 1,
        "month": 11,
        "phenom": "Samhain",
        "time": "00:00",
        "year": 2028
    }],
    cycleLengths: [1,4],
    cycleStartPhenom: "Samhain",
    cycleLables: ['SAMHAIN','IMBOLC','BEALTAINE','LÚNASA'],
    cycleLblCMS: ['fireFestivals,samhain','fireFestivals,imbolc','fireFestivals,bealtaine','fireFestivals,lunasa']
  };

// moon phase data is calculated in the browser by moon.js (see calcMoonPhaseData),
// filled in at startup by appInit
var moonData = {
    data: [],
    cycleLengths: [1,4],
    cycleStartPhenom: "New Moon",
    cycleLables: ['NEW MOON','FIRST QUARTER','FULL MOON','LAST QUARTER'],
    cycleLblCMS: ['lunar','lunar','lunar','lunar']
};