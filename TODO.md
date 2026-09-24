# TODO

ideas for the 3D viewer (viewer.html), roughly in the order we plan to tackle them

## sun and moon cycles in the sky

- [x] **fire festival arcs**: dashed ember arcs for the sun's path at the solar midpoints between the solstices and equinoxes (+/-16.3 deg: Bealtaine / Lúnasa north, Samhain / Imbolc south), plus the equinox arc (0 deg), each with sunrise / sunset markers
- [x] **the moon's arcs**: its path across the sky for its current (or next) pass, traced from its calculated positions, and the limits of its range at the major / minor lunar standstills (about +/-28.6 deg and +/-18.3 deg), with moonrise / moonset markers for each
- [x] **a toggle to show / hide the arcs** and horizon markers, separately for the sun and the moon (in the observer panel, remembered between visits)
- [x] **details for each horizon marker**: hovering over (or tapping) a marker's label shows a small floating panel with the next date(s) of what it marks, the sunrise / sunset (or moonrise / moonset) time that day, and its bearing from true north, for pointing the way with a phone's compass; the standstill markers explain what they mark, with the last / next standstill

## observer location

- [x] **set the location from a Google Maps pin**: a "how to get your lat / long easily" link opens a dialog explaining how to copy a spot's coordinates from Google Maps, with a field that reads either the coordinates (decimal, or degrees / minutes / seconds) or a full Google Maps link and applies them to the lat / long fields. short Share links (maps.app.goo.gl) can't be read from a web page, so the dialog says to copy the coordinates instead
- [x] **remember the last latitude / longitude used**, in local storage (like the arc toggles) so the viewer reopens at the same place; "Back to Newgrange" in the dialog returns to the default
- [ ] **sharable links**: keep the latitude, longitude, date and time in the page's URL (updated as they change), so a link opens the viewer at the same place and moment

## the scene

- [x] **stars in the night sky**: after all, the real stars (it turned out little more work than fake ones, as the whole sky turns as one): the Bright Star Catalogue's 2,887 stars down to magnitude 5.5, placed for the observer's date, time and place, fading in with twilight (brightest first), dimmer near the horizon and washed out by a bright moon. still no names or constellation lines: this isn't Star Walk
- [x] **the Milky Way**: a soft band along the galactic plane, drawn by the sky shader in its proper place and rotation (brightest towards Sagittarius, with a darker dust lane), an impression rather than a photograph
- [ ] **the planets** (maybe later): Venus and Jupiter are often the brightest things in the night sky after the moon, so a real star field feels incomplete without them; rough positions from a small table of orbital elements
- [x] **more interesting terrain**: the ground out to a level horizon with haze, gentle unevenness (up to ~20 cm, flat at the Reset point and towards the horizon), and colour variation (lush / dry grass, bare earth, stone, fine grain)
- [x] **the ground's colour following the season**: set at the solstices, equinoxes and fire festivals and blended between them (dull olive with the most bare, wet ground in midwinter, freshest around Bealtaine, drier after Lúnasa, tawny by Samhain), following the observer's hemisphere, and a mild all-year green near the equator
- [x] **the eight direction columns as rough standing stones**: slabs facing the centre, flared at the base and narrowing to a blunt, sloping top, with lumps, lean, twist and lichen, each from its own fixed seed (the same stones every time)
- [x] **scattered detail and shadows**: shadows from the sun (the stones and rocks cast them), about a thousand rocks gathering in the ground's stony patches, and tussocks of grass in the season's colours
- [ ] **standing stone rings**: turn the 2D rings of the original calendar page (index.html: the solar year, the fire festivals and the lunar month) into rings of standing stones around the observer, with a small floating marker above the stone for where "now" falls in each ring

## other ideas raised along the way

- [ ] a moon surface texture (the maria), so the moon isn't a plain disc
- [ ] lunar eclipses (the moon currently looks full during one)
- [ ] dim the direction labels (N, NE, ...) at night; they're unlit so stay bright white
- [x] a time zone for the observer panel: a dropdown of UTC offsets beside the time (remembered between visits); changing it re-writes the date and time so the moment itself doesn't change, and the rise / set times follow it
- [x] **work out the time zone from the lat / long**: an "Auto" choice (the default) in the time zone dropdown, using an offline boundary lookup (`@photostructure/tz-lookup`, in `js/lib/tz-lookup`) for the named zone, e.g. Europe/Dublin, and the browser's own rules for its summer time
- [ ] a small start script so the viewer can be run offline without a separate server

## maybe later

- [ ] stop the observer walking through the stones and rocks (no collision for now: it's simpler not to get stuck on things as more rings of stones are added)

- [ ] **hour marks along today's sun arc**, plus a marker where the sun crosses the meridian (solar noon)
