/* Callie Days — static, public-safe, zero-account browser app. Edit docs/data/*.json to grow the catalogue. */
"use strict";
const CATEGORIES={group:{label:"Groups & classes",icon:"♫"},play:{label:"Play & movement",icon:"🛝"},nature:{label:"Nature & outdoors",icon:"🌿"},animals:{label:"Animals & farms",icon:"🐑"},transport:{label:"Transport & vehicles",icon:"🚂"},culture:{label:"Museums & culture",icon:"🏛️"},seasonal:{label:"Seasonal & events",icon:"🎃"}};
const SYMBOLS={group:"🎶",play:"🛝",nature:"🌿",animals:"🐑",transport:"🚂",culture:"🏛️",seasonal:"🎃"};
const TIER_LABELS={local:"Easy & local",nearby:"Wider area",special:"Special trip"};
const $=id=>document.getElementById(id);
const escapeHTML=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const safeLink=url=>(typeof url==="string" && /^https:\/\//i.test(url))?url:null;
const isoUK=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const dateObj=s=>new Date(s+"T12:00:00Z");
const weekday=s=>dateObj(s).getUTCDay();
const displayDate=(iso,opts={weekday:"long",day:"numeric",month:"long",year:"numeric"})=>new Intl.DateTimeFormat("en-GB",{...opts,timeZone:"UTC"}).format(dateObj(iso));
const fromDate=d=>[d.getUTCFullYear(),String(d.getUTCMonth()+1).padStart(2,"0"),String(d.getUTCDate()).padStart(2,"0")].join("-");
const nextFriday=()=>{const d=dateObj(isoUK());const diff=(5-d.getUTCDay()+7)%7;d.setUTCDate(d.getUTCDate()+diff);return fromDate(d);};
const STORAGE_KEY="calliedays:favourites:v1";
const state={places:[],events:[],view:"discover",date:isoUK(),search:"",categories:new Set(),distance:"all",kind:"all",free:false,hideAge:false,archived:false,dateOnly:false,sort:"recommended",saved:new Set(),calendarMonth:null,calendarDay:null,map:null,markers:null,mapGroup:null};
const URLdate=new URLSearchParams(location.search).get("date");
if(URLdate && /^\d{4}-\d{2}-\d{2}$/.test(URLdate)&&!Number.isNaN(dateObj(URLdate).getTime()))state.date=URLdate;
try{const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");if(Array.isArray(parsed))state.saved=new Set(parsed.filter(x=>typeof x==="string"));}catch{}
const inform=msg=>{const e=$("toast");e.textContent=msg;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),3000);};
const getPlace=id=>state.places.find(p=>p.id===id);
const hasEventOn=(e,d)=>{
 if(!d)return true;
 if(e.recurrence==="once" || e.recurrence==="custom")return(e.dates||[]).includes(d);
 if(e.recurrence==="range")return d>=e.from && d<=e.to && (!e.allowedWeekdays||e.allowedWeekdays.includes(weekday(d)));
 if(e.recurrence==="weekly")return weekday(d)===e.weekday;
 return false;
};
const matchesDate=ev=>hasEventOn(ev,state.date);
const eventsFor=(id,date=state.date)=>state.events.filter(e=>e.placeId===id && hasEventOn(e,date));
const momentLabel=e=>(e.time?(e.time+(e.end?"–"+e.end:"")):"Time varies")+(e.recurrence==="weekly"?" · usual weekly listing":"");
function toggleSaved(id){
 if(state.saved.has(id))state.saved.delete(id);else state.saved.add(id);
 try{localStorage.setItem(STORAGE_KEY,JSON.stringify([...state.saved]));}catch{inform("Couldn't save locally — your browser may block storage.");}
 renderSavedCount();renderView();inform(state.saved.has(id)?"Saved to your shortlist ♡":"Removed from saved");
}
function renderSavedCount(){const n=state.saved.size;$("savedCount").textContent=n;$("savedCount").hidden=n===0;}
const isSeasonalSpecific=p=>[60,61,75,76].includes(Number(p.id.split("-")[1]));
const matchesPlace=p=>{
 if(p.archived&&!state.archived)return false;
 if(state.search&&!([p.title,p.description,p.area,p.category.map(k=>CATEGORIES[k]?.label).join(" ")].join(" ").toLowerCase().includes(state.search)))return false;
 if(state.categories.size && !p.category.some(c=>state.categories.has(c)))return false;
 if(state.distance!=="all"&&p.tier!==state.distance)return false;
 if(state.free&&p.price!=="free")return false;
 if(state.hideAge && (p.minimumAgeMonths||0)>=24)return false;
 const nowEvents=eventsFor(p.id);
 const hasRecorded=state.events.some(e=>e.placeId===p.id);
 if(state.date){
   if(p.avoidFriday20261009 && state.date==="2026-10-09" && !nowEvents.length)return false;
   if(p.kind==="session" && hasRecorded && !nowEvents.length)return false;
   if(isSeasonalSpecific(p) && hasRecorded&&!nowEvents.length)return false;
 }
 if(state.kind==="journey"&&p.kind!=="journey")return false;
 if(state.kind==="place"&&p.kind!=="place")return false;
 if(state.kind==="scheduled" && (state.date?!nowEvents.length:!hasRecorded))return false;
 if(state.dateOnly && state.date && !nowEvents.length)return false;
 if(state.dateOnly && !state.date && !hasRecorded)return false;
 return true;
};
function score(p){
 const ev=eventsFor(p.id),special=ev.some(e=>e.confidence==="dated"),weekly=ev.length>0;
 const tierWeight={local:25,nearby:12,special:0}[p.tier]||0;
 return tierWeight + (special?54:weekly?36:0) + (p.kind==="journey"?3:0) - (p.caution?3:0) - (p.archived?60:0);
}
function selectedPlaces(){
 const list=state.places.filter(matchesPlace);
 if(state.sort==="name")list.sort((a,b)=>a.title.localeCompare(b.title));
 else if(state.sort==="near")list.sort((a,b)=>({local:0,nearby:1,special:2}[a.tier]-{local:0,nearby:1,special:2}[b.tier])||score(b)-score(a));
 else if(state.sort==="fresh")list.sort((a,b)=>b.lastChecked.localeCompare(a.lastChecked)||a.title.localeCompare(b.title));
 else list.sort((a,b)=>score(b)-score(a)||a.title.localeCompare(b.title));
 return list;
}
function categoryFor(p){const c=p.category[0];return CATEGORIES[c]?c:"nature";}
function card(p){
 const cat=categoryFor(p),ev=eventsFor(p.id),dated=ev.find(e=>e.confidence==="dated"),main=dated||ev[0];
 const status=main?(main.confidence==="dated"?"Date listed":"Usual weekly slot"):(p.kind==="journey"?"Journey idea":"Opening to check");
 const mainTime=main?momentLabel(main):"";
 const safeTitle=escapeHTML(p.title);
 const hearts=state.saved.has(p.id);
 return '<article class="activity-card">'+
 '<div class="card-visual cat-'+cat+'"><span class="visual-symbol" aria-hidden="true">'+SYMBOLS[cat]+'</span>'+
 '<button class="heart '+(hearts?"saved":"")+'" data-save="'+escapeHTML(p.id)+'" aria-label="'+(hearts?"Remove from saved":"Save")+' '+safeTitle+'" aria-pressed="'+hearts+'">'+(hearts?"♥":"♡")+'</button></div>'+
 '<div class="card-body"><div class="card-kicker">'+escapeHTML(p.area)+' · '+escapeHTML(TIER_LABELS[p.tier])+'</div>'+
 '<h3>'+safeTitle+'</h3><p class="card-desc">'+escapeHTML(p.description||"Discover what this place has to offer.")+'</p>'+
 '<div class="card-tags"><span class="tag '+(dated?"dated":main?"weekly":"")+'">'+escapeHTML(status)+'</span>'+
 (mainTime?'<span class="tag">'+escapeHTML(mainTime)+'</span>':"")+
 (p.price==="free"?'<span class="tag">Free</span>':"")+
 (p.caution?'<span class="tag warning">Check details</span>':"")+'</div>'+
 '<div class="card-foot"><span>'+escapeHTML(CATEGORIES[cat].label)+'</span><button class="card-action" data-open="'+escapeHTML(p.id)+'">Details ↗</button></div></div></article>';
}
function renderDiscover(){
 const places=selectedPlaces();
 $("cards").innerHTML=places.map(card).join("");
 $("resultCount").textContent=places.length+" "+(places.length===1?"idea":"ideas");
 $("noResults").hidden=places.length>0;
 $("resultsSubtitle").textContent=state.date?("For "+displayDate(state.date)+" · dated sessions and ideas to check"):"All dates · recurring and one-off discoveries";
 $("clearDate").textContent=state.date?"Browse all dates instead":"Show today";
}
function renderSaved(){
 const saved=state.places.filter(p=>state.saved.has(p.id));
 $("savedCards").innerHTML=saved.map(card).join("");
 $("savedEmpty").hidden=saved.length>0;
}
function showView(view){
 state.view=view;
 document.querySelectorAll(".view").forEach(el=>el.hidden=el.id!==view+"View");
 document.querySelectorAll("[data-view]").forEach(el=>{const on=el.dataset.view===view;el.classList.toggle("active",on);if(el.matches(".nav-tab")){if(on)el.setAttribute("aria-current","page");else el.removeAttribute("aria-current");}});
 if(view==="map")renderMap();else if(view==="calendar")renderCalendar();else if(view==="saved")renderSaved();else renderDiscover();
}
function renderView(){
 if(state.view==="map")renderMap();else if(state.view==="calendar")renderCalendar();else if(state.view==="saved")renderSaved();else renderDiscover();
}
function renderFilterUI(){
 $("categoryFilters").innerHTML=Object.entries(CATEGORIES).map(([key,obj])=>'<button class="cat-chip '+(state.categories.has(key)?"active":"")+'" data-cat="'+key+'" aria-pressed="'+state.categories.has(key)+'"><span class="cat-icon">'+obj.icon+'</span>'+escapeHTML(obj.label)+'</button>').join("");
 $("searchInput").value=state.search;
 $("dateInput").value=state.date;
 $("kindFilter").value=state.kind;
 $("sortSelect").value=state.sort;
 document.querySelector('input[name="distance"][value="'+state.distance+'"]').checked=true;
 $("freeOnly").checked=state.free;$("hideAge").checked=state.hideAge;$("showArchived").checked=state.archived;$("showDateOnly").checked=state.dateOnly;
 const n=state.categories.size+(state.distance!=="all")+(state.kind!=="all")+(state.free?1:0)+(state.hideAge?1:0)+(state.archived?1:0)+(state.dateOnly?1:0);
 $("activeFilters").textContent=n;$("activeFilters").hidden=n===0;
}
function updateDate(d){
 state.date=d;
 const url=new URL(location.href);
 if(d)url.searchParams.set("date",d);else url.searchParams.delete("date");
 history.replaceState(null,"",url.pathname+url.search+url.hash);
 state.mapGroup=null;
 renderFilterUI();renderView();
}
function clearFilters(){
 state.categories.clear();state.distance="all";state.kind="all";state.free=false;state.hideAge=false;state.archived=false;state.dateOnly=false;state.search="";
 renderFilterUI();renderView();
}
function detail(p){
 const cat=categoryFor(p),es=eventsFor(p.id),link=safeLink(p.source);
 const dir="https://www.google.com/maps/dir/?api=1&destination="+encodeURIComponent(p.title+", "+p.area+", UK");
 const ageWarning=p.minimumAgeMonths?"Official minimum age "+Math.floor(p.minimumAgeMonths/12)+"; check before booking.":null;
 $("detailBody").innerHTML='<div class="detail-art cat-'+cat+'">'+SYMBOLS[cat]+'</div><div class="detail-content">'+
 '<p class="eyebrow green">'+escapeHTML(CATEGORIES[cat].label)+' · '+escapeHTML(TIER_LABELS[p.tier])+'</p><h2>'+escapeHTML(p.title)+'</h2>'+
 '<p>'+escapeHTML(p.description)+'</p>'+
 '<div class="detail-meta"><div>📍 <b>Area:</b> '+escapeHTML(p.area)+'</div><div>🔎 <b>Source last catalogued:</b> '+escapeHTML(p.lastChecked)+'</div><div>🗓️ <b>Date status:</b> '+(es.length?es.map(e=>escapeHTML(e.title+" — "+momentLabel(e)+" ("+(e.confidence==="dated"?"dated listing":"usual weekly")+")")).join("<br>"):"Opening for the selected date has not been confirmed")+'</div><div>💷 <b>Admission:</b> '+(p.price==="free"?"Listed as free":p.price==="priced"?"Price mentioned — see organiser":"Check with organiser")+'</div></div>'+
 (p.caution||ageWarning?'<div class="detail-caution"><strong>Before you go:</strong> '+escapeHTML([p.caution,ageWarning].filter(Boolean).join(" · "))+'</div>':"")+
 (es.map(e=>e.note).filter(Boolean).length?'<p><strong>Event notes:</strong> '+escapeHTML(es.map(e=>e.note).filter(Boolean).join(" · "))+'</p>':"")+
 '<p>Times, tickets, age limits and opening status can change. An entry in this catalogue is not a live availability confirmation. Map markers are approximate area hubs.</p>'+
 '<div class="detail-buttons">'+(link?'<a class="button button-dark" target="_blank" rel="noopener noreferrer" href="'+escapeHTML(link)+'">Official info ↗</a>':"")+
 '<a class="button button-light" target="_blank" rel="noopener noreferrer" href="'+escapeHTML(dir)+'">Directions ↗</a>'+
 '<button class="button button-light" id="detailSave">'+(state.saved.has(p.id)?"♥ Saved":"♡ Save idea")+'</button></div></div>';
 $("detailSave").addEventListener("click",()=>{toggleSaved(p.id);$("detailSave").textContent=state.saved.has(p.id)?"♥ Saved":"♡ Save idea";});
 $("detailDialog").showModal();
}
function renderMap(){
 const filtered=selectedPlaces().filter(p=>p.mapPoint);
 const groups=new Map();
 filtered.forEach(p=>{const key=p.locationGroup||p.area;if(!groups.has(key))groups.set(key,{lat:p.mapPoint.lat,lng:p.mapPoint.lng,places:[]});groups.get(key).places.push(p);});
 if(state.mapGroup&&!groups.has(state.mapGroup))state.mapGroup=null;
 const displayed=state.mapGroup?groups.get(state.mapGroup)?.places||[]:filtered;
 $("mapTotal").textContent="· "+filtered.length+" ideas across "+groups.size+" areas";
 $("mapResults").innerHTML=(state.mapGroup?'<button class="text-button" id="showAllMap">← All areas</button><h4>'+escapeHTML(state.mapGroup)+'</h4>':"")+
 displayed.slice(0,90).map(p=>'<button class="map-result" data-open="'+escapeHTML(p.id)+'"><strong>'+escapeHTML(p.title)+'</strong><small>'+escapeHTML(p.area)+' · '+escapeHTML(CATEGORIES[categoryFor(p)].label)+'</small></button>').join("");
 if(!window.L){$("map").innerHTML='<div class="empty" style="margin:10px"><h3>Map is unavailable offline</h3><p>The places list is still usable. Open any activity for a directions link.</p></div>';return;}
 if(!state.map){
   state.map=window.L.map("map",{scrollWheelZoom:false}).setView([52.95,-1.15],10);
   window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',maxZoom:18}).addTo(state.map);
   state.markers=window.L.layerGroup().addTo(state.map);
 }
 state.markers.clearLayers();
 groups.forEach((data,name)=>{
   const icon=window.L.divIcon({className:"",html:'<div class="map-pin">'+data.places.length+'</div>',iconSize:[37,37],iconAnchor:[18,18]});
   window.L.marker([data.lat,data.lng],{icon,title:name+" area (approximate)"}).addTo(state.markers).bindTooltip(name+" · "+data.places.length+" ideas").on("click",()=>{state.mapGroup=name;renderMap();});
 });
 setTimeout(()=>state.map.invalidateSize(),60);
}
function renderCalendar(){
 const selected=state.calendarDay||state.date||isoUK();
 if(!state.calendarMonth)state.calendarMonth=selected.substring(0,7);
 const [year,month]=state.calendarMonth.split("-").map(Number);
 $("monthTitle").textContent=new Intl.DateTimeFormat("en-GB",{month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(Date.UTC(year,month-1,1)));
 const first=new Date(Date.UTC(year,month-1,1)),offset=(first.getUTCDay()+6)%7;
 const monthDays=new Date(Date.UTC(year,month,0)).getUTCDate();
 const today=isoUK();let html="";
 for(let cell=0;cell<offset+monthDays;cell++){
   if(cell<offset){html+='<div class="calendar-cell other" aria-hidden="true"></div>';continue;}
   const day=cell-offset+1,d=state.calendarMonth+"-"+String(day).padStart(2,"0");
   const els=state.events.filter(e=>hasEventOn(e,d)).filter(e=>{const p=getPlace(e.placeId);return p&&(!state.categories.size||p.category.some(k=>state.categories.has(k)));});
   const dated=els.filter(e=>e.confidence==="dated");
   const item=dated[0]||els[0];
   html+='<button class="calendar-cell '+(d===today?"today ":"")+(d===selected?"selected":"")+'" data-calendar-date="'+d+'" aria-label="'+escapeHTML(displayDate(d))+'; '+els.length+' listed activities"><span class="day-number">'+day+'</span>'+(item?'<span class="event-indicator">'+escapeHTML(item.title)+'</span>':"")+(els.length>1?'<span class="event-more">+'+(els.length-1)+' more</span>':"")+'</button>';
 }
 $("calendarGrid").innerHTML=html;
 $("calendarDateHeading").textContent=displayDate(selected);
 const filtered=state.events.filter(e=>hasEventOn(e,selected));
 $("calendarAgenda").innerHTML=filtered.length?filtered.sort((a,b)=>(a.time||"99:99").localeCompare(b.time||"99:99")).map(e=>{
   const p=getPlace(e.placeId);if(!p)return "";
   return '<div class="agenda-item"><div><h4>'+escapeHTML(e.title)+'</h4><p>'+escapeHTML(p.area)+' · '+escapeHTML(momentLabel(e))+' · '+(e.confidence==="dated"?"Dated listing":"Regular listing: recheck")+'</p></div><button aria-label="Details" data-open="'+escapeHTML(p.id)+'">↗</button></div>';
 }).join(""):'<p class="agenda-empty">No recorded sessions for this date yet. There may still be plenty of places to visit — switch to Discover.</p>';
}
function refreshMonth(delta){
 const [year,month]=state.calendarMonth.split("-").map(Number);
 const d=new Date(Date.UTC(year,month-1+delta,1));state.calendarMonth=fromDate(d).slice(0,7);state.calendarDay=state.calendarMonth+"-01";renderCalendar();
}
function renderFreshness(){
 const days=Math.floor((dateObj(isoUK()).getTime()-dateObj("2026-10-09").getTime())/86400000);
 if(days>14){$("freshness").hidden=false;$("freshness").textContent="Heads-up: this catalogue was last researched in October 2026. Some listings may now be out of date. This site is a discovery directory, not an automatically verified diary. Check organiser links before travelling.";}
}
async function initialize(){
 try{
   const [pRes,eRes]=await Promise.all([fetch("./data/activities.json",{cache:"no-cache"}),fetch("./data/events.json",{cache:"no-cache"})]);
   if(!pRes.ok||!eRes.ok)throw Error("Couldn't load the activity catalogue.");
   const p=await pRes.json(),e=await eRes.json();if(!Array.isArray(p.entries)||!Array.isArray(e.events))throw Error("Invalid activity data.");
   state.places=p.entries;state.events=e.events;
 }catch(err){$("cards").innerHTML='<div class="empty"><h3>Could not load activities</h3><p>'+escapeHTML(err.message)+'</p><p>Check your connection and try refreshing.</p></div>';return;}
 state.calendarDay=state.date;state.calendarMonth=state.date.slice(0,7);
 renderSavedCount();renderFilterUI();renderDiscover();renderFreshness();
}
document.addEventListener("click",evt=>{
 const save=evt.target.closest("[data-save]");if(save){evt.preventDefault();toggleSaved(save.dataset.save);return;}
 const open=evt.target.closest("[data-open]");if(open){const p=getPlace(open.dataset.open);if(p)detail(p);return;}
 const cat=evt.target.closest("[data-cat]");if(cat){const key=cat.dataset.cat;if(state.categories.has(key))state.categories.delete(key);else state.categories.add(key);renderFilterUI();renderView();return;}
 const view=evt.target.closest("[data-view]");if(view){showView(view.dataset.view);return;}
 const day=evt.target.closest("[data-calendar-date]");if(day){state.calendarDay=day.dataset.calendarDate;renderCalendar();return;}
 if(evt.target.closest("#showAllMap")){state.mapGroup=null;renderMap();}
});
$("searchInput").addEventListener("input",e=>{state.search=e.target.value.trim().toLowerCase();renderView();});
$("dateInput").addEventListener("change",e=>{state.calendarDay=e.target.value||isoUK();state.calendarMonth=state.calendarDay.slice(0,7);updateDate(e.target.value);});
$("todayBtn").addEventListener("click",()=>{updateDate(isoUK());showView("discover");});
$("fridayBtn").addEventListener("click",()=>{updateDate(nextFriday());showView("discover");});
$("clearDate").addEventListener("click",()=>updateDate(state.date?"":isoUK()));
$("filterToggle").addEventListener("click",()=>{const open=$("filterPanel").classList.toggle("open");$("filterToggle").setAttribute("aria-expanded",String(open));});
$("resetFilters").addEventListener("click",clearFilters);
$("emptyReset").addEventListener("click",clearFilters);
$("kindFilter").addEventListener("change",e=>{state.kind=e.target.value;renderView();});
$("sortSelect").addEventListener("change",e=>{state.sort=e.target.value;renderView();});
document.querySelectorAll('input[name="distance"]').forEach(el=>el.addEventListener("change",e=>{state.distance=e.target.value;renderView();}));
[["freeOnly","free"],["hideAge","hideAge"],["showArchived","archived"],["showDateOnly","dateOnly"]].forEach(([id,key])=>$(id).addEventListener("change",e=>{state[key]=e.target.checked;renderView();}));
$("goDiscover").addEventListener("click",()=>showView("discover"));
$("prevMonth").addEventListener("click",()=>refreshMonth(-1));$("nextMonth").addEventListener("click",()=>refreshMonth(1));
$("monthToday").addEventListener("click",()=>{state.calendarMonth=isoUK().slice(0,7);state.calendarDay=isoUK();renderCalendar();});
$("browseDay").addEventListener("click",()=>{updateDate(state.calendarDay||isoUK());showView("discover");});
$("detailClose").addEventListener("click",()=>$("detailDialog").close());
$("detailDialog").addEventListener("click",e=>{if(e.target===$("detailDialog"))$("detailDialog").close();});
$("shareBtn").addEventListener("click",async()=>{try{await navigator.clipboard.writeText(location.href);inform("Link copied");}catch{inform("Copy the address from your browser to share this search.");}});
initialize();