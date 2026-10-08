#!/usr/bin/env python3
"""Validate the public Callie Days static-site catalogue without external dependencies."""
import datetime as dt
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ACTIVITIES = json.loads((ROOT / "data/activities.json").read_text(encoding="utf-8"))
EVENTS = json.loads((ROOT / "data/events.json").read_text(encoding="utf-8"))
ALLOWED = {"group", "play", "nature", "animals", "transport", "culture", "seasonal"}
TIERS = {"local", "nearby", "special"}
KINDS = {"session", "place", "journey"}
SENSITIVE = [
    r"NG2\s*7BF", r"20(?:th)?\s+October\s+2024", r"2024-10-20",
    r"Jake\s+Smith", r"Emily\s+Smith", r"11\s+days\s+(?:shy|below)",
    r"near\s+home", r"\bmy\s+(?:home|daughter|wife)\b",
]
errors = []
def err(message): errors.append(message)
def is_date(value):
    try:
        dt.date.fromisoformat(value)
        return True
    except (TypeError, ValueError):
        return False
places = ACTIVITIES.get("entries", [])
events = EVENTS.get("events", [])
if not isinstance(places, list): err("entries must be an array"); places = []
if not isinstance(events, list): err("events must be an array"); events = []
ids = set()
for index, p in enumerate(places):
    if not isinstance(p, dict): err(f"activities[{index}] must be an object"); continue
    key = p.get("id")
    if not isinstance(key, str) or not key: err(f"Missing activity id at {index}"); continue
    if key in ids: err(f"Duplicate activity id: {key}")
    ids.add(key)
    for field in ("title", "area", "description", "locationGroup", "lastChecked"):
        if not isinstance(p.get(field), str) or not p[field].strip(): err(f"{key}: missing {field}")
    if p.get("tier") not in TIERS: err(f"{key}: invalid tier")
    if p.get("kind") not in KINDS: err(f"{key}: invalid kind")
    if not isinstance(p.get("category"), list) or not p["category"] or not set(p["category"]) <= ALLOWED: err(f"{key}: invalid category")
    if p.get("summary") is not None and (not isinstance(p["summary"], str) or not p["summary"].strip() or len(p["summary"]) > 360): err(f"{key}: summary must be readable text under 360 characters")
    if p.get("publishedWeekdays") is not None and (not isinstance(p["publishedWeekdays"], list) or any(w not in range(7) for w in p["publishedWeekdays"])): err(f"{key}: invalid published weekdays")
    if p.get("source") and not p["source"].startswith("https://"): err(f"{key}: source must be HTTPS")
    if not is_date(p.get("lastChecked")): err(f"{key}: invalid check date")
    pt = p.get("mapPoint")
    if pt and (not -90 <= pt.get("lat", 999) <= 90 or not -180 <= pt.get("lng", 999) <= 180 or pt.get("precision") != "area"): err(f"{key}: bad approximate area point")
    if "minimumAgeMonths" in p and (not isinstance(p["minimumAgeMonths"], int) or p["minimumAgeMonths"] < 0): err(f"{key}: invalid age")
    if p.get("archived") not in (True, False): err(f"{key}: archived must be Boolean")
eventids = set()
for index, e in enumerate(events):
    if not isinstance(e, dict): err(f"events[{index}] must be an object"); continue
    key=e.get("id")
    if not isinstance(key,str) or not key: err(f"Missing event id at {index}"); continue
    if key in eventids: err(f"Duplicate event id: {key}")
    eventids.add(key)
    if e.get("placeId") not in ids: err(f"{key}: no matching activity placeId")
    recurrence=e.get("recurrence")
    if recurrence not in {"once", "custom", "range", "weekly"}: err(f"{key}: unknown recurrence")
    if recurrence in {"once", "custom"}:
        if not e.get("dates") or not all(is_date(x) for x in e["dates"]): err(f"{key}: invalid list of dates")
    if recurrence=="range":
        if not is_date(e.get("from")) or not is_date(e.get("to")) or e["from"]>e["to"]: err(f"{key}: invalid date range")
    if recurrence=="weekly" and e.get("weekday") not in range(7): err(f"{key}: invalid weekday")
    if e.get("confidence") not in {"dated", "weekly"}: err(f"{key}: invalid confidence")
    if e.get("source") and not e["source"].startswith("https://"): err(f"{key}: source must be HTTPS")
for filename in (ROOT / "data/activities.json", ROOT / "data/events.json", ROOT / "index.html", ROOT / "app.js"):
    text=filename.read_text(encoding="utf-8")
    for term in SENSITIVE:
        if re.search(term,text,re.IGNORECASE): err(f"{filename.name}: private-detail indicator matching {term}")
for file in ("index.html", "app.js", "styles.css", "favicon.svg", "manifest.webmanifest"):
    if not (ROOT / file).is_file(): err(f"Missing static asset {file}")
if errors:
    for issue in errors: print("FAIL:",issue)
    raise SystemExit(1)
print(f"OK: {len(places)} publicly safe activities, {len(events)} event definitions, unique IDs, valid references and assets.")
