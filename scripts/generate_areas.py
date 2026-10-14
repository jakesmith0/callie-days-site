#!/usr/bin/env python3
"""Build accessible, indexable neighbourhood landing pages from the public catalogue."""
import html
import json
import math
from pathlib import Path
from urllib.parse import quote
ROOT=Path(__file__).resolve().parents[1]
AREAS=json.loads((ROOT/"data/areas.json").read_text())["areas"]
PLACES=json.loads((ROOT/"data/activities.json").read_text())["entries"]
def distance(a,b):
    rad=math.pi/180
    dlat=(b[0]-a[0])*rad;dlon=(b[1]-a[1])*rad
    x=math.sin(dlat/2)**2+math.cos(a[0]*rad)*math.cos(b[0]*rad)*math.sin(dlon/2)**2
    return 12742*math.asin(math.sqrt(x))
def esc(x):return html.escape(str(x),quote=True)
def page(title,body,canonical):
    return f'''<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f8f8f4"><title>{esc(title)} | Callie Days</title><meta name="description" content="Find things to do with babies, toddlers and preschoolers around {esc(title.replace("Things to do near ",""))}. Local activities, places and groups."><link rel="canonical" href="{esc(canonical)}"><link rel="icon" href="/favicon.svg"><style>
body{{font:16px/1.5 system-ui,-apple-system,sans-serif;background:#f7f7f1;color:#223b30;margin:0}}
header,main,footer{{max-width:1000px;margin:auto;padding:22px}}
header{{display:flex;align-items:center;gap:12px}}
header img{{width:46px;height:46px}}header a{{font-weight:800;font-size:21px;color:#315b46;text-decoration:none}}
h1{{font-size:clamp(26px,5vw,43px);line-height:1.16;letter-spacing:-.8px;margin:4px 0 16px}}
h2{{font-size:20px}}p{{color:#456153}}
.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}}
article{{background:#fff;border:1px solid #dbe5d9;border-radius:14px;padding:15px}}
article h3{{font-size:16px;margin:0 0 7px}}article p{{font-size:13px;margin:0 0 9px}}
a{{color:#265b46}}.button{{display:inline-block;background:#315b46;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700}}
footer{{font-size:12px;color:#52685c;border-top:1px solid #dce5d8}}
</style></head><body><header><img alt="" src="/assets/sunshine.svg"><a href="/">callie<span style="color:#d99560">days</span></a></header><main>{body}</main><footer>Callie Days · Things to do with under-fives around Nottingham. Listings can change; check the organiser before travelling.</footer></body></html>'''
out=ROOT/"areas";out.mkdir(exist_ok=True)
links=[]
for a in AREAS:
    centre=(a["lat"],a["lng"])
    matches=sorted((p for p in PLACES if not p.get("archived") and p.get("mapPoint")),key=lambda p:distance(centre,(p["mapPoint"]["lat"],p["mapPoint"]["lng"])))[:16]
    cards=[]
    for p in matches:
        description=p.get("summary") or p["description"]
        cards.append(f'<article><h3>{esc(p["title"])}</h3><p><strong>{esc(p["area"])}</strong> · Approx. {round(distance(centre,(p["mapPoint"]["lat"],p["mapPoint"]["lng"])))} km from area centre</p><p>{esc(description)}</p><a href="{esc(p["source"])}" rel="noopener noreferrer">Organiser or venue details ↗</a></article>')
    canonical=f'https://calliedays.digitalhm.uk/areas/{a["slug"]}/'
    listing=f'<h1>Things to do near {esc(a["name"])} with under-fives</h1><p>Local activities, play, places and family outings around {esc(a["name"])}. Distances are approximate and based on area markers, not venue entrances or road journeys.</p><p><a class="button" href="/?area={quote(a["name"])}">Explore live dates and filter results ↗</a></p><h2>Ideas around {esc(a["name"])}</h2><div class="grid">{"".join(cards)}</div><p>Looking further ahead? <a href="/">Browse the full Nottingham family activities directory</a>.</p>'
    where=out/a["slug"];where.mkdir(exist_ok=True)
    (where/"index.html").write_text(page(f'Things to do near {a["name"]}',listing,canonical))
    links.append(f'<article><h3><a href="/areas/{a["slug"]}/">{esc(a["name"])}</a></h3><p>Browse nearby places and find upcoming activities.</p></article>')
index='<h1>Explore Nottingham neighbourhoods</h1><p>Find groups, playgrounds, indoor activities and outings around a place you know. Each area page draws from the same activity catalogue.</p><div class="grid">'+''.join(links)+'</div>'
(out/"index.html").write_text(page("Explore Nottingham neighbourhoods",index,"https://calliedays.digitalhm.uk/areas/"))
print(f"Generated {len(AREAS)} neighbourhood pages plus index")
