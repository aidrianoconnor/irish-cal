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
    }],
    cycleLengths: [1,4],
    cycleStartPhenom: "Samhain",
    cycleLables: ['SAMHAIN','IMBOLC','BEALTAINE','LÚNASA'],
    cycleLblCMS: ['fireFestivals,samhain','fireFestivals,imbolc','fireFestivals,bealtaine','fireFestivals,lunasa']
  };

// https://aa.usno.navy.mil/api/moon/phases/date?ID=irishcal&date=2023-7-13&nump=48
// be sure to replace "phase" property name with "phenom"
var moonData = {

    data: [
    {
      "day": 6,
      "month": 1,
      "phenom": "Full Moon",
      "time": "23:08",
      "year": 2023
    },
    {
      "day": 15,
      "month": 1,
      "phenom": "Last Quarter",
      "time": "02:10",
      "year": 2023
    },
    {
      "day": 21,
      "month": 1,
      "phenom": "New Moon",
      "time": "20:53",
      "year": 2023
    },
    {
      "day": 28,
      "month": 1,
      "phenom": "First Quarter",
      "time": "15:19",
      "year": 2023
    },
    {
      "day": 5,
      "month": 2,
      "phenom": "Full Moon",
      "time": "18:28",
      "year": 2023
    },
    {
      "day": 13,
      "month": 2,
      "phenom": "Last Quarter",
      "time": "16:01",
      "year": 2023
    },
    {
      "day": 20,
      "month": 2,
      "phenom": "New Moon",
      "time": "07:06",
      "year": 2023
    },
    {
      "day": 27,
      "month": 2,
      "phenom": "First Quarter",
      "time": "08:06",
      "year": 2023
    },
    {
      "day": 7,
      "month": 3,
      "phenom": "Full Moon",
      "time": "12:40",
      "year": 2023
    },
    {
      "day": 15,
      "month": 3,
      "phenom": "Last Quarter",
      "time": "02:08",
      "year": 2023
    },
    {
      "day": 21,
      "month": 3,
      "phenom": "New Moon",
      "time": "17:23",
      "year": 2023
    },
    {
      "day": 29,
      "month": 3,
      "phenom": "First Quarter",
      "time": "02:32",
      "year": 2023
    },
    {
      "day": 6,
      "month": 4,
      "phenom": "Full Moon",
      "time": "04:34",
      "year": 2023
    },
    {
      "day": 13,
      "month": 4,
      "phenom": "Last Quarter",
      "time": "09:11",
      "year": 2023
    },
    {
      "day": 20,
      "month": 4,
      "phenom": "New Moon",
      "time": "04:12",
      "year": 2023
    },
    {
      "day": 27,
      "month": 4,
      "phenom": "First Quarter",
      "time": "21:20",
      "year": 2023
    },
    {
      "day": 5,
      "month": 5,
      "phenom": "Full Moon",
      "time": "17:34",
      "year": 2023
    },
    {
      "day": 12,
      "month": 5,
      "phenom": "Last Quarter",
      "time": "14:28",
      "year": 2023
    },
    {
      "day": 19,
      "month": 5,
      "phenom": "New Moon",
      "time": "15:53",
      "year": 2023
    },
    {
      "day": 27,
      "month": 5,
      "phenom": "First Quarter",
      "time": "15:22",
      "year": 2023
    },
    {
      "day": 4,
      "month": 6,
      "phenom": "Full Moon",
      "time": "03:42",
      "year": 2023
    },
    {
      "day": 10,
      "month": 6,
      "phenom": "Last Quarter",
      "time": "19:31",
      "year": 2023
    },
    {
      "day": 18,
      "month": 6,
      "phenom": "New Moon",
      "time": "04:37",
      "year": 2023
    },
    {
      "day": 26,
      "month": 6,
      "phenom": "First Quarter",
      "time": "07:50",
      "year": 2023
    },
    {
      "day": 3,
      "month": 7,
      "phenom": "Full Moon",
      "time": "11:39",
      "year": 2023
    },
    {
      "day": 10,
      "month": 7,
      "phenom": "Last Quarter",
      "time": "01:48",
      "year": 2023
    },
    {
      "day": 17,
      "month": 7,
      "phenom": "New Moon",
      "time": "18:32",
      "year": 2023
    },
    {
      "day": 25,
      "month": 7,
      "phenom": "First Quarter",
      "time": "22:07",
      "year": 2023
    },
    {
      "day": 1,
      "month": 8,
      "phenom": "Full Moon",
      "time": "18:32",
      "year": 2023
    },
    {
      "day": 8,
      "month": 8,
      "phenom": "Last Quarter",
      "time": "10:28",
      "year": 2023
    },
    {
      "day": 16,
      "month": 8,
      "phenom": "New Moon",
      "time": "09:38",
      "year": 2023
    },
    {
      "day": 24,
      "month": 8,
      "phenom": "First Quarter",
      "time": "09:57",
      "year": 2023
    },
    {
      "day": 31,
      "month": 8,
      "phenom": "Full Moon",
      "time": "01:35",
      "year": 2023
    },
    {
      "day": 6,
      "month": 9,
      "phenom": "Last Quarter",
      "time": "22:21",
      "year": 2023
    },
    {
      "day": 15,
      "month": 9,
      "phenom": "New Moon",
      "time": "01:40",
      "year": 2023
    },
    {
      "day": 22,
      "month": 9,
      "phenom": "First Quarter",
      "time": "19:32",
      "year": 2023
    },
    {
      "day": 29,
      "month": 9,
      "phenom": "Full Moon",
      "time": "09:57",
      "year": 2023
    },
    {
      "day": 6,
      "month": 10,
      "phenom": "Last Quarter",
      "time": "13:48",
      "year": 2023
    },
    {
      "day": 14,
      "month": 10,
      "phenom": "New Moon",
      "time": "17:55",
      "year": 2023
    },
    {
      "day": 22,
      "month": 10,
      "phenom": "First Quarter",
      "time": "03:29",
      "year": 2023
    },
    {
      "day": 28,
      "month": 10,
      "phenom": "Full Moon",
      "time": "20:24",
      "year": 2023
    },
    {
      "day": 5,
      "month": 11,
      "phenom": "Last Quarter",
      "time": "08:37",
      "year": 2023
    },
    {
      "day": 13,
      "month": 11,
      "phenom": "New Moon",
      "time": "09:27",
      "year": 2023
    },
    {
      "day": 20,
      "month": 11,
      "phenom": "First Quarter",
      "time": "10:50",
      "year": 2023
    },
    {
      "day": 27,
      "month": 11,
      "phenom": "Full Moon",
      "time": "09:16",
      "year": 2023
    },
    {
      "day": 5,
      "month": 12,
      "phenom": "Last Quarter",
      "time": "05:49",
      "year": 2023
    },
    {
      "day": 12,
      "month": 12,
      "phenom": "New Moon",
      "time": "23:32",
      "year": 2023
    },
    {
      "day": 19,
      "month": 12,
      "phenom": "First Quarter",
      "time": "18:39",
      "year": 2023
    },
    {
      "day": 27,
      "month": 12,
      "phenom": "Full Moon",
      "time": "00:33",
      "year": 2023
    },
    {
      "day": 4,
      "month": 1,
      "phenom": "Last Quarter",
      "time": "03:30",
      "year": 2024
    },
    {
      "day": 11,
      "month": 1,
      "phenom": "New Moon",
      "time": "11:57",
      "year": 2024
    },
    {
      "day": 18,
      "month": 1,
      "phenom": "First Quarter",
      "time": "03:52",
      "year": 2024
    },
    {
      "day": 25,
      "month": 1,
      "phenom": "Full Moon",
      "time": "17:54",
      "year": 2024
    },
    {
      "day": 2,
      "month": 2,
      "phenom": "Last Quarter",
      "time": "23:18",
      "year": 2024
    },
    {
      "day": 9,
      "month": 2,
      "phenom": "New Moon",
      "time": "22:59",
      "year": 2024
    },
    {
      "day": 16,
      "month": 2,
      "phenom": "First Quarter",
      "time": "15:01",
      "year": 2024
    },
    {
      "day": 24,
      "month": 2,
      "phenom": "Full Moon",
      "time": "12:30",
      "year": 2024
    },
    {
      "day": 3,
      "month": 3,
      "phenom": "Last Quarter",
      "time": "15:23",
      "year": 2024
    },
    {
      "day": 10,
      "month": 3,
      "phenom": "New Moon",
      "time": "09:00",
      "year": 2024
    },
    {
      "day": 17,
      "month": 3,
      "phenom": "First Quarter",
      "time": "04:11",
      "year": 2024
    },
    {
      "day": 25,
      "month": 3,
      "phenom": "Full Moon",
      "time": "07:00",
      "year": 2024
    },
    {
      "day": 2,
      "month": 4,
      "phenom": "Last Quarter",
      "time": "03:15",
      "year": 2024
    },
    {
      "day": 8,
      "month": 4,
      "phenom": "New Moon",
      "time": "18:21",
      "year": 2024
    },
    {
      "day": 15,
      "month": 4,
      "phenom": "First Quarter",
      "time": "19:13",
      "year": 2024
    },
    {
      "day": 23,
      "month": 4,
      "phenom": "Full Moon",
      "time": "23:49",
      "year": 2024
    },
    {
      "day": 1,
      "month": 5,
      "phenom": "Last Quarter",
      "time": "11:27",
      "year": 2024
    },
    {
      "day": 8,
      "month": 5,
      "phenom": "New Moon",
      "time": "03:22",
      "year": 2024
    },
    {
      "day": 15,
      "month": 5,
      "phenom": "First Quarter",
      "time": "11:48",
      "year": 2024
    },
    {
      "day": 23,
      "month": 5,
      "phenom": "Full Moon",
      "time": "13:53",
      "year": 2024
    },
    {
      "day": 30,
      "month": 5,
      "phenom": "Last Quarter",
      "time": "17:13",
      "year": 2024
    },
    {
      "day": 6,
      "month": 6,
      "phenom": "New Moon",
      "time": "12:38",
      "year": 2024
    },
    {
      "day": 14,
      "month": 6,
      "phenom": "First Quarter",
      "time": "05:18",
      "year": 2024
    },
    {
      "day": 22,
      "month": 6,
      "phenom": "Full Moon",
      "time": "01:08",
      "year": 2024
    },
    {
      "day": 28,
      "month": 6,
      "phenom": "Last Quarter",
      "time": "21:53",
      "year": 2024
    },
    {
      "day": 5,
      "month": 7,
      "phenom": "New Moon",
      "time": "22:57",
      "year": 2024
    },
    {
      "day": 13,
      "month": 7,
      "phenom": "First Quarter",
      "time": "22:49",
      "year": 2024
    },
    {
      "day": 21,
      "month": 7,
      "phenom": "Full Moon",
      "time": "10:17",
      "year": 2024
    },
    {
      "day": 28,
      "month": 7,
      "phenom": "Last Quarter",
      "time": "02:51",
      "year": 2024
    },
    {
      "day": 4,
      "month": 8,
      "phenom": "New Moon",
      "time": "11:13",
      "year": 2024
    },
    {
      "day": 12,
      "month": 8,
      "phenom": "First Quarter",
      "time": "15:19",
      "year": 2024
    },
    {
      "day": 19,
      "month": 8,
      "phenom": "Full Moon",
      "time": "18:26",
      "year": 2024
    },
    {
      "day": 26,
      "month": 8,
      "phenom": "Last Quarter",
      "time": "09:26",
      "year": 2024
    },
    {
      "day": 3,
      "month": 9,
      "phenom": "New Moon",
      "time": "01:55",
      "year": 2024
    },
    {
      "day": 11,
      "month": 9,
      "phenom": "First Quarter",
      "time": "06:05",
      "year": 2024
    },
    {
      "day": 18,
      "month": 9,
      "phenom": "Full Moon",
      "time": "02:34",
      "year": 2024
    },
    {
      "day": 24,
      "month": 9,
      "phenom": "Last Quarter",
      "time": "18:50",
      "year": 2024
    },
    {
      "day": 2,
      "month": 10,
      "phenom": "New Moon",
      "time": "18:49",
      "year": 2024
    },
    {
      "day": 10,
      "month": 10,
      "phenom": "First Quarter",
      "time": "18:55",
      "year": 2024
    },
    {
      "day": 17,
      "month": 10,
      "phenom": "Full Moon",
      "time": "11:26",
      "year": 2024
    },
    {
      "day": 24,
      "month": 10,
      "phenom": "Last Quarter",
      "time": "08:03",
      "year": 2024
    },
    {
      "day": 1,
      "month": 11,
      "phenom": "New Moon",
      "time": "12:47",
      "year": 2024
    },
    {
      "day": 9,
      "month": 11,
      "phenom": "First Quarter",
      "time": "05:55",
      "year": 2024
    },
    {
      "day": 15,
      "month": 11,
      "phenom": "Full Moon",
      "time": "21:28",
      "year": 2024
    },
    {
      "day": 23,
      "month": 11,
      "phenom": "Last Quarter",
      "time": "01:28",
      "year": 2024
    },
    {
      "day": 1,
      "month": 12,
      "phenom": "New Moon",
      "time": "06:21",
      "year": 2024
    },
    {
      "day": 8,
      "month": 12,
      "phenom": "First Quarter",
      "time": "15:26",
      "year": 2024
    },
    {
      "day": 15,
      "month": 12,
      "phenom": "Full Moon",
      "time": "09:02",
      "year": 2024
    },
    {
      "day": 22,
      "month": 12,
      "phenom": "Last Quarter",
      "time": "22:18",
      "year": 2024
    },
    {
      "day": 30,
      "month": 12,
      "phenom": "New Moon",
      "time": "22:27",
      "year": 2024
    },
    {
      "day": 6,
      "month": 1,
      "phenom": "First Quarter",
      "time": "23:56",
      "year": 2025
    },
    {
      "day": 13,
      "month": 1,
      "phenom": "Full Moon",
      "time": "22:27",
      "year": 2025
    },
    {
      "day": 21,
      "month": 1,
      "phenom": "Last Quarter",
      "time": "20:31",
      "year": 2025
    },
    {
      "day": 29,
      "month": 1,
      "phenom": "New Moon",
      "time": "12:36",
      "year": 2025
    },
    {
      "day": 5,
      "month": 2,
      "phenom": "First Quarter",
      "time": "08:02",
      "year": 2025
    },
    {
      "day": 12,
      "month": 2,
      "phenom": "Full Moon",
      "time": "13:53",
      "year": 2025
    },
    {
      "day": 20,
      "month": 2,
      "phenom": "Last Quarter",
      "time": "17:32",
      "year": 2025
    },
    {
      "day": 28,
      "month": 2,
      "phenom": "New Moon",
      "time": "00:45",
      "year": 2025
    },
    {
      "day": 6,
      "month": 3,
      "phenom": "First Quarter",
      "time": "16:31",
      "year": 2025
    },
    {
      "day": 14,
      "month": 3,
      "phenom": "Full Moon",
      "time": "06:55",
      "year": 2025
    },
    {
      "day": 22,
      "month": 3,
      "phenom": "Last Quarter",
      "time": "11:29",
      "year": 2025
    },
    {
      "day": 29,
      "month": 3,
      "phenom": "New Moon",
      "time": "10:58",
      "year": 2025
    }],
    cycleLengths: [1,4],
    cycleStartPhenom: "New Moon",
    cycleLables: ['NEW MOON','FIRST QUARTER','FULL MOON','LAST QUARTER'],
    cycleLblCMS: ['lunar','lunar','lunar','lunar']
};