/* Callie Days v3 — location-aware, parent-first, static & public-safe */
"use strict";
const $=id=>document.getElementById(id);
const svgPaths={
group:'<path d="M8 23v-12l17-4v15"/><path d="M25 13l-17 4"/><circle cx="5" cy="26" r="4"/><circle cx="22" cy="25" r="4"/>',
play:'<path d="M7 28V11h21M9 11l9 8m0 0-9 9M18 19h14M28 11v17"/><path d="M4 28h31"/>',
nature:'<path d="M20 33V13m0 15-10-8m10 3 10-10"/><path d="M20 8c-16-12-24 8-14 14M20 8c16-12 24 8 14 14M5 34h30"/>',
animals:'<path d="M5 24c-1-9 5-15 15-15s16 6 15 15l-5 8H10z"/><circle cx="13" cy="22" r="1.5" fill="currentColor"/><circle cx="27" cy="22" r="1.5" fill="currentColor"/><path d="M11 10l-5-6m23 6 5-6M16 28l4 3 4-3"/>',
transport:'<rect x="9" y="5" width="22" height="25" rx="5"/><path d="M9 18h22M12 33l4-4m12 4-4-4M9 13h22"/><circle cx="15" cy="24" r="2"/><circle cx="25" cy="24" r="2"/>',
culture:'<path d="M3 13l17-9 17 9M5 33h30M8 15v16m8-16v16m8-16v16m8-16v16M3 36h34"/>',
seasonal:'<path d="M20 6v8m-6-3c-11-9-16 7-8 12m28 0c8-5 3-21-8-12M20 13c-21-14-24 8-13 18s18 10 26 0 8-32-13-18z"/><path d="M13 24h2m11 0h2m-14 6q6 4 12 0"/>'
};
const icon=(type,size=64)=>'<svg width="'+size+'" height="'+size+'" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(svgPaths[type]||svgPaths.nature)+'</svg>';
const colors={group:"#e8efe4",play:"#f7e6ce",nature:"#e6edda",animals:"#f4e6d4",transport:"#dce9e8",culture:"#e8e7ef",seasonal:"#f5e5d5"};
const WEEK=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const STORAGE_AREA="calliedays:preferred-area:v1",STORAGE_SAVED="calliedays:favourites:v1";
const esc=v=>String(v??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
const validLink=x=>typeof x==="string"&&/^https:\/\//.test(x)?x:"";
const isoUK=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const clockUK=()=>new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date());
const asDate=s=>new Date(s+"T12:00:00Z"),isoDate=d=>d.toISOString().slice(0,10);
const addDays=(s,n)=>{const d=asDate(s);d.setUTCDate(d.getUTCDate()+n);return isoDate(d)};
const longDate=s=>new Intl.DateTimeFormat("en-GB",{weekday:"short",day:"numeric",month:"short",timeZone:"UTC"}).format(asDate(s));
const dateLabel=s=>new Intl.DateTimeFormat("en-GB",{weekday:"long",day:"numeric",month:"long",timeZone:"UTC"}).format(asDate(s));
const roundTime=t=>t?String(t).replace(/^0/,""):"Time to check";
const timeLabel=e=>e.time?roundTime(e.time)+(e.end?"–"+roundTime(e.end):""):"Time to confirm";
const weekdays=d=>asDate(d).getUTCDay();
const nextWeekday=(target,includeToday=false)=>{
 const delta=(target-weekdays(isoUK())+7)%7;
 return addDays(isoUK(),delta===0&&!includeToday?7:delta);
};
const nextPlanningDay=()=>nextWeekday(6,weekdays(isoUK())===6&&!afterHours());
// Conservative public school holiday exclusions for explicitly term-time sessions.
// Individual organisers can differ; known dated overrides win when supported by evidence.
const SCHOOL_HOLIDAYS=[
 ["2026-10-19","2026-10-30"],
 ["2026-12-19","2027-01-03"],
 ["2027-02-15","2027-02-19"],
 ["2027-03-26","2027-04-11"],
 ["2027-05-29","2027-06-06"]
];
const isSchoolHoliday=day=>SCHOOL_HOLIDAYS.some(([a,b])=>day>=a&&day<=b);
// Never turn an observed weekly *pattern* into a guaranteed event years later.
// The fixed window is based on the source's real lastChecked date, not today's date.
// A research update may extend it by actually checking the organiser again.
const weeklyProjectionEnd=e=>{
 const p=getPlace(e.placeId);
 const last=e.lastChecked||p?.lastChecked;
 return last&&/^\d{4}-\d{2}-\d{2}$/.test(last)?addDays(last,42):null;
};

const afterHours=()=>Number(clockUK().slice(0,2))>=18;
const app={areas:[],places:[],events:[],origin:null,area:"",mode:"now",date:afterHours()?addDays(isoUK(),1):isoUK(),saved:new Set(),query:"",category:"",range:"all",free:false,offset:6,seed:0,opened:{},dismissed:new Set(),items:[],map:null,markerLayer:null};
try{const x=JSON.parse(localStorage.getItem("calliedays:recently-opened:v1")||"{}");if(x&&typeof x==="object"&&!Array.isArray(x))app.opened=x}catch{}
const fromURL=new URLSearchParams(location.search);
const startingDate=fromURL.get("date");
const dateWasPast=Boolean(startingDate&&/^\d{4}-\d{2}-\d{2}$/.test(startingDate)&&startingDate<isoUK());
if(startingDate&&/^\d{4}-\d{2}-\d{2}$/.test(startingDate)&&!isNaN(asDate(startingDate))){
 app.date=dateWasPast?nextPlanningDay():startingDate;app.mode="plan";
}
const areaFromPath=()=>{const m=location.pathname.match(/^\/areas\/([a-z0-9-]+)\/?/);return m?.[1]||""};
const storedArea=()=>{try{return localStorage.getItem(STORAGE_AREA)||""}catch{return ""}};
try{const s=JSON.parse(localStorage.getItem(STORAGE_SAVED)||"[]");if(Array.isArray(s))app.saved=new Set(s.filter(x=>typeof x==="string"))}catch{}
const notify=msg=>{const n=$("toast");n.textContent=msg;n.classList.add("show");setTimeout(()=>n.classList.remove("show"),3000)};
const deg=Math.PI/180;
const distance=(a,b)=>{if(!a||!b)return null;const d1=(b[0]-a[0])*deg,d2=(b[1]-a[1])*deg;const v=Math.sin(d1/2)**2+Math.cos(a[0]*deg)*Math.cos(b[0]*deg)*Math.sin(d2/2)**2;return 12742*Math.asin(Math.sqrt(v))};
// An unknown origin still needs sensible Nottingham-wide ordering; this is ranking only.
const NOTTINGHAM_CENTRE=[52.954,-1.148];
const distanceTo=p=>app.origin&&p.mapPoint?distance(app.origin,[p.mapPoint.lat,p.mapPoint.lng]):null;
const rankingDistance=p=>p.mapPoint?distance(app.origin||NOTTINGHAM_CENTRE,[p.mapPoint.lat,p.mapPoint.lng]):null;
const distanceText=p=>{
 const n=distanceTo(p);
 if(n===null)return p.mapPoint?.precision==="venue"?"Location recorded":"Area location only";
 if(p.mapPoint?.precision!=="venue")return "Area location approx.";
 return n<1?"Less than 1 km direct":"~"+Math.round(n)+" km direct";
};
function occurrence(e,day){
 const over=(e.exceptions||{})[day]||{};
 if((e.excludedDates||[]).includes(day)&&over.added!==true)return null;
 let yes=false;
 if(["once","custom"].includes(e.recurrence))yes=(e.dates||[]).includes(day);
 else if(e.recurrence==="range")yes=day>=e.from&&day<=e.to&&(!e.allowedWeekdays||e.allowedWeekdays.includes(weekdays(day)));
 else if(e.recurrence==="weekly"){
  const limit=weeklyProjectionEnd(e);
  yes=Boolean(limit&&day<=limit)&&weekdays(day)===e.weekday&&(!e.startsOn||day>=e.startsOn)&&(!e.endsOn||day<=e.endsOn);
 }
 if(over.added===true)yes=true;
 if(e.termTime===true&&isSchoolHoliday(day)&&!over.added&&!e.confirmedHolidayDates?.includes(day))yes=false;
 if(!yes)return null;
 return {...e,...over,day,status:over.status||e.status||"scheduled"};
}
const inactive=o=>["cancelled","postponed","sold_out"].includes(o.status);
const scheduleLine=e=>{
 let line="";
 if(e.recurrence==="weekly")line="Every "+WEEK[e.weekday]+(e.time?" · "+timeLabel(e):"");
 else if(e.recurrence==="range")line=longDate(e.from)+(e.to!==e.from?" – "+longDate(e.to):"")+(e.time?" · "+timeLabel(e):"");
 else if((e.dates||[]).length===1)line=longDate(e.dates[0])+(e.time?" · "+timeLabel(e):"");
 else if((e.dates||[]).length>1)line="Selected dates"+(e.time?" · "+timeLabel(e):"");
 else line="Dates to check";
 if(e.termTime)line+=" · Term time (check holidays)";
 if(e.recurrence==="weekly"&&weeklyProjectionEnd(e))line+=" · Upcoming dates need checking";
 if(e.recurrence==="weekly"&&(e.startsOn||e.endsOn))line+=" · "+(e.startsOn?longDate(e.startsOn):"")+(e.endsOn?" to "+longDate(e.endsOn):"");
 return line;
};
const getPlace=id=>app.places.find(p=>p.id===id);
const knownFuture=e=>{for(let i=0;i<45;i++){const d=addDays(isoUK(),i),o=occurrence(e,d);if(o&&!inactive(o))return o}return null};
const plainSummary=p=>p.summary||p.description||"Check the organiser for more details.";
const exclusion=p=>p.archived||((p.minimumAgeMonths||0)>60)||["place-46","place-53"].includes(p.id);
const seasonalIds=new Set(["place-60","place-61","place-75","place-76"]);
const eventOnlyIds=new Set(["place-79"]);
function venueCandidateForDay(p){
 if(p.seasonMonths&&!p.seasonMonths.includes(Number(app.date.slice(5,7))))return false;
 if(p.publishedWeekdays&&!p.publishedWeekdays.includes(weekdays(app.date)))return false;
 if(eventOnlyIds.has(p.id)&&!app.events.some(e=>e.placeId===p.id&&occurrence(e,app.date)))return false;
 if(p.kind==="session"){
  const records=app.events.filter(e=>e.placeId===p.id);
  if(records.length&&!records.some(e=>{
   for(let i=0;i<30;i++)if(occurrence(e,addDays(isoUK(),i)))return true;
   return false;
  }))return false;
 }
 return true;
}
const eventCandidates=(from,days)=>{
 const out=[];
 for(let i=0;i<days;i++){
  const day=addDays(from,i);
  for(const event of app.events){
   const e=occurrence(event,day),p=getPlace(event.placeId);
   if(!e||!p||exclusion(p)||inactive(e))continue;
   if(["now","social"].includes(app.mode)&&day===isoUK()){
    if(e.end&&e.end<clockUK())continue;
    if(!e.time)continue; // Unknown hours cannot qualify for 'go right now'
   }
   if(app.mode==="social"&&!(p.kind==="session"||p.category.includes("group")))continue;
   out.push({kind:"event",p,e,day,dist:distanceTo(p),rankKm:rankingDistance(p)});
  }
 }
 return out;
};
const placesCandidates=()=>{
 return app.places.filter(p=>!exclusion(p)&&p.kind!=="session"&&venueCandidateForDay(p)
 &&(!seasonalIds.has(p.id)||app.events.some(e=>e.placeId===p.id&&occurrence(e,app.date))))
 .filter(p=>app.mode!=="social")
 .map(p=>({kind:"place",p,dist:distanceTo(p),rankKm:rankingDistance(p)}));
};
const identity=c=>c.kind==="event"?"event:"+c.e.id+":"+c.day:"place:"+c.p.id;
const category=c=>c.p.category?.[0]||"nature";
const isUrgent=c=>c.kind==="event"&&c.day===isoUK()&&c.e.time&&c.e.time>=clockUK()&&Number(c.e.time.slice(0,2))*60+Number(c.e.time.slice(3))-((Number(clockUK().slice(0,2))*60)+Number(clockUK().slice(3)))<=180;
const seeded=c=>{let h=0;for(const k of identity(c)+isoUK()+app.seed)h=(h*33+k.charCodeAt(0))%997;return h/997};
const genericPark=p=>/(playground|play area|junior play)/i.test(p.title)&&!(p.editorialPriority>2);
const passiveExhibition=e=>/exhibit|prehistoric lives|gallery|historic exhibition/i.test(e.title||"")&&!/toddler|child|family|creative play|workshop/i.test(e.title||"");
function weight(c){
 const d=c.rankKm;
 let score=d===null?0:Math.max(-60,72-d*3.1);
 if(c.kind==="event"){
  if(c.e.status==="sold_out")return -999;
  score+=c.e.confidence==="dated"?13:8;
  if(passiveExhibition(c.e))score-=app.mode==="now"?48:23;
  if(c.e.recurrence==="range"&&!/family|children|toddler|play|craft|halloween trail/i.test(c.e.title||""))score-=12;
  if(c.e.source==null&&!c.p.source)score-=22;
  score+=isUrgent(c)?25:0;
  if(c.e.termTime&&(!c.e.excludedDates||!c.e.excludedDates.length))score-=9;
  if(!c.e.time)score-=24;
  if(app.mode==="now"&&!isUrgent(c))score-=8;
  if(app.mode==="plan")score+=6;
  if(app.mode==="social"){
   score+=c.p.kind==="session"?39:6;
   const daysUntil=Math.max(0,Math.round((asDate(c.day)-asDate(isoUK()))/86400000));
   score-=Math.min(30,daysUntil*2.5);
   if(daysUntil<=2)score+=13;
  }
  if(c.day!==app.date)score-=Math.min(16,Math.round((asDate(c.day)-asDate(app.date))/86400000)*1.4);
 }else{
  score+=app.mode==="now"?16:app.mode==="social"?-12:6;
  if(c.p.kind==="journey")score+=1;
  if(c.p.kind==="place"&&c.p.category.includes("culture")&&!(c.p.editorialPriority>2))score-=13;
  if(c.p.category?.includes("play"))score+=3;
 }
 if(!c.p.summary)score-=5;
 score+=(c.p.editorialPriority||0)*6.5;
 if(genericPark(c.p))score-=36;
 if(c.p.kind==="journey")score-=app.mode==="now"?45:23;
 if(!c.p.source&&!c.e?.source)score-=10;
 if(app.opened[c.p.id]&&app.opened[c.p.id]>=addDays(isoUK(),-7))score-=8;
 if(app.dismissed.has(c.p.id))score-=110;
 if(app.mode==="now"&&d!==null&&d>16)score-=55;
 if(app.mode==="social"&&d!==null&&d>20)score-=32;
 return score+seeded(c)*7;
}
function matches(c){
 const p=c.p,e=c.e||{};
 if(app.query&&!([p.title,p.area,p.summary,p.description,e.title].join(" ").toLowerCase().includes(app.query)))return false;
 if(app.category&&!p.category.includes(app.category))return false;
 if(app.free&&p.price!=="free")return false;
 if(app.origin&&c.dist!==null&&app.range!=="all"&&c.dist>(app.range==="near"?15:30))return false;
 return true;
}
function pickDiverse(items){
 const sorted=items.sort((a,b)=>weight(b)-weight(a));
 const usedPlaces=new Set(),usedCategories=new Map(),result=[];
 // First pass favors varied categories and one event per place.
 for(const c of sorted){
  if(usedPlaces.has(c.p.id))continue;
  if(result.length<6&&(usedCategories.get(category(c))||0)>=2)continue;
  result.push(c);usedPlaces.add(c.p.id);usedCategories.set(category(c),(usedCategories.get(category(c))||0)+1);
 }
 for(const c of sorted)if(!result.some(x=>identity(x)===identity(c))&&!usedPlaces.has(c.p.id)){result.push(c);usedPlaces.add(c.p.id)}
 return result;
}
function results(){
 const horizon=app.mode==="now"?1:app.mode==="social"?14:1;
 let candidates=eventCandidates(app.date,horizon).concat(placesCandidates()).filter(matches);
 // When no locality context, use diverse Nottingham-wide results.
 if(app.mode==="now"&&app.origin){
  let local=candidates.filter(c=>c.rankKm===null||c.rankKm<=22);
  if(local.length>=3)candidates=local;
 }
 app.items=pickDiverse(candidates);
}
const metaFor=c=>{
 const p=c.p,meta=[];
 if(c.kind==="event"){
  meta.push(c.day===isoUK()?"Today · "+timeLabel(c.e):longDate(c.day)+" · "+timeLabel(c.e));
  if(c.e.termTime)meta.push("Term-time schedule");
 }else{
  meta.push("Check opening times");
 }
 if(p.price==="free")meta.push("Free");
 else if(p.price==="priced")meta.push("Check admission");
 return meta;
};
const pictogram=(p,key,title)=>'<button type="button" class="card-art'+(p.photo?" has-photo":"")+'" style="--art:'+colors[category({p})]+'" data-details="'+esc(key)+'" aria-label="View '+esc(title)+' details">'+(p.photo?'<img loading="lazy" class="venue-photo" src="'+esc(p.photo)+'" alt="">':icon(category({p})))+'</button>';
function card(c){
 const p=c.p,ev=c.e;
 const title=ev?ev.title:p.title;
 const eyebrow=ev&&ev.title!==p.title?p.title+" · "+p.area:p.area;
 const text=(ev?.note&&ev.note.length>35?ev.note:plainSummary(p));
 const label=c.kind==="event"?(ev.recurrence==="weekly"?"Regular session · Check dates":"Scheduled event"):(p.kind==="journey"?"Travel experience":"Place to explore");
 return '<article class="result-card" data-result="'+esc(identity(c))+'">'+pictogram(p,identity(c),title)+
 '<div class="card-main"><div class="card-topline">'+esc(eyebrow)+(app.origin?' · '+esc(distanceText(p)):'')+'</div>'+
 '<h3><button type="button" data-details="'+esc(identity(c))+'">'+esc(title)+'</button></h3>'+
 '<p class="card-summary">'+esc(text)+'</p>'+
 '<div class="card-meta">'+metaFor(c).map((x,i)=>'<span'+(i===0?' class="important"':'')+'>'+esc(x)+'</span>').join("")+'</div>'+
 '<div class="card-bottom"><span class="reassurance">'+esc(label)+'</span><button class="save-button" type="button" aria-label="'+(app.saved.has(p.id)?"Remove saved":"Save")+" "+esc(p.title)+'" aria-pressed="'+app.saved.has(p.id)+'" data-save="'+esc(p.id)+'">'+(app.saved.has(p.id)?"♥":"♡")+'</button></div></div></article>';
}
function render(){
 results();
 const nearbyAreas=[...app.areas].sort((a,b)=>app.origin?(distance(app.origin,[a.lat,a.lng])-distance(app.origin,[b.lat,b.lng])):0);
 $("areaLinks").innerHTML=nearbyAreas.slice(0,document.body.classList.contains("area-directory")?app.areas.length:10).map(a=>'<a href="/areas/'+esc(a.slug)+'/">'+esc(a.name)+'</a>').join("");
 const text=app.mode==="social"?"Meet other families":app.mode==="plan"?"Ideas for "+longDate(app.date):afterHours()?"Ideas to check for tomorrow":"Ideas to check for today";
 $("resultsTitle").textContent=text;
 $("resultsKicker").textContent=app.mode==="social"?"GROUPS & OTHER LITTLE PEOPLE":app.mode==="plan"?"PLAN AN OUTING":"RECOMMENDED FOR YOUR AREA";
 $("resultsSubtitle").textContent=app.mode==="now"
 ?(afterHours()?"It's evening, so these are tomorrow's possibilities. Check opening before going.":"Nearby possibilities, not live opening or booking availability. Please check before going.")
 :(app.area?"Around "+app.area+" · "+app.items.length+" ideas to explore":app.origin?"Around your location · "+app.items.length+" ideas to explore":"Around Nottingham · "+app.items.length+" ideas to explore");
 const visible=app.items.slice(0,app.offset);
 $("resultsCards").innerHTML=visible.map(card).join("");
 $("resultEmpty").hidden=app.items.length>0;
 $("moreBtn").hidden=app.items.length<=app.offset;
 $("moreBtn").textContent="More ideas ("+(app.items.length-visible.length)+" remaining) ↓";
 $("dateInput").value=app.date;
 $("dateInput").min=isoUK();
 $("dateField").hidden=app.mode==="now";
 $("quickDates").hidden=app.mode!=="plan";
 document.querySelectorAll("[data-journey]").forEach(b=>{const on=b.dataset.journey===app.mode;b.classList.toggle("selected",on);b.setAttribute("aria-pressed",String(on))});
 $("savedNumber").textContent=app.saved.size?String(app.saved.size):"";
 if(app.map&&!$("mapPanel").hidden)renderMap();
}
function locationUpdate(){
 $("locationLabel").textContent=app.area|| (app.origin?"Your current area":"Nottingham and nearby");
 $("locationApprox").textContent=app.origin?"Based on approximate distances; venue locations still being refined":"Set a location for nearby suggestions";
 $("changeLocation").textContent=app.origin?"Change →":"Set location →";
 $("areaInput").value=app.area||"";
 $("introText").textContent=app.area?"The good stuff for little ones around "+app.area+" — groups, places to play and days out.":"Activities, places and people to meet around Nottingham. For babies, toddlers and preschoolers.";
 $("locationPicker").hidden=Boolean(app.origin);
 $("locationBlock").classList.toggle("needs-location",!app.origin);
}
function chooseArea(name,persist=true){
 const a=app.areas.find(a=>a.name===name);
 app.area=a?.name||"";app.origin=a?[a.lat,a.lng]:null;app.dismissed.clear();
 if(persist)try{localStorage.setItem(STORAGE_AREA,app.area||"__nottingham__")}catch{}
 $("locationStatus").textContent="";
 app.offset=6;locationUpdate();
 if(app.origin)$("distanceStatus").textContent="";
 render();
}
function setCoordinates(lat,lng,label){
 app.origin=[lat,lng];
 const near=app.areas.map(a=>({a,km:distance([lat,lng],[a.lat,a.lng])})).sort((a,b)=>a.km-b.km)[0];
 app.area=label||(near&&near.km<=10?near.a.name:"");
 app.offset=6;app.dismissed.clear();
 try{localStorage.removeItem(STORAGE_AREA)}catch{}
 locationUpdate();if(app.origin)$("distanceStatus").textContent="";render();
}
function locationFailure(error){
 const code=error?.code||0;
 $("locationStatus").textContent=code===1?"Location permission is blocked. Choose a town or enter a postcode instead.":code===3?"Location timed out. Try again, or choose an area instead.":"We couldn't determine your location. Choose an area or enter a postcode instead.";
 $("locationPicker").hidden=false;
 $("detectLocation").disabled=false;$("detectLocation").textContent="⌖  Try my location again";
}
function geolocate(automatic=false){
 if(!navigator.geolocation){locationFailure({code:0});return}
 const b=$("detectLocation");
 b.disabled=true;b.textContent="Locating…";
 $("locationStatus").textContent="Checking your location…";
 navigator.geolocation.getCurrentPosition(pos=>{
  b.disabled=false;b.textContent="⌖  Use my location";
  setCoordinates(pos.coords.latitude,pos.coords.longitude,"");
  $("locationStatus").textContent="Location found. Nearby activities are now prioritised.";
 },locationFailure,{enableHighAccuracy:false,timeout:11000,maximumAge:300000});
}
async function detectPermission(){
 if(app.origin||!navigator.permissions?.query)return;
 try{const permission=await navigator.permissions.query({name:"geolocation"});if(permission.state==="granted")geolocate(true)}catch{}
}
function changeMode(mode){
 const previous=app.mode;
 app.mode=mode;app.offset=6;
 if(mode==="now")app.date=afterHours()?addDays(isoUK(),1):isoUK();
 if(mode==="plan"&&(previous!=="plan"||app.date<isoUK()))app.date=nextPlanningDay();
 if(mode==="social")app.date=isoUK();
 render();
}
function shareURL(){
 const u=new URL(location.href);
 if(app.area)u.searchParams.set("area",app.area);else u.searchParams.delete("area");
 if(app.mode==="plan")u.searchParams.set("date",app.date);else u.searchParams.delete("date");
 history.replaceState(null,"",u.pathname+u.search);
}
function scheduleFacts(p){
 const related=app.events.filter(e=>e.placeId===p.id);
 const unique=new Map();
 for(const e of related){
  const key=e.recurrence==="weekly"?[e.weekday,e.time,e.title].join("|"):e.id;
  unique.set(key,e);
 }
 return [...unique.values()].sort((a,b)=>(a.recurrence==="weekly"?0:1)-(b.recurrence==="weekly"?0:1)).slice(0,7);
}
function fact(title,value){return '<div class="fact"><strong>'+esc(title)+'</strong><span>'+esc(value)+'</span></div>'}
function detail(c){
 const p=c.p,e=c.e,source=validLink(e?.source)||validLink(p.source);
 app.opened[p.id]=isoUK();try{localStorage.setItem("calliedays:recently-opened:v1",JSON.stringify(app.opened))}catch{}
 const when=e?(c.day?dateLabel(c.day)+" · "+timeLabel(e):scheduleLine(e)):
 (p.kind==="journey"?"Flexible idea — check services":scheduleFacts(p).length?"See regular sessions below":"Opening varies — check before travelling");
 const age=p.minimumAgeMonths?Math.floor(p.minimumAgeMonths/12)+"+ years":"Suitability details not confirmed";
 const price=p.price==="free"?"Free (check conditions)":p.price==="priced"?"Admission or session charge":"See organiser";
 const dir=p.kind==="journey"?"":"https://www.google.com/maps/dir/?api=1&destination="+encodeURIComponent((p.address||p.title)+", "+p.area+", UK");
 const hasSchedule=!e&&scheduleFacts(p).length;
 const caution=e?.termTime?"Usually term time. Confirm school holidays, this date and any changes with the organiser.":e?.status==="sold_out"?"This session is currently listed as fully booked.":p.caution||"";
 const sourceText=e?.source?"Check event details":p.source?"Check venue details":"";
 $("detailBody").innerHTML= '<div class="detail-cover'+(p.photo?" photo":"")+'" style="--art:'+colors[category(c)]+'">'+(p.photo?'<img class="detail-photo" src="'+esc(p.photo)+'" alt="Photo of '+esc(p.title)+'">':icon(category(c)))+'</div>'+
 '<div class="detail-content"><p class="eyebrow">'+esc(e?"ACTIVITY · "+p.area:"PLACE · "+p.area)+'</p>'+
 '<h2>'+esc(e?e.title:p.title)+'</h2><p class="lead">'+esc(e?.note||plainSummary(p))+'</p>'+
  '<div class="detail-facts">'+fact("WHERE",p.kind==="journey"?"Choose a route around "+p.area:p.title+", "+p.area)+fact("WHEN",when)+fact("PRICE",price)+fact("AGE",age)+'</div>'+
 (caution?'<p class="detail-notice"><strong>Worth checking:</strong> '+esc(caution)+'</p>':"")+
 '<div class="detail-actions">'+(source?'<a class="primary" href="'+esc(source)+'" rel="noopener noreferrer" target="_blank">'+esc(sourceText)+' ↗</a>':"")+
  (dir?'<a href="'+esc(dir)+'" target="_blank" rel="noopener noreferrer">Directions ↗</a>':"")+
 '<button type="button" id="detailSave" data-save="'+esc(p.id)+'">'+(app.saved.has(p.id)?"♥ Saved":"♡ Save idea")+'</button></div>'+
 (e&&e.recurrence==="weekly"?'<section class="detail-schedule"><h3>Regular schedule</h3><p>'+esc(scheduleLine(e))+'</p></section>':"")+
 (hasSchedule?'<section class="detail-schedule"><h3>Regular activities here</h3>'+scheduleFacts(p).map(x=>'<p><strong>'+esc(x.title)+'</strong> — '+esc(scheduleLine(x))+'</p>').join("")+'</section>':"")+
 (p.photoCredit?'<p class="detail-secondary">Photo: '+esc(p.photoCredit.author)+' · '+esc(p.photoCredit.license)+' · <a target="_blank" rel="noopener noreferrer" href="'+esc(validLink(p.photoCredit.source))+'">Image and licensing information</a></p>':"")+
 '<p class="detail-secondary">We use organiser listings and approximate locations. This is not a live opening-hours or booking-availability service. Source last catalogued: '+esc(p.lastChecked||"unknown")+'.</p></div>';
 $("detailDialog").showModal();
}
function toggleSaved(id){if(app.saved.has(id))app.saved.delete(id);else app.saved.add(id);try{localStorage.setItem(STORAGE_SAVED,JSON.stringify([...app.saved]))}catch{}render();notify(app.saved.has(id)?"Saved for later":"Removed from saved")}
function openSaved(){
 $("savedCards").innerHTML=app.saved.size?[...app.saved].map(id=>{const p=getPlace(id);return p?'<button type="button" data-place="'+esc(id)+'">'+esc(p.title)+' · '+esc(p.area)+' →</button>':""}).join(""):'<p>No saved ideas yet. Tap the heart on a result to keep it here.</p>';
 $("savedDialog").showModal();
}
function renderMap(){
 if(!window.L)return;
 if(!app.map){
  app.map=L.map("map",{scrollWheelZoom:false}).setView([52.954,-1.147],10);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(app.map);
 }
 if(app.markerLayer)app.map.removeLayer(app.markerLayer);
 app.markerLayer=L.markerClusterGroup();
 for(const c of app.items.slice(0,55)){
  const p=c.p;if(!p.mapPoint)continue;
  const mk=L.marker([p.mapPoint.lat,p.mapPoint.lng]);
  const el=document.createElement("div");
  const strong=document.createElement("strong");strong.textContent=c.e?.title||p.title;
  const para=document.createElement("p");para.textContent=p.area+" · approximate location";
  const btn=document.createElement("button");btn.textContent="Details";btn.addEventListener("click",()=>detail(c));
  el.append(strong,para,btn);mk.bindPopup(el);app.markerLayer.addLayer(mk);
 }
 app.map.addLayer(app.markerLayer);
 if(app.markerLayer.getLayers().length)app.map.fitBounds(app.markerLayer.getBounds(),{padding:[25,25],maxZoom:11});
 setTimeout(()=>app.map.invalidateSize(),70);
}
function wire(){
 document.addEventListener("click",ev=>{
  const mode=ev.target.closest("[data-journey]");if(mode){changeMode(mode.dataset.journey);return}
  const d=ev.target.closest("[data-details]");if(d){const c=app.items.find(i=>identity(i)===d.dataset.details);if(c)detail(c);return}
  // The card surface is a generous touch target; explicit buttons remain keyboard reachable.
  if(!ev.target.closest("button,a,input,select")){
   const surface=ev.target.closest(".result-card");
   if(surface){const c=app.items.find(i=>identity(i)===surface.dataset.result);if(c)detail(c);return}
  }
  const save=ev.target.closest("[data-save]");if(save){toggleSaved(save.dataset.save);return}
  const place=ev.target.closest("[data-place]");if(place){$("savedDialog").close();const p=getPlace(place.dataset.place);if(p)detail({kind:"place",p});return}
 });
 $("changeLocation").addEventListener("click",()=>{$("locationPicker").hidden=!$("locationPicker").hidden;if(!$("locationPicker").hidden)$("detectLocation").focus()});
 $("postcodeToggle").addEventListener("click",()=>{$("postcodeForm").hidden=!$("postcodeForm").hidden;if(!$("postcodeForm").hidden)$("postcodeInput").focus()});
 $("detectLocation").addEventListener("click",()=>geolocate());
 $("areaInput").addEventListener("change",ev=>{chooseArea(ev.target.value);shareURL()});
 $("postcodeForm").addEventListener("submit",async ev=>{
  ev.preventDefault();const p=$("postcodeInput").value.trim().toUpperCase();
  if(!/^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/.test(p)){$("locationStatus").textContent="Please enter a full UK postcode.";return}
  $("locationStatus").textContent="Looking up postcode…";
  try{const response=await fetch("https://api.postcodes.io/postcodes/"+encodeURIComponent(p));if(!response.ok)throw Error("Postcode not found");
   const j=await response.json();if(!j.result||!Number.isFinite(j.result.latitude))throw Error("Postcode not found");
   setCoordinates(j.result.latitude,j.result.longitude,"");$("locationStatus").textContent="Using "+p+" as your approximate centre.";
  }catch(error){$("locationStatus").textContent="We couldn't find that postcode. Try a nearby town instead."}
 });
 $("searchInput").addEventListener("input",ev=>{app.query=ev.target.value.trim().toLowerCase();app.offset=6;render()});
 $("dateInput").addEventListener("change",ev=>{
  if(!ev.target.value)return;
  if(ev.target.value<isoUK()){
   $("dateStatus").hidden=false;
   $("dateStatus").textContent="That date has already passed. Choose today or a future date.";
   ev.target.value=app.date;return;
  }
  $("dateStatus").hidden=true;
  app.date=ev.target.value;app.mode="plan";app.offset=6;render();shareURL();
 });
 document.querySelectorAll("[data-quick-date]").forEach(b=>b.addEventListener("click",()=>{
  const key=b.dataset.quickDate;
  const day=key==="tomorrow"?addDays(isoUK(),1):key==="friday"?nextWeekday(5):key==="week"?addDays(isoUK(),7):nextPlanningDay();
  app.mode="plan";app.date=day;app.offset=6;$("dateStatus").hidden=true;render();shareURL();
 }));
 $("categoryInput").addEventListener("change",ev=>{app.category=ev.target.value;app.offset=6;render()});
 $("rangeInput").addEventListener("change",ev=>{
  app.range=ev.target.value;app.offset=6;
  if(app.range!=="all"&&!app.origin){
   $("distanceStatus").textContent="Choose a town, postcode or share your location to filter by distance.";
   $("locationPicker").hidden=false;
   $("locationStatus").textContent="Choose your area above to activate the distance filter.";
   $("locationBlock").scrollIntoView({behavior:"smooth",block:"center"});
  }else $("distanceStatus").textContent="";
  render();
 });
 $("freeInput").addEventListener("change",ev=>{app.free=ev.target.checked;app.offset=6;render()});
 $("filtersToggle").addEventListener("click",()=>{const e=$("filtersPanel");e.hidden=!e.hidden;$("filtersToggle").setAttribute("aria-expanded",String(!e.hidden))});
 $("differentBtn").addEventListener("click",()=>{app.items.slice(0,5).forEach(c=>app.dismissed.add(c.p.id));app.seed++;app.offset=6;render()});
 $("mapToggle").addEventListener("click",()=>{const e=$("mapPanel");e.hidden=!e.hidden;$("mapToggle").textContent=e.hidden?"Map ↗":"Hide map ×";if(!e.hidden)renderMap()});
 $("moreBtn").addEventListener("click",()=>{app.offset+=6;render()});
 $("savedNav").addEventListener("click",openSaved);
 $("savedClose").addEventListener("click",()=>$("savedDialog").close());
 $("detailClose").addEventListener("click",()=>$("detailDialog").close());
 for(const dialog of [$("detailDialog"),$("savedDialog")])dialog.addEventListener("click",ev=>{if(ev.target===dialog)dialog.close()});
}
async function initialize(){
 wire();
 try{
  const [places,events,areas]=await Promise.all(["data/activities.json","data/events.json","data/areas.json"].map(p=>fetch("./"+p,{cache:"no-cache"}).then(r=>{if(!r.ok)throw Error(p+" couldn't load");return r.json()})));
  app.places=places.entries;app.events=events.events;app.areas=areas.areas;
  $("areaInput").innerHTML='<option value="">All Nottingham</option>'+app.areas.map(a=>'<option value="'+esc(a.name)+'">'+esc(a.name)+'</option>').join("");
  $("areaLinks").innerHTML=app.areas.slice(0,9).map(a=>'<a href="/areas/'+esc(a.slug)+'/">'+esc(a.name)+'</a>').join("");
  const pathArea=app.areas.find(a=>a.slug===areaFromPath()),queryArea=fromURL.get("area");
  const isAreaDirectory=location.pathname.replace(/\/$/,"")==="/areas";
  if(isAreaDirectory){
   document.body.classList.add("area-directory");
   $("main").insertBefore(document.querySelector(".explore-strip"),$("locationBlock"));
   document.querySelector(".explore-strip h2").textContent="Choose a neighbourhood";
   document.querySelector(".explore-strip .all-areas-link").hidden=true;
  }
  const chosen=pathArea?.name||queryArea||storedArea();
  if(chosen==="__nottingham__")chooseArea("",false);
  else if(chosen&&app.areas.some(a=>a.name===chosen))chooseArea(chosen,false);
  else{locationUpdate();render()}
  if(dateWasPast){$("dateStatus").hidden=false;$("dateStatus").textContent="That date has passed. Showing upcoming ideas instead.";}
  if(pathArea){
   $("heroTitle").textContent="Things to do near "+pathArea.name;
   document.title="Things to do near "+pathArea.name+" with under-fives | Callie Days";
   $("locationPicker").hidden=true;
  }else if(location.pathname.replace(/\/$/,"")==="/areas"){
   $("heroTitle").textContent="Explore Nottingham, one neighbourhood at a time.";
   $("locationPicker").hidden=false;
   document.title="Explore Nottingham neighbourhoods | Callie Days";
  }
  // Do not override an explicitly chosen neighbourhood with browser geolocation.
  if(!chosen)detectPermission();
 }catch(err){$("resultsCards").innerHTML='<p class="empty">Sorry, the activity catalogue failed to load. Refresh to try again.</p>';console.error(err)}
}
initialize();
