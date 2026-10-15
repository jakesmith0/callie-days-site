# Callie Days — family adventures finder

**Live website:** https://calliedays.digitalhm.uk/ (old GitHub Pages address redirects)

A mobile-first, location-aware discovery guide for parents of under-fives across Greater Nottingham, led by three journeys: **Something now**, **Meet other families** and **Plan ahead**. Scheduled events and generally visitable places appear in the same search.

## Privacy

**This repository and its website are public.** The companion `jakesmith0/callie-days` research repository is private and holds family preferences, private feedback and the home postcode. Never copy private family details into this public repository. Public map markers are *approximate area positions* and do not identify a family address.

## Growing the directory

- `data/activities.json`: editable activities with stable IDs, summaries, categories, legacy travel bands, labelled approximate area or venue-location coordinates, source URLs and honest check dates.
- `data/events.json`: one-off dates, date ranges and usual weekly sessions linked by `placeId`. Never assume booking availability or term-time sessions are guaranteed.
- `index.html`, `styles.css`, `app.js`, `assets/`: static public site; no build process required.
- [UX review and remaining gaps](UX_REVIEW_2026-10-09.md).

### Contribute to catalogue

1. Verify a venue/session with its organiser, noting date, opening, age suitability, booking and cost.
2. Edit `data/activities.json`; preserve stable IDs, concise `summary` and truthful `lastChecked` values.
3. Edit `data/events.json` for new dated or recurring events.
4. Validate and run the UI smoke tests. A commit on `main` triggers GitHub Pages publishing.
5. Keep *personal* notes and outing feedback in the private research repository.

### Local development and tests

```bash
npm ci
npm run test:data
node --check app.js
npm run test:ui
python3 -m http.server 8000
```

To run tests using macOS's installed Chrome: `CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run test:ui`.

CI verifies JSON integrity, privacy indicators, JavaScript syntax, and browser UX/accessibility at phone/tablet/desktop widths. The site deploys via GitHub Pages from `main`.

**Limits:** no live opening-hours or booking availability, no verified door-to-door travel times, no favourite synchronisation. The separately scheduled research job is not an on-site live availability service and publishes only when integration is enabled.

### Open-source and map credits

Leaflet 1.9.4 and Leaflet.markercluster 1.5.3 are bundled under MIT licences (in `assets/LICENSE-Leaflet.txt` and `assets/LICENSE-Leaflet.markercluster.txt`). Map tiles © OpenStreetMap contributors, requiring network access.

## Neighbourhood pages, locations and content

- `data/areas.json` is the canonical source for approximate neighbourhood centres. `scripts/generate_areas.py` builds `/areas/` landing pages and CI ensures they match the current catalogue.
- The Find Nearby feature uses area centres or browser geolocation to rank approximate *straight-line* distances from catalogue **area markers**, not door-to-door route estimates. Do not label these estimates as driving times.
- The optional UK postcode lookup contacts postcodes.io directly from the visitor's browser only after they enter and submit a postcode; the site has no server receiving this postcode. Browser geolocation is requested on click, or automatically when permission is already granted and there is no manual area selection. Coordinates are not persisted; an explicitly chosen town or deliberate Nottingham-wide selection is remembered locally.
- Preserve truthful `lastChecked`; editing a display summary or migrating a schema never constitutes re-verification. Prefer well-sourced descriptions over generic prose and provide an organiser link wherever possible.
- The logo mark lives in `assets/sunshine.svg`; the original green/orange HTML wordmark remains independent. Do not replace it with an image containing lettering.


## Parent-first V3 publishing

The live source is on main; the public custom domain is held in the CNAME file. The GitHub Pages address redirects.

* The same app shell is generated under neighbourhood routes by running: python3 scripts/generate_areas.py
* Before committing, validate: python3 scripts/validate_catalogue.py and npm run test:ui
* For a term-time weekly event, conservative known council holiday exclusions prevent treating school holidays as regular occurrences; organisers and individual school calendars can differ. Source: https://www.nottinghamshire.gov.uk/education/school-holidays-and-closures/school-holiday-and-term-dates
* A venue-level coordinate must have source-supported geometry and precision value venue. Otherwise leave precision as area; straight-line approximations are not driving times.
* Properly licensed photos in assets/photos include photoCredit metadata and attribution in the details view; unrelated venue stock images should not be misrepresented as actual venue photos.
* A recurring class belongs in the event records, not as a generic anytime place. The site displays human recurring schedule summaries and uses per-date exceptions for changes.
* The continuous research updater must identify and reconcile existing records with stable IDs, verify facts, regenerate areas, run validation and push only public-safe updates. Do not treat a JSON edit as an independent source check.
