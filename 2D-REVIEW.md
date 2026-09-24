# 2D-REVIEW

a review of the 2D calendar (index.html, with js/app.js, js/data.js, js/cms.js, and the shared js/astro.js,
js/moon.js, js/seasons.js), for sessions that work on the 2D view. kept apart from TODO.md, which is for the 3D
viewer. reviewed 2026-09-24 on branch `feature/002-3d_viewer` (which includes `feature/001-v2_rework`), by reading
the code and running the page at desktop and phone sizes.

**what's fine**: today's three pointers are in the right places (just past the autumn equinox; between Lúnasa and
Samhain; just before the full moon), clicking a label loads its resources, and all 23 resource links respond.

suggested order: **1-3** first (accuracy and consistency; 2 needs a decision), then **5-7 as part of 16** (redrawing
as SVG fixes them, the blurriness and keyboard access together), then the rest as quick tidy-ups along the way

---

## things that are wrong

- [ ] **1. the pointers can be up to ~2 days off at the labels.** each ring puts its four labels at exact quarters
  (`makeRingLabels`, `i * .25`, app.js:154), but the pointer is placed by progress through the whole cycle
  (`calData.cycle.percProgressToNextCal`, app.js:243), and the events aren't evenly spaced. measured for the current
  cycles: spring equinox at 24.4% of the solar year (label at 25%: 2.3 days out), fall equinox 75.4% (1.4 days),
  Bealtaine 49.6% (1.5 days), full moon 52.7% of the lunation (0.8 days, so just after a full moon the pointer can
  still sit before the FULL MOON label). fix: place the pointer by its progress between the two events either side
  of it (the "subcycle", which app.js already works out) mapped into that quarter, so it passes each label exactly
  on the day
- [ ] **2. the fire festivals disagree with the 3D viewer.** the 2D calendar puts them on the 1st of Feb / May / Aug /
  Nov (`FIRE_FESTIVALS`, seasons.js:27-31); the 3D viewer uses the sun's midpoints between the solstices and
  equinoxes (about 4 Feb, 5 May, 7 Aug, 7 Nov). **needs a decision**: one rule for both, or show both (e.g. the
  traditional date and the astronomical one). the README currently describes the 1st-of-the-month rule
- [ ] **3. the "day X of Y" text is worked out but never shown.** `processCalendarType` builds sentences like "Today
  is day 1 out of 89 days in the period of Fall Equinox…" (`labels.verbose`, app.js:58 and 104), but nothing
  displays them, so the page has no text saying where today falls. also: a period's first day counts as day 0, and
  the rounded "days past" and "days remaining" don't always add up to the rounded total
- [ ] **4. stale cache-busting versions.** index.html asks for `astro.js?v=20260924c` and `moon.js?v=20260924d`
  (index.html:36-37), but both have changed since (the 3D viewer asks for `...d` / `...e`), so returning visitors
  may get old copies. harmless today, a trap later. `cms.js` has no version at all (index.html:39)

## readability and look

- [ ] **5. labels on the lower half of each ring are upside down** (FULL MOON, LÚNASA, BEALTAINE): each label is
  rotated with its ring position (app.js:154). they should flip to read the right way up below the middle
- [ ] **6. the white tick marks cut through the labels** ("FI|ST QUA|TER", "IM|3OLC"): the ticks (z-index 100,
  app.js:125) reach out to the ring's edge plus its width, overlapping the labels (z-index 200, app.js:152, which sit
  just outside the ring), and white ticks read as gaps in the black text
- [ ] **7. long labels are clipped at the ends** (the "F" of FALL EQUINOX): each label's canvas is a fixed 10 stroke
  widths wide (app.js:141)
- [ ] **8. blurry on phones and high-resolution screens**: the canvases are sized in CSS pixels, ignoring
  `devicePixelRatio`
- [ ] **9. no date, legend or sense of time**: nothing says which ring is which (solar year outside, fire festivals
  in the middle, the moon inside) or what moment the calendar is showing

## accessibility and use

- [ ] **10. the labels can't be reached by keyboard, or read by a screen reader**: they're canvases (no role, not
  focusable). tapping works, but only on the text's small rectangle
- [ ] **11. clicking a label jumps to a fixed scroll position** (`window.scrollTo(0, 1000)`, app.js:190) rather than
  to the resources section itself (`scrollIntoView`)
- [ ] **12. after a resize it waits a full second to redraw** (app.js:344); a shorter debounce (~150 ms) would do
- [ ] **13. no links between the 2D calendar and the 3D viewer**, in either direction

## code tidiness

- [ ] **14. the "clear out the old UI" block never runs**: `$('fireFestivalWrap')` is missing its `#` (app.js:251),
  so it matches nothing. harmless, as `UI.html(html)` replaces everything anyway, so the block can simply go
- [ ] **15. small slips**:
  - `context = lineCanvas.getContext("2d")` has no `var`, so `context` is a global (app.js:116)
  - `var cms = [];` is used as an object / map, not an array (cms.js:1): should be `{}`
  - `processCalendarType`'s `calLabel` parameter is never used (app.js:19)
  - the cycle and subcycle calculations are the same code copied twice (app.js:19-104)
  - dates go Date -> text fields (`makeDataObjFromDate`, astro.js) -> Date again (`makeDateFromDataObj`,
    app.js:2), a leftover from the pasted USNO data: the calculated Dates could be used directly
  - the comparison `today - cData[i].fullDate > -1` (app.js:25, 64) is really `fullDate <= today`
  - "cycleLables" is misspelt throughout (data.js)
- [ ] **16. around 70 separate canvases** (one per tick, label and pointer). redrawing as a single SVG would fix 6,
  7, 8 and 10 in one go: crisp at any size, real text that can be focused and read, easier to style
- [ ] **17. jQuery (3.6.0) is used for only a handful of lines**: it could be removed, or at least updated

## content and page details

- [ ] **18. "FALL EQUINOX"** is the American name: "Autumn" would match the Irish focus (and the 3D viewer). Irish
  names are an option too (Grianstad for the solstices, Cónocht for the equinoxes)
- [ ] **19. the social-sharing tags use `name=` where Open Graph expects `property=`** (`og:title` etc,
  index.html:9-13), so link previews on some sites may miss them (the `twitter:` ones are right with `name=`)
- [ ] **20. a stray comment after `</html>`**: "orla costello - IPS brigid" (index.html:53). the README spells her
  name "Orlagh Costellow"; one of the two is probably a typo
- [ ] **21. check the resources' content**: all 23 links respond, but YouTube returns a page even for removed videos,
  so spot-check them by hand; some content dates from 2021-22 and may be due a refresh

## deployment

- [ ] **22. the live site is behind the code**: it's deployed from `main`, where the dates are still pasted data
  running out around 2027-28; the calculated dates (which don't run out) are only on the feature branches. merging
  and deploying fixes that, once whatever's wanted from the above is in
