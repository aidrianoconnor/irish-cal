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
| 08:31 | `ac6f1b7` | (feature/002-3d_viewer) "how to get your lat / long easily" dialog: paste coordinates or a Google Maps link to set the location (`js/location.js`); the last location is remembered in local storage, with "Back to Newgrange" to return to the default |
| 08:33 | | pushed `ac6f1b7` and the DEVLOG commit; paused |
| 08:43 | `807c91a` | time zone dropdown beside the observer's time (fixed UTC offsets, remembered); changing it converts the date / time so the moment stays the same; rise / set times follow it; "Time (UTC)" is now just "Time" |
| 08:53 | `ee457c6` | "Auto" time zone, worked out from the lat / long with `@photostructure/tz-lookup` 11.7.0 (downloaded from npm, CC0, into `js/lib/tz-lookup`), with summer time from the browser's own time zone rules; the default |
| 09:03 | `f7dbb0c` | a note under the paste field in the location dialog: on Auto, that the time zone will follow the new location and is worth checking; on a fixed offset, that it won't change |
| 09:10 | `73c969e` | a second line under the moon's phase: "Next Full: Sep 26 \| Next New: Oct 10", whichever comes first shown first, as dates in the chosen time zone (`calcNextMoonPhase` in `moon.js`; checked against USNO's Sep 26 / Oct 10 / Oct 26 2026 phases) |
| 09:18 | `c57c9df` | a small button at the upper right of the Observer and navigation panes to collapse them: the Observer up to its title, the navigation down to the heading (which still updates, and the arrow keys still work); remembered between visits |
| ~09:20 | | pushed `807c91a` - `c57c9df` |
| 09:35 | `5217dc8` | details for the horizon markers: hovering over (or tapping) a label shows a floating panel with the next date(s) of its event, the rise / set time that day and the bearing from true north (standstills: what they mark, last / next); `calcSunLongitudeMoment` in `sun.js` for the fire festival dates; `seasons.js` now loaded by the viewer |
| ~09:40 | | pushed `5217dc8`; talked through how to do the stars (real or fake, and the Milky Way) |
| 09:57 | `112f24b` | real stars: the Yale Bright Star Catalogue (5th revised ed., downloaded from CDS, catalogue V/50) trimmed to the 2,887 stars down to magnitude 5.5 (`js/stars.js`, 55 KB); `precessionMatrix` in `astro.js`; drawn as points turned by one rotation, fading with twilight and moonlight, dimmer near the horizon |
| 10:01 | `c91f066` | the Milky Way, drawn by the sky shader along the galactic plane (the stars' rotation, then J2000 to galactic coordinates): widest and brightest towards Sagittarius, with the bulge, the Great Rift and patchy star clouds; only on a dark night |
| 10:05 | `6930adb` | the Milky Way made much brighter (it was almost invisible): about 2.4x, a brighter outer band, and visible lower towards the horizon |
| ~10:06 | | pushed `112f24b` - `6930adb`; talked through ideas for the terrain |
| 10:19 | `f278238` | the ground carries on out to near the horizon (450 m, as rings of vertices, denser near the centre), with a haze fading it into the sky's horizon colour |
| 10:20 | `e5a9b81` | gentle unevenness (up to about 20 cm): flat at the Reset point, level again towards the horizon; columns and eye height follow the ground |
| 10:22 | `de30c8e` | colour variation: lush / dry grass, clumps, damper dips, patches of bare earth and stone, and a fine grain texture; the colour mix per vertex kept apart from the palette, ready for the seasons |
| ~10:24 | | pushed `f278238` - `5727a3a` |
| 10:28 | `2db2c6d` | seasonal ground colours: eight looks through the year (solstices, equinoxes, fire festivals) blended by the sun's position, flipped for the southern hemisphere, mild near the equator |
| ~10:29 | | pushed `2db2c6d`, `f66d0d7` |
| 10:34 | `daeb503` | TODO: sharable links (place and time in the URL) |
| 10:42 | `7f514dc` | the eight direction columns replaced by rough standing stones |
| ~10:44 | | pushed `daeb503` - `52c627d`; collision moved to "maybe later" |
| 10:50 | `50d06b5` | shadows from the sun; the daytime light leans more on the sun |
| 10:52 | `f03fa9e` | about a thousand scattered rocks, gathering in the stony patches |
| 10:54 | `9966a77` | tussocks of grass, in the season's colours |
| 11:04 | `37609ec` | night: the ground and stones were just black; a stronger, cooler night light and "night sight" around the observer |
| 11:08 | `aa8ca2d` | moonlight (by phase and height, with soft shadows), and a brighter base night |
| ~11:10 | | pushed `50d06b5` - `864f913` |
| 11:16 | `dbee68b` | the moon's surface: NASA's LRO moon map (1024 x 512, 139 KB, downloaded from NASA SVS, the CGI Moon Kit), turned the right way for the observer; README credits for the viewer's third-party code and data |
| ~11:25 | | checked the moon's tilt (it looked ~45 deg clockwise) against JPL Horizons: right to within 1.5 deg in 7 cases; the face really does tilt, e.g. ~58 deg clockwise for a full moon setting in the west from Ireland. no change |
| ~11:30 | | pushed `dbee68b`, `c8aa443` |
| 11:46 | `1748935` | reviewed the 2D calendar (index.html); the 22 findings are in `2D-REVIEW.md`, kept out of `TODO.md` (which is for the 3D viewer) for sessions on the 2D view |
| ~11:48 | | pushed `1748935` |
| 11:55 | `a8f04b6` | an "about this viewer" dialog on page load (with "Don't show this again") and a ? button to reopen it |
| 12:02 | `246b4ec` | the about dialog without the arcs' colour key; its closing note now explains the fire festivals are the solar midpoints, not their traditional 1st of the month, and that the Observer date can be set to the 1st to see those |
| ~12:03 | | pushed `a8f04b6` - `173f124` |
| 14:34 | `8084257` | sharable links: the place (and the moment, once chosen) in the page's address; opening a link doesn't replace the remembered place; a copy-link button |
| ~14:40 | | pushed `8084257` - `3b9eede`; the preview server had been stopped by the app again: restarted |
| 16:16 | `527afec` | a start script: `tools/serve.js` (a tiny Node.js server) with `start.cmd` / `start.sh`; the preview (`.claude/launch.json`, outside the repo) now runs it instead of the old scratchpad copy |
| ~16:20 | | pushed `527afec`, `f41881a`; start.cmd checked on your side: works |
| 16:47 | `52cb33d` | rethought the standing stone rings: dropped, as a calendar laid out in stones would read as direction markers in the 3D scene. instead "the horizon as the calendar" in `TODO.md`: moving through time (a dial / slider and play, the 2D rings reborn as the time control), today's rising points standing out, stones at the real alignments, an "upcoming" list, the 2D page as a light entry point. details to be talked through before each is built |

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
- **marker details float over the scene** (an HTML panel placed under the label each frame, or above it near the
  bottom of the screen, kept on screen), so nothing else moves; the label brightens while its details show. the
  panel ignores the pointer, so hovering stays with the label beneath it. labels are found with a Three.js
  raycaster against the label sprites, skipping hidden ones (the raycaster doesn't check visibility)
- **mouse**: hover shows, click pins; **touch**: tap pins (a press that moves < 8 px within 600 ms, so dragging to
  look isn't a tap); tapping elsewhere or Escape unpins
- **which dates**: the next occurrence on or after the observer's day; markers shared by two events (equinoxes, the
  fire festival pairs) list both, soonest first. midsummer / midwinter follow the hemisphere
- **bearings are from true north, to 16 compass points** (e.g. "046° NE"), with a note that a phone compass may need
  "true north" turned on, and that they're for a level horizon (hills delay sunrise and move it south). sky markers
  are directions, so the bearing is the same from anywhere on the plain, including the Reset point
- the moon's rise / set times in the details use the almanac times (as in the observer panel), not the traced
  path's ends (the moon's centre on the horizon), which differ by a minute or so
- the standstills have no one date (the moon reaches each limit monthly for a year or so around a standstill), so
  their details say what they mark, with the last / next standstill from `calcNextStandstill`
- **the about dialog is a native modal `<dialog>`**, so it's in the browser's top layer: above every element whatever
  its z-index, and above the location dialog if both are open (the most recently opened modal is on top). its
  z-index is set to the maximum anyway, as asked. shown on page load unless "Don't show this again" was chosen
  (`irishcal.viewer.hideInfo` in local storage); "Got it", Escape or the backdrop just close it. the ? button is at
  the upper right, but on phones (under 480 px) the observer panel fills the top and the ? landed on its collapse
  button, so there it moves to the bottom right corner, beside the navigation pane
- **sharable links**: `viewer.html?lat=..&lon=..&date=YYYY-MM-DD&time=HH:MM&tz=auto|<minutes>`. the place is always in
  the address; the moment only once a date or time has been chosen (or came from a link), so a bookmark of the plain
  page still opens at "now". the time zone goes with the moment so it means the same instant for everyone (Auto is
  safe: the same place gives the same zone anywhere). `history.replaceState`, 400 ms after the last change (no
  history entries; browsers limit how often it can change). invalid values are ignored one by one
- **a link's place isn't remembered**: opening someone's link would otherwise replace the visitor's own remembered
  place (seen in testing: a later plain load opened at the link's place). it's used for that visit, and remembered
  only once the visitor changes the place; a link's time zone was never saved (only a change of the dropdown is)
- the copy button uses the clipboard API, falling back to copying from a hidden text box (`execCommand('copy')`):
  the app's embedded test browser refused the clipboard API even for a real click, but the fallback worked
- **the start script**: `tools/serve.js`, Node.js only (no dependencies): serves the repo on 127.0.0.1 (this computer
  only), port 8317 or the next free one (up to 20 tries), GET / HEAD only, uncached (`no-store`), proper content
  types (the old scratchpad server had none for .jpg), and only files inside the folder (checked with
  `path.relative`: the old `startsWith` check would have let a sibling folder with the same prefix through).
  `--open` opens the 3D viewer. `start.cmd` (Windows: says where to get Node.js if it's missing, and keeps its
  window open to read it) and `start.sh` (Mac / Linux: falls back to `python3 -m http.server`); `.gitattributes`
  keeps `.sh` LF and `.cmd` CRLF on any machine; `start.sh` is stored executable. the preview's `.claude/launch.json`
  (outside the repo) now runs the repo's server, so it no longer depends on an old session's scratchpad
- **real stars rather than fake ones**: the stars are fixed on the celestial sphere, which turns as one, so a single
  rotation (precession from J2000 to the date, the local sidereal time, then the latitude) places them all, using
  the sidereal time the sun and moon already needed. a fake field would have been barely less work and wouldn't
  turn properly through a night. no names or constellation lines (not Star Walk)
- **the Yale Bright Star Catalogue**, 5th revised edition (Hoffleit & Warren 1991, from CDS, catalogue V/50: free to
  use, with a credit): the 2,887 stars down to magnitude 5.5 (a dark country sky), trimmed to RA / dec (J2000,
  0.01 deg), magnitude and B-V colour as whole numbers in `js/stars.js` (55 KB). the full catalogue stays out of the
  repo; the one-off conversion script is in the session's scratchpad
- **precession is included** after all (it moves the stars ~0.29 deg between 2000 and 2026, and it's one small
  matrix); proper motion isn't (under 0.02 deg in that time for the fastest of these stars)
- **drawing**: points, additive, between the sky dome and the moon (render order), at least ~2 px across (smaller
  points lost too much to the soft edge); size and brightness from magnitude; colour from B-V (temperature, then an
  approximate blackbody colour, mixed halfway to white)
- **visibility**: the faintest magnitude that shows follows the sun's altitude (none above -3 deg, the brightest from
  about -6, all by -15), less up to a magnitude for a bright moon that's up; stars dim near the horizon (about a
  quarter magnitude per air mass) and aren't drawn below it
- **the Milky Way is drawn, not a photograph**: the sky shader turns each direction back to J2000 (the stars'
  rotation, transposed) and into galactic coordinates, then draws a soft band along galactic latitude 0: wider
  and brighter towards the centre (galactic longitude 0, in Sagittarius), a bulge around the centre, the Great
  Rift (a darker lane from Cygnus towards the centre) and 3D value noise for star clouds (3D, so no seam). no
  image, no download, and right for any date and place
- it shows only on a dark night: its strength follows the stars' limiting magnitude (none until about magnitude
  4, full by 5.5), so it's faint by a full moon and gone in twilight, and it fades out towards the horizon
- **the horizon stays level**: everything astronomical (arcs, markers, bearings, rise / set times) assumes a level
  horizon at 0 deg, so the terrain only undulates near the observer and flattens out towards the horizon. a real
  horizon profile (e.g. Newgrange's hills, which is why its solstice sunrise is ~8:58, not 8:41) would be a
  bigger, later job needing elevation data
- **the ground goes out to 450 m** (inside the sky dome), so it meets the sky at a true horizon: from eye height a
  flat ground's horizon is within 0.05 deg of level. rings of vertices, spaced ~12 cm at the centre growing ~3.5%
  a ring (~2 m by the plain's edge, 60 m), 256 around: 36k vertices. walking is still limited to the 60 m plain
- **distance fading is haze, not a spotlight**: Three.js linear fog from 30 m to 450 m, its colour the sky's
  horizon colour (night to day, plus the twilight glow averaged all the way round). the sky dome, moon and stars
  (shader materials) aren't fogged by default; the sky's labels, their ticks and the moon's path turn fog off
- **unevenness**: value noise in three layers (swells ~16, 6 and 2.5 m across), up to about +/-20 cm, flat within
  ~3 m of the centre, level again by 220 m; the smallest layer fades out beyond ~25-50 m, where the rings are too
  far apart for it. it shows mostly as light and shade with a low sun (slopes are only ~1-3.6 deg)
- **colours**: per-vertex mixes (lush / dry grass, clumps, damper dips, bare earth, stone) worked out once, and a
  palette applied by `colourGround`, so the seasons only need a new palette. the fine grain is a 128 px canvas
  tile over 4 m, with speckles of ~3 and ~12 cm (1 cm speckles averaged away to flat grey), multiplied over the
  colours
- **seasons by the sun, keyed to the festivals**: the ground's look is set at the eight points of the year (the
  solstices, equinoxes and fire festivals, by the sun's ecliptic longitude, as for the arcs) and blended between
  them, so it follows the solar year rather than calendar months, and the grass's lag behind the sun is built in:
  freshest around Bealtaine, driest after Lúnasa, dullest with the most bare, wet ground through the winter. Irish
  grass stays green all year, so no literal grey / orange: the grass colours, a lean towards the dry grass, how far
  the earth and stone patches spread (their thresholds lowered) and the earth's colour (darker when wet) change
- the southern hemisphere is six months on (longitude + 180); within ~10-30 deg of the equator it blends to a mild
  all-year green. the ground is recoloured only when the sun has moved a degree (about a day) or the latitude
  changes; the noise values per vertex are kept, so recolouring is quick
- **the stones are generated, not model files**: each from its own fixed seed, so the same eight stones every time
  (effectively permanent shapes). generating them takes about a millisecond; model files would need a loader and
  downloads, with no gain, and would be harder to tweak. a hand-made model could still replace one later
- **stone shape**: rings of a rounded-box outline (a superellipse, between an ellipse and a box), wider at a flared
  base and narrowing to 55-75% at the top, which is blunt (rounded off only over the last 7%) and sloping; lumps
  from 3D noise, a slight lean and twist; set 20 cm into the ground. broad faces towards the centre, as in stone
  circles. cardinal stones ~2.3-2.65 m tall, the others ~1.5-1.85 m. flat shading, vertex colours: grey with
  lichen patches (more higher up) and a darker, damp foot
- **no collision for now**: walking passes through the stones and rocks, so as more rings are added there's nothing
  to get stuck on; it's on the TODO list under "maybe later"
- **shadows**: one directional light's shadow map, 2048 texels over a 130 m square seen from the sun (about 6 cm a
  texel; 4096 would take 64 MB of graphics memory, a lot for phones), soft (PCF), kept centred on the observer and
  snapped to whole texels so edges don't shimmer when walking. the stones and rocks cast; the ground, stones, rocks
  and tussocks receive. the daytime balance moved towards the sun (sun 1.4 -> 2.0, sky light 1.6 -> 1.2), as the
  shadows were faint; it also brings out the ground's unevenness and the stones' shapes
- **rocks and tussocks are instanced** (one shape drawn many times: 4 rock shapes, 3 tussock shapes) and placed from
  fixed seeds (a small repeatable random generator), so the layout is the same every time. rocks: ~1,000 within
  70 m, kept more often in the ground's stony patches (its stone noise), mostly 10-50 cm with the odd boulder, sunk
  by a third, darker tints; small ones not placed beyond 50 m. tussocks: clumps of 22 blades within 50 m, on the
  grassier ground, coloured by `colourGround` from the season's grass (70% of the way to the dry colour). both keep
  clear of the standing stones and of the Reset point (by 3 m plus three times their size)
- **night sight**: at night the landscape was black. the all-round night light is stronger and cooler (0.3 -> 0.55,
  bluer), and a dim, cool point light 10 m above the observer (intensity 7, fading to nothing by 45 m, a little past
  the stones, with a gentle falloff) comes up as the daylight goes, like eyes adjusted to the dark. it follows the
  observer
- **moonlight**: a second directional light from the moon (cool, `#c3cff0`), intensity 1.6 x illumination^1.5 x
  how far up it is (0 below -1 deg, full by 10 deg), off in daylight, so a full moon well up clearly lights the
  landscape and a crescent hardly does. soft shadows from a 1024 map over the same 130 m square as the sun's. the
  base night was also brightened (all-round 0.55 -> 0.75, night sight 7 -> 10)
- the moon's shadows stay switched on even with no moonlight: switching a light's shadows on / off changes how
  many shadow maps the shaders use, so every material recompiles (a hitch each time the moon rose or set)
- **the moon's surface is a real map, not drawn**: NASA's CGI Moon Kit (https://svs.gsfc.nasa.gov/4720), the 1k
  colour map from Lunar Reconnaissance Orbiter data (credit: NASA's Scientific Visualization Studio), in
  `js/lib/moon` with a CREDIT.txt. the moon is only ~3 deg across on screen, so 1k is plenty (the larger ones are
  multi-MB TIFFs). drawn maria would only ever look roughly moon-like
- **the moon's orientation**: the shader turns each point's surface direction into selenographic latitude /
  longitude against three axes: towards the observer (longitude 0: the near side faces the Earth; libration, a few
  degrees of wobble, left out), north towards the ecliptic's north pole (the moon's spin axis is within 1.5 deg of
  it; taken through the stars' J2000-to-scene rotation), and east to the right seen with north up. so the face
  tilts through the night and month, and is upside down from the southern hemisphere. the map's values are used
  as they are (sRGB), scaled so its average (~0.62) becomes 1, at 85% strength, over the existing lit / shadowed
  colours; the shadowed side shows the maria faintly, like earthshine

### validation

| what | result |
|---|---|
| `parseMapsLocation`, 29 cases (pin, place, search, directions, `?q=` / `?query=` links; decimal and DMS text; short links, missing / out-of-range coordinates) | all pass |
| in the browser | pasting a Stonehenge pin link moved the observer (sunrise 5:56 UTC, as expected), survived a reload; Escape, Cancel, backdrop, Back to Newgrange, arrow keys blocked while open (only properly shown later, see "problems hit"); phone-width layout |
| time zones | 12:00 UTC -> 7:00 in UTC-5 with the sun unmoved; UTC+5:30, UTC-12 and UTC+14 (date rolls over); rise / set times shift with the zone; remembered after a reload; fits the panel at phone width |
| tz-lookup, 20 places | right for all but Lifford (a Donegal border town, given Europe/London, which has the same offset); includes Belfast / Derry / Strabane, Carnac, Callanish, Phoenix (no summer time), Kathmandu, Chatham, Kiritimati, mid-Atlantic |
| Auto in the browser | Newgrange UTC in December / UTC+1 in July; moving to New York, Kathmandu (+5:45), Chatham (+12:45), mid-Atlantic (-2, "at sea") keeps the moment; manual choice kept when moving; both clock changes; phone width with "Auto (UTC+12:45)" |
| next full / new | 26 Sep, 10 Oct, 26 Oct 2026 to the minute of USNO; order swaps after the full moon; dates follow the time zone (the 24 Dec 01:28 UTC full moon is Dec 23 in UTC-5) |
| collapsing panes | both collapse and expand, remembered after a reload; hidden buttons can't be tabbed to; holding the right arrow still turns the view with the navigation pane collapsed (180 -> 237 deg), and doesn't with the location dialog open; phone width |
| marker details | Newgrange, from 24 Sep 2026: Midsummer sunrise Jun 21 2027 4:56am, 046° NE (a hand calculation for the latitude gives 46.2°); Midwinter sunrise Dec 21 2026 8:41am, 131° SE; both equinoxes 089° E, spring first (the autumn one was the day before); Samhain Nov 7 / Imbolc Feb 4, 117° ESE; moonrise matches the observer panel's; minor standstill last Oct 2015, next May 2034. hover / click to pin / click elsewhere / Escape; closes when its arcs are switched off; phone width, tapped |
| stars | catalogue spot checks (Polaris, Sirius, Vega, Betelgeuse, Rigel, Arcturus: positions and colours); `precessionMatrix` reproduces Meeus example 21.b to 0.00"; the sky rotation matches `equatorialToHorizontal` to 1e-13 deg (every 97th star, 4 places, 4 dates); Polaris at the latitude; in the browser, the Plough's stars within a few pixels of their predicted screen positions (Newgrange, 10 Oct 2026 23:00); twilight fade at sun -8 / -13 / -17 deg; fewer stars at full moon |
| Milky Way | the equatorial -> galactic matrix gives the galactic centre l = 0, b = 0 and the pole b = 90 exactly; Deneb and Sirius match the catalogue's own galactic coordinates; in the browser (Newgrange, 10 Oct 2026 23:00) the band rises at about 245 deg in the WSW (predicted 245-248, Aquila) with the rift splitting it, and comes down fainter at about 64 deg ENE (predicted 58-62, Perseus / Auriga) |
| moon tilt vs JPL Horizons | the viewer's angle of the moon's north from straight up against JPL's north pole position angle plus the parallactic angle, 7 cases (full moon SE / rising E / setting W, crescent setting SW, gibbous S, tonight SE; Sydney): all within 0.5-1.5 deg (the approximation of the moon's axis by the ecliptic pole, and no libration) |
| moon surface | the map's landmarks where they should be (Tycho ~11 W 44 S, Crisium ~59 E 18 N); full moon from Newgrange (Imbrium upper left, Crisium right, Tycho below), a waxing crescent showing Crisium in its sliver, a gibbous moon; from Sydney upside down (Tycho at the top) |
| seasonal ground | Newgrange at 1pm on 21 Dec, 5 May, 21 Jun, 20 Aug, 7 Nov: dull grey-green with more bare ground / most vivid / rich green / drier olive-yellow / tawny; Sydney on 21 Jun looks like midwinter; Singapore a mild green |

the test scripts are in this session's scratchpad (`test_location.js`, `test_stars.js`, `build_stars.js`), not the repo

### problems hit, and lessons

- **no python on this machine** (the Windows "python" is just a Microsoft Store shortcut): use node or the editor
  for scripted edits
- **a regular expression inside a JavaScript template string loses its backslashes** (`/^Etc\//` became
  `/^Etc//`, a syntax error): an edit script written with template strings broke the page. check the result
  with `node --input-type=module --check < js/viewer.js` after a scripted edit
- bash heredocs with lots of quotes in them can fail to parse in this environment: write longer edit scripts to a
  file in the scratchpad and run that
- **the working copies have Windows (CRLF) line endings**, so an edit script searching for text with plain `\n`
  newlines finds nothing: convert to `\n` first and write back with the file's own endings
- **a quick key press doesn't show turning**: pressing an arrow key in the browser tool sends the press and release
  together, before any frame is drawn, so "the view didn't turn" proved nothing (the first check that the dialog
  blocks the arrow keys was like this). hold the key with a `keydown` event, take a couple of screenshots (each forces
  a frame while the preview pane is hidden, when no frames are drawn otherwise), then send the `keyup`
- **walking in the test browser is unreliable**: how many frames each screenshot draws varies, so holding a key
  for a number of screenshots goes an unpredictable distance (it walked straight through a stone, then far past
  it). for close-up checks, a temporary `window.__debugView` hook (camera, setHeading, setPitch) placed the camera
  directly; removed before committing
- **a callback given to each `server.listen()` attempt stays attached after the attempt fails**, so when the next
  port worked, both fired: it printed the busy port's addresses too (and would have opened the browser twice). found
  by running it for 3 s while the preview had 8317; now one `listening` handler reads `server.address().port`
- **don't run `date` from Node on Windows**: `execSync('date')` runs the Windows `date` command, which *sets* the
  system date (it prompted, got no input and refused, so nothing changed). use JavaScript's `new Date()`, or git's
  commit times
- **`top` is a built-in browser global** (`window.top`, read-only): a test script's `var top = ...` silently kept the
  window object, which looked like a failure in the page. use other names in page scripts
- opening a modal dialog focuses its first button, scrolling a long dialog to the bottom: focus the chosen button
  with `{ preventScroll: true }` and set `scrollTop = 0`
- **double-sided materials light back faces as if facing down**: Three.js flips the normal on a back face, so half
  the tussock blades looked black. each blade is now two triangles back to back, both with upward normals
- a boulder landed right by the Reset point, then the fix cleared ~8 m (the stones' margin was tripled for the
  centre too); the centre and the stones now have separate margins
- the stones' triangles were first wound the wrong way (facing inwards); worked out by hand before testing
- **estimated times in the DEVLOG drift**: several rows written from memory were minutes out, and three were 30-55
  minutes out; take them from `git log --date=format:%H:%M` (and `date`) instead
- a directions link can start `/dir//53.69,...` (an empty starting point), which the first version of the path
  pattern missed
