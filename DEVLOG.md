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
