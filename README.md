# Callie Days — family adventures finder

**Live website:** https://jakesmith0.github.io/callie-days-site/

A fast, responsive directory for finding family outings near Nottingham and beyond: date-specific events, recurring sessions, attractions, transport adventures, maps, calendar, filters and local saved ideas.

## Privacy

**This repository and its website are public.** The companion `jakesmith0/callie-days` research repository is private and holds family preferences, private feedback and the home postcode. Never copy private family details into this public repository. Public map markers are *approximate area positions* and do not identify a family address.

## Growing the directory

- `data/activities.json`: editable activities with stable IDs, summaries, categories, broad travel bands, approximate area map coordinates, source URLs and honest check dates.
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

**Limits:** no automatic web research/refresh, no real-time availability, no accurate door-to-door travel times, no favourites sync across devices. The site warns if its catalogue is old.

### Open-source and map credits

Leaflet 1.9.4 and Leaflet.markercluster 1.5.3 are bundled under MIT licences (in `assets/LICENSE-Leaflet.txt` and `assets/LICENSE-Leaflet.markercluster.txt`). Map tiles © OpenStreetMap contributors, requiring network access.

## Neighbourhood pages, locations and content

- `data/areas.json` is the canonical source for approximate neighbourhood centres. `scripts/generate_areas.py` builds `/areas/` landing pages and CI ensures they match the current catalogue.
- The Find Nearby feature uses area centres or browser geolocation to rank approximate *straight-line* distances from catalogue **area markers**, not door-to-door route estimates. Do not label these estimates as driving times.
- The optional UK postcode lookup contacts postcodes.io directly from the visitor's browser only after they enter and submit a postcode; the site has no server receiving this postcode. Browser geolocation is only requested on button click and is not persisted; an explicitly chosen town is remembered locally.
- Preserve truthful `lastChecked`; editing a display summary or migrating a schema never constitutes re-verification. Prefer well-sourced descriptions over generic prose and provide an organiser link wherever possible.
- The logo mark lives in `assets/sunshine.svg`; the original green/orange HTML wordmark remains independent. Do not replace it with an image containing lettering.
