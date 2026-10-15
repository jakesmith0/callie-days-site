#!/usr/bin/env python3
"""Generate neighbourhood entrypoints with the same full frontend as the main site."""
from pathlib import Path
from html import escape
import json,re
root=Path(__file__).resolve().parents[1]
src=(root/"index.html").read_text()
areas=json.loads((root/"data/areas.json").read_text())["areas"]
out=root/"areas";out.mkdir(exist_ok=True)
for a in areas:
    d=out/a["slug"];d.mkdir(exist_ok=True)
    title=f"Things to do near {a['name']} with under-fives | Callie Days"
    content=src.replace('<head>','<head>\n  <base href="/">',1)
    content=content.replace('<title>Callie Days — Things to do with under-fives around Nottingham</title>',f'<title>{escape(title)}</title>')
    content=content.replace('href="https://calliedays.digitalhm.uk/"',f'href="https://calliedays.digitalhm.uk/areas/{a["slug"]}/"')
    content=content.replace('content="Discover things to do with babies, toddlers and preschoolers around Nottingham. Local groups, events, play and family days out."',
      f'content="Find activities, toddler groups, play and days out near {escape(a["name"])} for children aged 0–5."')
    (d/"index.html").write_text(content)
contents=src.replace('<head>','<head>\n  <base href="/">',1).replace('href="https://calliedays.digitalhm.uk/"','href="https://calliedays.digitalhm.uk/areas/"')
contents=contents.replace('<title>Callie Days — Things to do with under-fives around Nottingham</title>','<title>Explore Nottingham neighbourhoods | Callie Days</title>')
(out/"index.html").write_text(contents)
print("Built shared frontend for",len(areas),"neighbourhoods")
