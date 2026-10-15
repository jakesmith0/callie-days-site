#!/usr/bin/env python3
"""One-off addition of council/organiser verified broader Nottingham venues (2026-10-14)."""
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
path=root/"data/activities.json";data=json.loads(path.read_text())
centres={a["name"]:(a["lat"],a["lng"]) for a in json.loads((root/"data/areas.json").read_text())["areas"]}
# Only include facilities explicitly supported by organiser/council pages; opening should still be checked.
new=[
('place-81','Gedling Country Park','Gedling','nature',['nature','play'],5,
 'A large former colliery country park with views, wildlife, picnic spaces and an adventure playground including a mining-tower slide.',
 'An impressive park for adventurous little ones, with a mining-tower slide, trails and a café.',
 'https://www.gedling.gov.uk/invest-gedling/parks-and-open-spaces','free','Check car park opening hours, which change seasonally.'),
('place-82','Arnot Hill Park','Arnold','nature',['nature','play'],4,
 'A Green Flag park in Arnold with a play area, lake, café, rose gardens and sculptures.',
 'Play, a lake, gardens and a café in central Arnold — handy for a shorter outing.',
 'https://www.gedling.gov.uk/leisure-culture-and-parks/parks-and-green-spaces/arnot-hill-park','free','The main public car park is pay-and-display; up to two hours free requires a displayed ticket.'),
('place-83','Breck Hill Park','Mapperley','nature',['play','nature'],3,
 'Green Flag park near Woodthorpe with a refurbished play area, open fields and a community orchard.',
 'A refurbished playground and a community orchard make this a useful north Nottingham outdoor option.',
 'https://www.gedling.gov.uk/invest-gedling/parks-and-open-spaces','free',None),
('place-84','Burton Road Jubilee Park','Carlton','nature',['play','nature'],3,
 'A Carlton recreation ground with a play area, nature trail, open space and sports facilities.',
 'Playground, nature trail and room to explore in Carlton.',
 'https://www.gedling.gov.uk/invest-gedling/parks-and-open-spaces','free',None),
('place-85','Bestwood Country Park','Bestwood','nature',['nature','play'],4,
 'A large country park on Nottingham’s northern edge with green space, walks and a council-listed play area.',
 'Country park walks and green space close to Bestwood; a good alternative to another ordinary playground.',
 'https://www.gedling.gov.uk/leisure-culture-and-parks/parks-and-green-spaces/find-park','free','The park is extensive; choose an appropriate entrance before setting off.'),
('place-86','Bulwell Forest Garden','Bulwell','nature',['nature','group'],5,
 'A community garden in Bulwell with food growing, wildlife and environmental play for families, plus special family activity sessions.',
 'Friendly community garden with growing, nature play and occasional family sessions.',
 'https://www.bulwellforestgarden.co.uk/','unknown','General visiting hours are published, but family activities have separate dates and may need booking.'),
('place-87','Titchfield Park, Hucknall','Hucknall','nature',['play'],3,
 'A public park in Hucknall with a children’s play area, other recreation facilities and open green space.',
 'Play equipment and green space in central Hucknall for an easy nearby outing.',
 'https://www.ashfield.gov.uk/leisure/outdoor-recreation-and-sports-facilities/','free',None),
('place-88','Bramcote Hills Park','Bramcote','nature',['play','nature'],4,
 'A wooded Broxtowe park with a play area, walled garden, a maze and local nature reserve.',
 'Woodland, a maze and a playground make this more varied than a simple play park.',
 'https://www.broxtowe.gov.uk/for-you/parks-and-nature-conservation/parks-and-open-spaces/parks-and-open-spaces-near-me/','free',None),
('place-89','Broadgate Park, Beeston','Beeston','nature',['play'],2,
 'A Beeston neighbourhood park with play space, accessible low equipment and a sand/rubber play surface.',
 'Accessible low play equipment and sand play for a quick Beeston outing.',
 'https://www.broxtowe.gov.uk/for-you/parks-and-nature-conservation/parks-and-open-spaces/parks-and-open-spaces-near-me/','free',None),
('place-90','Dovecote Lane Recreation Ground','Beeston','nature',['play'],2,
 'A Beeston park with toddler play equipment, ornamental gardens and a bandstand.',
 'Toddler play equipment and gardens near the centre of Beeston.',
 'https://www.broxtowe.gov.uk/for-you/parks-and-nature-conservation/parks-and-open-spaces/parks-and-open-spaces-near-me/','free',None),
('place-91','Papplewick Pumping Station','Hucknall','transport',['culture','transport'],4,
 'Victorian pumping station and grounds, open Wednesdays and Sundays 11am–3pm during April–October, plus advertised steam weekends.',
 'Explore impressive Victorian engineering and watch for family-friendly steam events.',
 'https://papplewickpumpingstation.org.uk/visitor-information/','priced','Grounds free on normal open days; engine/boiler house admission charge. Seasonal access only; special events have different arrangements.')
]
existing={p["id"] for p in data["entries"]}
for pid,title,area,group,cat,rank,desc,summary,source,price,caution in new:
 if pid in existing:continue
 lat,lng=centres.get(area,centres["Hucknall"])
 item={"id":pid,"title":title,"description":desc,"summary":summary,"category":cat,"kind":"place","area":area,
 "tier":"nearby","locationGroup":group,"mapPoint":{"lat":lat,"lng":lng,"precision":"area"},
 "source":source,"price":price,"caution":caution,"archived":False,"lastChecked":"2026-10-14","editorialPriority":rank}
 if pid=="place-91":item.update({"publishedWeekdays":[0,3],"seasonMonths":[4,5,6,7,8,9,10]})
 data["entries"].append(item)
path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n")
print('Activities now',len(data['entries']),'added',len(new))
