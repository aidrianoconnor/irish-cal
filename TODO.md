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
- [x] **sharable links**: the page's URL follows the place, and the moment (date, time, time zone) once one is chosen; a link opens the viewer at the same place and moment (without replacing the visitor's own remembered place); a "Copy a link to this place and time" button

## the scene

- [x] **stars in the night sky**: after all, the real stars (it turned out little more work than fake ones, as the whole sky turns as one): the Bright Star Catalogue's 2,887 stars down to magnitude 5.5, placed for the observer's date, time and place, fading in with twilight (brightest first), dimmer near the horizon and washed out by a bright moon. still no names or constellation lines: this isn't Star Walk
- [x] **the Milky Way**: a soft band along the galactic plane, drawn by the sky shader in its proper place and rotation (brightest towards Sagittarius, with a darker dust lane), an impression rather than a photograph
- [ ] **the planets** (maybe later): Venus and Jupiter are often the brightest things in the night sky after the moon, so a real star field feels incomplete without them; rough positions from a small table of orbital elements
- [x] **more interesting terrain**: the ground out to a level horizon with haze, gentle unevenness (up to ~20 cm, flat at the Reset point and towards the horizon), and colour variation (lush / dry grass, bare earth, stone, fine grain)
- [x] **the ground's colour following the season**: set at the solstices, equinoxes and fire festivals and blended between them (dull olive with the most bare, wet ground in midwinter, freshest around Bealtaine, drier after Lúnasa, tawny by Samhain), following the observer's hemisphere, and a mild all-year green near the equator
- [x] **the eight direction columns as rough standing stones**: slabs facing the centre, flared at the base and narrowing to a blunt, sloping top, with lumps, lean, twist and lichen, each from its own fixed seed (the same stones every time)
- [x] **scattered detail and shadows**: shadows from the sun (the stones and rocks cast them), about a thousand rocks gathering in the ground's stony patches, and tussocks of grass in the season's colours
- ~~**standing stone rings**: turn the 2D rings of the original calendar page (index.html: the solar year, the fire festivals and the lunar month) into rings of standing stones around the observer, with a small floating marker above the stone for where "now" falls in each ring~~ **dropped**: rings of stones laid out as a calendar would read as direction markers in the 3D scene, mixing the two views' metaphors (time around a circle vs where things are in the sky). replaced by "the horizon as the calendar", below

## the horizon as the calendar

the 2D rings show *time* (where we are in each cycle, as a position round a circle), the 3D view shows *space* (where the sun and moon rise, travel and set). real stone circles didn't hold a calendar in rings: the horizon was the calendar. through the year the sunrise swings along the horizon between the midwinter and midsummer markers; the moonrise swings between its limits every month, wider or narrower over its 18.6-year cycle. so the 3D view already holds what the 2D rings show, in its original form; these bring it out. the aim: the 3D view as the main experience, with the horizon as the calendar and the 2D rings reborn as its time control. (there are specific ideas for each of these: talk them through before building)

- [ ] **moving through time in the 3D view**: the biggest thing it lacks (the date and time are only typed in). a dial or slider to drag through the year, the month or the day, and a play button to watch a year (the sunrise walking from marker to marker) or a month (the moon's phase and rising point) go by. the 2D rings could merge in here, as a small dial in a corner of the 3D view: the same three rings (the solar year, the fire festivals, the lunar month), where dragging a pointer changes the date and the sky follows. a good first one to try, to see whether merging the rings into the 3D view feels right (maybe sketched as a mock-up first)
- [ ] **today's sunrise and moonrise stand out on the horizon**, against the solstice and festival markers, e.g. with a faint trail of the past few weeks' rising points showing which way they're heading: reading the season the way people would have from a stone circle
- [ ] **stones at the real alignments** rather than more rings: a few stones at the bearings that matter for the observer's latitude (e.g. midsummer sunrise, midwinter sunset, the major standstill moonrise), as at Newgrange or Stonehenge, moving if the place changes. the eight compass stones could stay, or be thinned out
- [ ] **an "upcoming" list**, in support: the next festival, full moon, solstice, etc, with their dates and sunrise times. a linear timeline or calendar grid as the main view would cut against the project's aim of a "less linear, more cyclical" sense of time (see the README), so only as a list alongside
- [ ] **the 2D page** could stay as a light, simple entry point (it needs no 3D graphics), linking into the full viewer (its own notes are in 2D-REVIEW.md)

## other ideas raised along the way

- [x] a moon surface texture (the maria), so the moon isn't a plain disc: NASA's LRO moon map, turned the right way for the observer
- [ ] lunar eclipses (the moon currently looks full during one)
- [ ] dim the direction labels (N, NE, ...) at night; they're unlit so stay bright white
- [x] moonlight: a light from the moon, by its phase and height, so a full moon lights the landscape (with soft moon shadows)
- [x] a time zone for the observer panel: a dropdown of UTC offsets beside the time (remembered between visits); changing it re-writes the date and time so the moment itself doesn't change, and the rise / set times follow it
- [x] **work out the time zone from the lat / long**: an "Auto" choice (the default) in the time zone dropdown, using an offline boundary lookup (`@photostructure/tz-lookup`, in `js/lib/tz-lookup`) for the named zone, e.g. Europe/Dublin, and the browser's own rules for its summer time
- [x] a small start script so the viewer can be run offline without a separate server: `start.cmd` / `start.sh`, running `tools/serve.js`
- [x] an "about this viewer" dialog on page load ("Don't show this again" remembered), with a ? button to reopen it

## maybe later

- [ ] stop the observer walking through the stones and rocks (no collision for now: it's simpler not to get stuck on things as more rings of stones are added)

- [ ] **hour marks along today's sun arc**, plus a marker where the sun crosses the meridian (solar noon)
