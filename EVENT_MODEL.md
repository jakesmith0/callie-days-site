# Rolling multi-date event records (schema v2)

The site can hold many dates, while a venue remains a stable entry in data/activities.json and its events remain stable IDs in data/events.json.

For a recurring Friday group use a weekly event with weekday=5. Optional startsOn and endsOn (ISO dates) limit its advertised run. excludedDates removes an individual occurrence entirely. The exceptions dictionary is keyed by ISO date, overriding that date's time/end, status, note, or adding an unusual extra day with added=true.

Example, for illustration only (do not treat these as real bookings):

    {
      "id": "event-example",
      "placeId": "place-1",
      "title": "Toddler singing",
      "recurrence": "weekly",
      "weekday": 5,
      "time": "10:00",
      "end": "10:30",
      "confidence": "weekly",
      "startsOn": "2026-10-01",
      "excludedDates": ["2026-12-25"],
      "exceptions": {
        "2026-10-16": {"time": "11:45", "end": "12:15"},
        "2026-10-23": {"status": "cancelled", "note": "Organiser cancelled this date"}
      }
    }

Status supports scheduled, cancelled, postponed and sold_out. Cancelled/postponed occurrences appear in the date's calendar with their status but are omitted from recommendations as available sessions. Sold-out dates remain visible, with status metadata, but must not be described as bookable. Source validation should accompany any actual event adjustment.

When an organiser corrects details, update the existing stable ID and date exception. An actual one-off reschedule requires updating its dates field, and retaining a private source/provenance audit. Do not generate duplicate events just because the name or date changes.

This format enables richer ongoing discovery but does not itself perform web research or verify ticket availability. Weekly sessions can be affected by school holidays even when no exclusion has yet been recorded; treat unknowns explicitly.
