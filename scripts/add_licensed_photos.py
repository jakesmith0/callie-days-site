#!/usr/bin/env python3
"""One-off Wikimedia Commons media import, source and licence preserved per activity."""
import json,urllib.request,urllib.parse,html,re,time
from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/"data/activities.json"; j=json.loads(p.read_text())
directory=root/"assets/photos";directory.mkdir(parents=True,exist_ok=True)
filenames={
 'place-26':'File:Attenborough Nature Reserve, Nottingham1.jpg',
 'place-34':'File:Stonebridge City Farm - geograph.org.uk - 7315584.jpg',
 'place-37':'File:At Wollaton Hall 2023 014.jpg',
 'place-50':'File:RuffordAbbey01LB.jpg',
 'place-51':'File:Newstead Abbey (4974019812).jpg',
}
headers={'User-Agent':'CallieDaysGuide/1.0 (github.com/jakesmith0/callie-days-site)'}
for pid,title in filenames.items():
 url='https://commons.wikimedia.org/w/api.php?'+urllib.parse.urlencode({'action':'query','titles':title,'prop':'imageinfo','iiprop':'url|extmetadata','iiurlwidth':'700','format':'json'})
 try:
  response=urllib.request.Request(url,headers=headers)
  raw=json.load(urllib.request.urlopen(response,timeout=15))
  item=next(iter(raw["query"]["pages"].values()))
  info=item["imageinfo"][0]
  metadata=info.get('extmetadata',{})
  lic=html.unescape(re.sub('<[^>]+>',' ',metadata.get('LicenseShortName',{}).get('value',''))).strip()
  if not (lic.startswith("CC BY") or lic.startswith("CC0") or lic.lower().startswith("public domain")):raise ValueError('No supported licence: '+lic)
  author=html.unescape(re.sub('<[^>]+>',' ',metadata.get('Artist',{}).get('value',''))).strip()
  author=' '.join(author.split())[:140] or 'Wikimedia Commons contributor'
  target=directory/(pid+'.jpg')
  asset=urllib.request.Request(info.get('thumburl') or info.get('url'),headers=headers)
  data=urllib.request.urlopen(asset,timeout=20).read()
  if len(data)<10000 or not data.startswith(b'\xff\xd8'):raise ValueError('No valid JPEG thumbnail')
  target.write_bytes(data)
  rec=next(x for x in j["entries"] if x["id"]==pid)
  rec['photo']='/assets/photos/'+target.name
  rec['photoCredit']={'author':author,'license':lic,'source':info.get('descriptionurl','')}
  print('ADDED',pid,target.name,round(len(data)/1024),'KiB',lic,author[:40])
 except Exception as e:print('SKIPPED',pid,type(e).__name__,str(e)[:140])
 time.sleep(.5)
p.write_text(json.dumps(j,indent=2,ensure_ascii=False)+'\n')
print("Total licensed venue photos:",sum(bool(x.get('photo')) for x in j["entries"]))
