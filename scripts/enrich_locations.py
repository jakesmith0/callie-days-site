#!/usr/bin/env python3
"""One-off verified venue-location import. Rate-limited Nominatim usage; skip ambiguous matches."""
import json,urllib.parse,urllib.request,time,math,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]
path=root/"data/activities.json"
d=json.loads(path.read_text())
names={
 "place-1":"West Bridgford Library Nottingham",
 "place-13":"Victoria Embankment Nottingham Memorial Gardens",
 "place-15":"Skylarks Nature Reserve Holme Pierrepont",
 "place-21":"Rushcliffe Country Park Ruddington Nottingham",
 "place-22":"Framework Knitters Museum Ruddington",
 "place-23":"Nottingham Transport Heritage Centre Ruddington",
 "place-26":"Attenborough Nature Reserve Nottingham",
 "place-28":"Highfields Park Nottingham",
 "place-30":"Little Foxes Play Town Beeston",
 "place-31":"Hocus Pocus Soft Play Beeston Nottingham",
 "place-34":"Stonebridge City Farm Nottingham",
 "place-35":"Green's Windmill Nottingham",
 "place-37":"Wollaton Hall Nottingham",
 "place-40":"Fun Valley Netherfield Nottingham",
 "place-43":"Floralands Farm Park Lambley",
 "place-47":"White Post Farm Farnsfield Nottinghamshire",
 "place-49":"Wheelgate Park Farnsfield Nottinghamshire",
 "place-50":"Rufford Abbey Country Park Nottinghamshire",
 "place-51":"Newstead Abbey Nottinghamshire",
 "place-52":"Clumber Park Worksop",
 "place-54":"Sundown Adventureland Retford",
 "place-55":"Twycross Zoo Atherstone",
 "place-56":"Conkers Moira Discovery Centre",
 "place-58":"Great Central Railway Loughborough",
 "place-74":"Crich Tramway Village Derbyshire",
 "place-80":"Beeston Library Nottinghamshire",
}
def distance(a,b):
 r=math.pi/180
 p=(b[0]-a[0])*r; l=(b[1]-a[1])*r
 x=math.sin(p/2)**2+math.cos(a[0]*r)*math.cos(b[0]*r)*math.sin(l/2)**2
 return 12742*math.asin(math.sqrt(x))
logs=[]
for i,(pid,query) in enumerate(names.items()):
 p=next(x for x in d['entries'] if x['id']==pid)
 url="https://nominatim.openstreetmap.org/search?"+urllib.parse.urlencode({'q':query+", UK",'format':'json','limit':4,'addressdetails':1})
 try:
  req=urllib.request.Request(url,headers={'User-Agent':'CallieDaysGuide/1.0 (github.com/jakesmith0/callie-days-site)'})
  results=json.load(urllib.request.urlopen(req,timeout=15))
  original=[p['mapPoint']['lat'],p['mapPoint']['lng']]
  possibles=[]
  for res in results:
   coordinate=(float(res['lat']),float(res['lon']))
   dkm=distance(original,coordinate)
   if dkm>9:continue
   name=res.get('name','').lower()
   short=re.sub(r'\W+',' ',p['title'].lower())
   terms=[t for t in short.split() if len(t)>3 and t not in {'park','area','centre','nottingham','nottinghamshire','country','nature','play'}]
   common=sum(t in name for t in terms)
   if terms and common<1:continue
   possibles.append((common,-dkm,res))
  possibles.sort(reverse=True,key=lambda k:(k[0],k[1]))
  if not possibles:logs.append(f"UNRESOLVED {pid}: {query}, no strong match");continue
  best=possibles[0][2]
  # Keep venue geometry approximate and honest — not a doorway GPS.
  p['mapPoint']={'lat':round(float(best['lat']),6),'lng':round(float(best['lon']),6),'precision':'venue'}
  p['geocodeSource']='OpenStreetMap / Nominatim'
  p['geocodeChecked']='2026-10-14'
  p['geocodeLabel']=best.get('display_name','')
  logs.append(f"ACCEPT {pid}: {query} → {best.get('name')} ({best['lat']},{best['lon']}) [{best['type']}]")
 except Exception as e:
  logs.append(f"ERROR {pid}: {type(e).__name__} {e}")
 time.sleep(1.2)
path.write_text(json.dumps(d,indent=2,ensure_ascii=False)+'\n')
log=root/"docs-location-enrichment-2026-10-14.txt"
log.write_text("\n".join(logs)+'\n')
print("\n".join(logs))
print("Accepted",sum(x.startswith('ACCEPT') for x in logs),"of",len(names))
