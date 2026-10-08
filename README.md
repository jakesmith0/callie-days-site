# Callie Days — interactive outing finder

Public-safe front end for discovering family days out around Nottingham and beyond.

- **Explore:** search, category, distance, date and suitability filters.
- **Map:** approximate area hubs (not precise venue geocodes), with direct venue directions links.
- **Calendar:** recorded dated events and usual recurring sessions, always labelled by certainty.
- **Saved:** favourites stay in local browser storage.

**Do not publish private family preferences here.** The working catalogue/research remains in a separate private repository. This public site contains venue/event information only.

Source data: `data/activities.json` and `data/events.json`.
Update this data and commit to `main` to refresh GitHub Pages. A dated event is not a live booking availability confirmation. Source last checked October 2026.

## Build

Zero build steps. Static HTML, CSS, JavaScript and JSON. Open via a local HTTP server (e.g. `python3 -m http.server`) for testing.

## Update policy

1. Confirm new/revised details with organiser source.
2. Edit data files, preserve IDs, and update `lastChecked`.
3. Keep exact personal addresses, family birthdays, family routines and private notes **out** of this repository.
4. Validate JSON and JavaScript syntax; smoke-test the UI.
5. Commit to `main`; GitHub Pages will rebuild.

Saved favourites are device-local only, not synced across devices.
