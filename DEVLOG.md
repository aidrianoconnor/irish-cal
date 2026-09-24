# DEVLOG

a running account of our working sessions: what we did, the decisions made along the way, and any problems hit
(with what fixed them), so we don't repeat the same mistakes. newest sessions at the bottom. times are local (EDT, UTC-4)

---

## 2026-09-23 · ~16:00 - 21:40 · calculated data, and the new 3D viewer

### what we did

| time | commit | action |
|---|---|---|
| ~16:00 | | reviewed the existing app (index.html + js/); cloned github.com/aidrianoconnor/irish-cal into `website-v1/_gitroot` |
| 16:12 | `c0c4497` | (main) copied the newer local `data.js` into the repo; the repo's data had run out in 2025, so the committed version was already broken |
| 16:24 | `0a20156` | (feature/001-v2_rework) moon phases calculated in the browser (`js/moon.js`) instead of hand-pasted USNO data |
| 16:43 | `ccdf720` | solstices, equinoxes and fire festivals calculated in the browser (`js/seasons.js`); shared helpers in `js/astro.js`; `data.js` is now just the cycle definitions |
| 16:59 | `18093c0` | (feature/002-3d_viewer) new `viewer.html` / `js/viewer.js`: Three.js scene, flat circular plain, eight direction columns with labels, turning with the arrow keys; Three.js r186 copied into `js/lib/three` |
| 17:42 | `d4f2f8d` | walking forward / back, free look (right mouse button, touch drag), on-screen direction pad with a reset (centre, facing south), first sky dome |
| 17:47 | `949e99e` | sky dome coloured by a shader from the sun's position (day / twilight / night), with the lights following the sun |
| 18:27 | `25e23f5` | sun positioned from the observer's latitude / longitude / date / time (`js/sun.js`) |
| 18:37 | `ed54694` | moon at its calculated position (parallax + refraction) |
| 18:49 | `98b10af` | moon phase: a ball lit from the sun's direction, with a faint glow on the shadowed side; phase name and % lit in the panel |
| 19:58 | `fe84f69` | sun arcs for midsummer, midwinter and today, with sunrise / sunset markers on the horizon; added `TODO.md` |
| 20:46 | `8cab0b8` | fire festival (+/-16.3 deg) and equinox arcs, with markers in three label rows |
| 21:19 | `be3ec2a` | moon arcs: tonight's traced path and the major / minor standstill limits, with markers; Sun / Moon toggles; new TODO items (Google Maps pin, remembered location, stars, seasonal terrain, standing stone rings) |
| 21:35 | `7cb14c1` | sunrise / sunset and moonrise / moonset times in the observer panel |

also along the way: explained the major / minor lunar standstills; added "next standstill" dates to the
standstill labels on a second line, then reverted that at your request (`calcNextStandstill` in `moon.js` was
kept, currently unused)

### decisions

- **branches**: `main` only got the data update. the calculation work is on `feature/001-v2_rework`, and
  `feature/002-3d_viewer` was branched from it (so it includes that work). all pushed; neither merged yet
- **calculate rather than paste data**: all sun / moon / season events are worked out in the browser from Jean
  Meeus' *Astronomical Algorithms*, and every calculation was checked against the US Navy (USNO) data / API
  before being wired in (see "validation" below)
- **Three.js is kept locally** (`js/lib/three`, r186, plus the lines add-on), so the viewer works offline;
  the CDN import map is left commented out in `viewer.html` for switching back
- **observer time is UTC** for now (a local time option is on the TODO list); default location is Newgrange;
  the view starts (and resets to) the centre, facing south
- **scene orientation**: north is -Z, east +X, up +Y; azimuths clockwise from north
- **controls**: the mouse turns the way it moves (right button held); a finger drags the scene (like Street View)
- **the sky's colours come from the sun's position** (a shader), not a gradient on a rotating dome; the dome
  can still be rotated later (e.g. for stars) without moving the daylight
- **moon**: drawn 6x its real size; its shadowed side glows faintly so even a new moon can just be seen
- **arcs are drawn in the sky shader** as circles of constant declination (constant pixel width, always behind
  the sun and moon), with refraction (and for the moon, parallax) taken out so they meet the horizon where
  things appear to rise and set. today's sun arc is brighter where the sun has still to travel
- **fire festivals are the solar midpoints** between the solstices and equinoxes (~3-7 Feb, May, Aug, Nov;
  +/-16.3 deg), not the 1st of the month, giving two clean arcs
- **the moon's path tonight is traced** from its positions (its declination shifts several degrees in a
  night), drawn with the Three.js "fat lines" add-on
- **arc toggles** are remembered in local storage rather than a cookie (nothing needs sending to a server)
- **rise / set times** use the almanac definitions (upper edge on the horizon), for the observer's local solar
  day, shown in UTC in a 12-hour style
- **hour marks / solar noon marker** on today's arc: parked under "maybe later" in `TODO.md`

### validation (against USNO)

| what | result |
|---|---|
| moon phases 2023-2027 (218) | all within 1 minute |
| solstices / equinoxes (25), fire festivals (29) | within 1 minute / exact |
| sun position, 12 dates / places | within 0.01 deg |
| moon position, 21 cases | within 0.011 deg; parallax within ~0.01 deg |
| moon illumination | Meeus' worked example to 0.001; phase instants 2024-2029 to 0.01 deg |
| arcs / horizon markers | the sun stays on today's arc to 0.08 deg; markers match sunrise / sunset azimuths to 0.2 deg |
| rise / set times, 32 days, 4 places | every sunrise / sunset / moonrise / moonset within 1 minute; same days with a missing moonrise / moonset |

the validation scripts lived in the session's scratchpad, not the repo; recreate them (they're short) when changing
any calculation

### problems hit, and lessons

- **the repo was behind the live site**: the committed `data.js` had run out in 2025. check what's deployed matches
  what's committed
- **git author**: this machine's git `user.name` is `miscon02`, not "Aidrian O'Connor" (same email, so GitHub still
  links it); `git config --global user.name "Aidrian O'Connor"` would fix future commits
- **ES modules don't run from `file://`**: `viewer.html` must be served (index.html is fine either way). the preview
  server was stopped by the app at one point; the offline start script on the TODO list would avoid relying on it
- **import maps are JSON**, which has no comments: to "comment out" the CDN version, the whole `<script type="importmap">`
  block is wrapped in an HTML comment, and only one import map can be active
- **Three.js r186 has no minified build**, and `three.module.js` needs `three.core.js` alongside it
- **a hidden browser preview pane throttles or stops rendering**, which made animations look slow and renders stale.
  taking a screenshot forces a frame; renders were captured by reading the canvas in a `requestAnimationFrame` callback
  and uploading it to the local preview server
- **a fixed gradient on a rotating dome can't work**: turning it over leaves the horizon the same colour by day and night
- **a triangulated sphere leaks light round its outline** when lit from behind (near new moon): the moon is now a disc
  facing the observer with the sphere's surface worked out per pixel
- **Three.js ShaderMaterial**: `modelMatrix` isn't available in fragment shaders (pass what's needed through a varying);
  `flat` is a reserved word in GLSL ES 3.0; a failed shader just logs "program not valid", so compile a shader by hand
  to see the real error
- **moon phase age must use ecliptic longitude**, not the sun-moon angle (that was off by up to 5 deg at the phase moments)
- **text outlines on canvas** need `lineJoin = 'round'`, or sharp corners spike out of letters like M and W
- **transparent sprites write depth by default**, so a label's empty background hid lines behind it: sky labels use
  `depthWrite: false`
- **CSS specificity**: `#controls button` overrode `#reset`'s font size (fixed with `#controls #reset`)
- **`setPointerCapture` can throw** (e.g. for simulated pointers): set the control's state before calling it
- **the USNO API** leaves out bodies below the horizon, sometimes returns numbers as strings, and drops connections if
  asked too quickly (retry with a pause)
- **short Google Maps links** (`maps.app.goo.gl/...`) can't be followed from a web page, which matters for the planned
  "paste a pin URL" feature
- **reverting uncommitted work**: undoing one change by hand was needed because other work since the last commit would
  have been lost with a git checkout. committing each finished step keeps reverts simple

### where things stand

- viewer: sky, sun, moon (with phase), sun arcs (solstices, fire festivals, equinoxes, today), moon arcs (tonight's path,
  standstills), horizon markers, toggles, rise / set times
- next on `TODO.md`: set the location from a Google Maps pin, remember the last location, stars, seasonal terrain,
  standing stone rings (then the smaller items: moon texture, eclipses, dimming labels at night, local time, start script)

---

## 2026-09-24 · ~08:05 - · setting the location from Google Maps

### what we did

| time | commit | action |
|---|---|---|
| ~08:05 | | reviewed `DEVLOG.md` and `TODO.md` to pick up from the last session |
| 08:30 | `ac6f1b7` | (feature/002-3d_viewer) "how to get your lat / long easily" dialog: paste coordinates or a Google Maps link to set the location (`js/location.js`); the last location is remembered in local storage, with "Back to Newgrange" to return to the default |
| 08:33 | | pushed `ac6f1b7` and the DEVLOG commit; paused |
| 08:43 | `807c91a` | time zone dropdown beside the observer's time (fixed UTC offsets, remembered); changing it converts the date / time so the moment stays the same; rise / set times follow it; "Time (UTC)" is now just "Time" |
| 09:00 | *(next commit)* | "Auto" time zone, worked out from the lat / long with `@photostructure/tz-lookup` 11.7.0 (downloaded from npm, CC0, into `js/lib/tz-lookup`), with summer time from the browser's own time zone rules; the default |

### decisions

- **the dialog takes coordinates as well as links**: right-clicking a spot in Google Maps (on a computer) shows its
  coordinates to copy, which is easier than finding the right link, and on a phone the Share button only gives a
  short link that can't be read. both decimal (`53.6947, -6.4755`) and degrees / minutes / seconds
  (`53°41'40.9"N 6°28'31.8"W`) are read
- **which coordinates in a link win**: the pin itself (`!3d...!4d...`), then a searched / pinned place (`?q=`,
  `?query=`, `?ll=`, `/place/...`, `/search/...`, `/dir/...`), and only then the centre of the map view (`@...`),
  which can be some way from the pin
- **short links (`maps.app.goo.gl`, `goo.gl/maps`)** are recognised just to explain they can't be read, and to copy
  the full link or the coordinates instead
- **the parser is a plain script** (`js/location.js`, like `sun.js`) so it can be tested in node without a browser
- **only the latitude / longitude are remembered**: the date and time always start at now. the location is saved
  whenever valid lat / long are read, so typing them by hand is remembered too
- the dialog is a native `<dialog>` (Escape, focus and the dimmed backdrop come free); the "Google Maps" link in it
  opens the map where the observer already is; arrow keys don't move the view while it's open
- **working out the time zone from the lat / long** is possible (an online service, which needs a key and sends the
  location to a third party, or an offline boundary lookup like `tz-lookup`), but for now the zone is picked by hand;
  the offline lookup is on the TODO list. a guess from the longitude (15 deg an hour) is often wrong (e.g. Spain)
- **the time zones are fixed UTC offsets** (all 38 in use, including the half and quarter hours), not named zones,
  so there's no summer time: Ireland in summer is UTC+1. the default is UTC, and the choice is remembered
- **changing the time zone keeps the moment the same**: the date and time fields are re-written in the new zone
  (12:00pm UTC becomes 7:00am in UTC-5, and the date rolls over where needed); the observer's state stays in UTC
- the sunrise / moonrise times are shown in the chosen zone, still for the observer's local solar day
- **the time zone lookup is `@photostructure/tz-lookup`**, the maintained fork of `tz-lookup` (abandoned in 2020):
  one 73 KB script with no network use, kept in `js/lib/tz-lookup` so the viewer still works offline. it trades
  accuracy for size (its README: ~5% of inhabited places get a zone with a different offset, mostly near borders),
  so the fixed offsets stay in the dropdown to override it
- **"Auto" is the first choice and the default**, shown as e.g. "Auto (UTC+1)", with a note under the time naming
  the zone ("Europe/Dublin time, from the location"; "At sea: nautical time" for the open ocean). a fixed offset
  picked by hand is remembered and not changed by moving
- **in Auto, moving into another zone keeps the moment** (the date / time are re-written in the new zone), while
  **changing the date keeps the time typed**, with the offset following the date (12:00 in July in Ireland is
  UTC+1, in December UTC), like a real clock
- offsets for a named zone come from `Intl.DateTimeFormat` (no time zone data of our own); if the browser doesn't
  know a zone, it falls back to nautical time from the longitude
- at the clock changes: a time that doesn't exist (e.g. 01:30 on the spring change in Ireland) reads as the
  hour after, and one that happens twice (01:30 on the autumn change) as the second, winter time one

### validation

| what | result |
|---|---|
| `parseMapsLocation`, 29 cases (pin, place, search, directions, `?q=` / `?query=` links; decimal and DMS text; short links, missing / out-of-range coordinates) | all pass |
| in the browser | pasting a Stonehenge pin link moved the observer (sunrise 5:56 UTC, as expected), survived a reload; Escape, Cancel, backdrop, Back to Newgrange, arrow keys blocked while open; phone-width layout |
| time zones | 12:00 UTC -> 7:00 in UTC-5 with the sun unmoved; UTC+5:30, UTC-12 and UTC+14 (date rolls over); rise / set times shift with the zone; remembered after a reload; fits the panel at phone width |
| tz-lookup, 20 places | right for all but Lifford (a Donegal border town, given Europe/London, which has the same offset); includes Belfast / Derry / Strabane, Carnac, Callanish, Phoenix (no summer time), Kathmandu, Chatham, Kiritimati, mid-Atlantic |
| Auto in the browser | Newgrange UTC in December / UTC+1 in July; moving to New York, Kathmandu (+5:45), Chatham (+12:45), mid-Atlantic (-2, "at sea") keeps the moment; manual choice kept when moving; both clock changes; phone width with "Auto (UTC+12:45)" |

the test script is in this session's scratchpad (`test_location.js`), not the repo

### problems hit, and lessons

- **no python on this machine** (the Windows "python" is just a Microsoft Store shortcut): use node or the editor
  for scripted edits
- **a regular expression inside a JavaScript template string loses its backslashes** (`/^Etc\//` became
  `/^Etc//`, a syntax error): an edit script written with template strings broke the page. check the result
  with `node --input-type=module --check < js/viewer.js` after a scripted edit
- bash heredocs with lots of quotes in them can fail to parse in this environment: write longer edit scripts to a
  file in the scratchpad and run that
- a directions link can start `/dir//53.69,...` (an empty starting point), which the first version of the path
  pattern missed
