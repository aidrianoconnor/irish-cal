# TODO

ideas for the 3D viewer (viewer.html), roughly in the order we plan to tackle them

## sun and moon cycles in the sky

- [x] **fire festival arcs**: dashed ember arcs for the sun's path at the solar midpoints between the solstices and equinoxes (+/-16.3 deg: Bealtaine / Lúnasa north, Samhain / Imbolc south), plus the equinox arc (0 deg), each with sunrise / sunset markers
- [x] **the moon's arcs**: its path across the sky for its current (or next) pass, traced from its calculated positions, and the limits of its range at the major / minor lunar standstills (about +/-28.6 deg and +/-18.3 deg), with moonrise / moonset markers for each
- [x] **a toggle to show / hide the arcs** and horizon markers, separately for the sun and the moon (in the observer panel, remembered between visits)

## observer location

- [ ] **set the location from a Google Maps pin**: a field to paste a Google Maps pin URL into, with the latitude and longitude extracted from it and applied to the lat / long fields. a "how to get your lat / long easily" link opens a modal explaining how to go to Google Maps, drop a pin and copy its URL, with the paste field in the same modal; the lat / long are extracted and applied from there
- [ ] **remember the last latitude / longitude used**, stored in a cookie (or local storage, like the arc toggles) so the viewer reopens at the same place

## the scene

- [ ] **stars in the night sky**: an impression of stars, deliberately *not* real star positions (this isn't meant to be a star atlas like Star Walk), fading in as the sky darkens
- [ ] **more interesting terrain**, with the ground's colour following the season, e.g. grey in winter, brown in spring, green in summer, orange in autumn (following the observer's hemisphere)
- [ ] **standing stone rings**: turn the 2D rings of the original calendar page (index.html: the solar year, the fire festivals and the lunar month) into rings of standing stones around the observer, with a small floating marker above the stone for where "now" falls in each ring

## other ideas raised along the way

- [ ] a moon surface texture (the maria), so the moon isn't a plain disc
- [ ] lunar eclipses (the moon currently looks full during one)
- [ ] dim the direction labels (N, NE, ...) at night; they're unlit so stay bright white
- [ ] a local time option for the observer panel (it's UTC for now)
- [ ] a small start script so the viewer can be run offline without a separate server

## maybe later

- [ ] **hour marks along today's sun arc**, plus a marker where the sun crosses the meridian (solar noon)
