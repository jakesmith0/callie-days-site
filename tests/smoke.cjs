"use strict";
const assert=require("node:assert/strict"),fs=require("fs"),path=require("path"),http=require("http"),puppeteer=require("puppeteer");
const ROOT=path.resolve(__dirname,"..");
const MIME={".html":"text/html",".js":"application/javascript",".json":"application/json",".css":"text/css",".svg":"image/svg+xml",".png":"image/png"};
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
 let full=path.resolve(ROOT,pathname.slice(1)||"index.html");
 if(!full.startsWith(ROOT+path.sep)){res.writeHead(403).end();return}
 if(fs.existsSync(full)&&fs.statSync(full).isDirectory())full=path.join(full,"index.html");
 fs.readFile(full,(error,body)=>{if(error){res.writeHead(404).end();return}res.writeHead(200,{"Content-Type":MIME[path.extname(full)]||"application/octet-stream"});res.end(body)});
});
const sleep=n=>new Promise(r=>setTimeout(r,n));
async function test(browser,base,width){
 const context=await browser.createBrowserContext();
 const page=await context.newPage();const errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 await page.setViewport({width,height:width<=390?844:900,deviceScaleFactor:1});
 await page.goto(base+"/",{waitUntil:"networkidle2"});
 await page.waitForSelector(".result-card",{timeout:15000});
 const ux=await page.evaluate(()=>{
  const pos=s=>Math.round(document.querySelector(s).getBoundingClientRect().top);
  return {overflow:document.documentElement.scrollWidth-window.innerWidth,firstResult:pos(".result-card"),locationButton:pos("#detectLocation"),locationPicker:!document.querySelector("#locationPicker").hidden,cardCount:document.querySelectorAll(".result-card").length,hero:document.querySelector("h1").textContent};
 });
 assert.equal(ux.overflow,0,width+" horizontal overflow");
 assert.ok(ux.locationPicker,width+" first visit should offer location choice");
 assert.ok(ux.locationButton<700,width+" location action hidden");
 assert.ok(ux.firstResult<1000,width+" first result too far below fold: "+ux.firstResult);
 assert.equal(ux.cardCount,6,"initial results should stay concise");
 assert.ok((await page.$eval(".brand-name",el=>el.innerText)).includes("calliedays"),"must preserve original wordmark");
 await page.screenshot({path:path.join("/tmp","calliedays-v3-"+width+".png")});
 // User selecting an area should change recommendation center, persist it, and update homepage.
 await page.select("#areaInput","Beeston");
 assert.deepEqual(await page.evaluate(()=>app.origin),[52.926,-1.215],"Beeston location not applied");
 assert.equal(await page.$eval("#locationLabel",e=>e.textContent),"Beeston");
 assert.ok(await page.$eval(".card-topline",el=>/direct|approx\.|location recorded/i.test(el.textContent)),"show honest location-precision label");
 await page.reload({waitUntil:"networkidle2"});
 assert.equal(await page.$eval("#locationLabel",e=>e.textContent),"Beeston","saved area not restored");
 // People journey, plan date, source-quality and action.
 // A selected venue is a manual preference and should not be erased when browser permission is granted on repeat visit.
 assert.ok(await page.evaluate(()=>app.area==="Beeston"),"manually selected area not retained");
 await page.evaluate(()=>document.querySelector('[data-journey="social"]').click());
 assert.equal(await page.evaluate(()=>app.mode),"social");
 assert.ok(await page.$eval(".result-grid",e=>e.querySelectorAll(".result-card").length>0),"social results empty");
 assert.ok(await page.evaluate(()=>app.items.every(c=>c.p.kind==="session"||c.p.category.includes("group"))),"social results contain unrelated activities");
 await page.evaluate(()=>document.querySelector('[data-journey="plan"]').click());
 assert.equal(await page.evaluate(()=>app.mode),"plan");
 assert.equal(await page.$eval("#dateField",e=>!e.hidden),true);
 await page.$eval("#dateInput",el=>{el.value="2026-10-23";el.dispatchEvent(new Event("change",{bubbles:true}))});
 assert.equal(await page.evaluate(()=>app.date),"2026-10-23","planning date not reflected");
 assert.ok(new URL(page.url()).searchParams.get("date")==="2026-10-23","planning date not shareable");
 await page.evaluate(()=>document.querySelector(".result-card h3 button").click());
 assert.equal(await page.$eval("#detailDialog",el=>el.open),true);
 assert.ok((await page.$eval("#detailBody",el=>el.innerText)).includes("WHEN"),"details missing date/when");
 await page.click("#detailClose");
 // Recurrence needs human summary, not a 12-date list.
 const schedule=await page.evaluate(()=>{
  const p=app.places.find(p=>p.id==="place-1");detail({p,kind:"place"});
  const text=document.querySelector("#detailBody").innerText;
  return {text,dateRows:document.querySelectorAll("#detailBody .detail-schedule p").length};
 });
 assert.ok(schedule.text.includes("Every Friday"),"regular weekly schedule not summarized");
 assert.ok(schedule.dateRows<=7,"recurrence detail overloaded with dates");
 await page.click("#detailClose");
 // The geo-ranked home suggestions shouldn't be an unbroken row of generic playgrounds.
 assert.ok(await page.evaluate(()=>app.items.slice(0,5).filter(c=>/playground|play area|junior play/i.test(c.p.title)).length<=2),"too many generic playgrounds in top five");
 // Favourite persists with unchanged site shell.
 await page.evaluate(()=>document.querySelector(".save-button").click());
 await page.click("#savedNav");
 assert.equal(await page.$eval("#savedDialog",el=>el.open),true,"saved shortlist missing");
 await page.click("#savedClose");
 // Shared links must recover a planning journey, including on a different device.
 await page.goto(base+"/?area=Beeston&date=2026-10-23",{waitUntil:"networkidle2"});
 await page.waitForSelector(".result-card",{timeout:12000});
 assert.deepEqual(await page.evaluate(()=>({mode:app.mode,area:app.area,date:app.date})),{mode:"plan",area:"Beeston",date:"2026-10-23"},"shareable date/area failed");

 // Shared area page must be same functional app, NOT disconnected static list.
 await page.goto(base+"/areas/hucknall/",{waitUntil:"networkidle2"});
 await page.waitForSelector(".result-card",{timeout:12000});
 assert.equal(await page.$eval("#locationLabel",el=>el.textContent),"Hucknall");
 assert.equal(await page.$eval("#heroTitle",el=>el.textContent),"Things to do near Hucknall");
 assert.ok(await page.$(".choices .choice"),"area page lost primary journeys");
 assert.ok(await page.$("#searchInput"),"area page lost search");
 assert.equal(await page.evaluate(()=>app.origin?.[0]),53.038);
 // Term-time sessions should not be published as occurrences during the confirmed Nottingham half-term.
 assert.ok(await page.evaluate(()=>{
  const weekly=app.events.find(e=>e.id==="event-rockets");
  return occurrence(weekly,"2026-10-16")!==null&&occurrence(weekly,"2026-10-23")===null;
 }),"half-term exclusions for regular term-time series");
 // Event-only venues and recurring groups must not become open-all-day attractions in planner.
 assert.ok(await page.evaluate(()=>app.items.filter(x=>x.kind==="place").every(x=>x.p.kind!=="session")),"undated session shown as anytime attraction");
 // WCAG automated scan, in addition to task testing.
 await page.addScriptTag({path:require.resolve("axe-core/axe.min.js")});
 const violations=await page.evaluate(async()=>{const x=await axe.run({runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21a","wcag21aa"]}});return x.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.length,targets:v.nodes.map(n=>({target:n.target,summary:n.failureSummary?.slice(0,180)}))}))});
 assert.deepEqual(violations,[],width+" accessibility violations: "+JSON.stringify(violations));
 assert.deepEqual(errors,[],width+" browser exceptions: "+errors);
 console.log("PASS "+width+"px",JSON.stringify({ux,journies:"pass",area:"pass",schedule:"pass",accessibility:"pass"}));
 await context.close();
}
async function testV31(browser,base){
 const context=await browser.createBrowserContext();
 const page=await context.newPage();
 await page.setViewport({width:390,height:844});
 await page.goto(base+"/areas/",{waitUntil:"networkidle2"});
 await page.waitForSelector(".area-links a",{timeout:15000});
 const directory=await page.evaluate(()=>{
  const top=selector=>Math.round(document.querySelector(selector).getBoundingClientRect().top+scrollY);
  return {links:document.querySelectorAll(".area-links a").length,firstLink:top(".area-links a"),firstCard:top(".result-card"),allLinkHidden:document.querySelector(".all-areas-link").hidden};
 });
 assert.ok(directory.links>=18,"Area directory must offer all neighbourhoods");
 assert.ok(directory.firstLink<directory.firstCard,"Areas must appear before recommendations");
 assert.ok(directory.allLinkHidden,"Area directory should not link to itself");
 await page.goto(base+"/",{waitUntil:"networkidle2"});
 await page.waitForSelector(".result-card");
 const firstTitle=await page.$eval(".result-card h3 button",el=>el.textContent);
 await page.click(".result-card .card-art");
 assert.equal(await page.$eval("#detailDialog",el=>el.open),true,"Image tap must open details");
 assert.equal(await page.$eval("#detailDialog h2",el=>el.textContent),firstTitle);
 await page.click("#detailClose");
 await page.click("#filtersToggle");
 await page.select("#rangeInput","near");
 assert.ok((await page.$eval("#distanceStatus",el=>el.textContent)).includes("Choose"),"Distance filter needs a location prompt");
 assert.equal(await page.$eval("#locationPicker",el=>el.hidden),false);
 await page.select("#areaInput","Beeston");
 assert.equal(await page.$eval("#distanceStatus",el=>el.textContent),"","Location selection should dismiss filter prompt");
 assert.ok(await page.evaluate(()=>app.origin!==null&&app.range==="near"),"Chosen location should activate selected distance filter");
 await page.click('[data-journey="plan"]');
 assert.equal(await page.$eval("#quickDates",el=>el.hidden),false,"Planning shortcuts must appear");
 await page.$eval("#dateInput",el=>{el.value="2025-10-15";el.dispatchEvent(new Event("change",{bubbles:true}))});
 assert.equal(await page.evaluate(()=>app.date>="2026-10-15"),true,"Past date should be rejected");
 assert.equal(await page.$eval("#dateStatus",el=>!el.hidden),true,"Past date needs visible feedback");
 await page.click('[data-quick-date="friday"]');
 assert.equal(await page.evaluate(()=>weekdays(app.date)),5,"Friday shortcut must select Friday");
 const weekly=await page.evaluate(()=>{
  const e=app.events.find(e=>e.id==="event-wb-rhyme-10");
  return {distant:occurrence(e,"2028-10-20"),near:occurrence(e,"2026-10-16"),end:weeklyProjectionEnd(e)};
 });
 assert.equal(weekly.distant,null,"Weekly sessions must not be extrapolated indefinitely");
 assert.ok(weekly.near,"Near-term weekly recurrence should remain available");
 await page.goto(base+"/?date=2025-10-15&area=Beeston",{waitUntil:"networkidle2"});
 await page.waitForSelector(".result-card");
 assert.ok(await page.evaluate(()=>app.date>=isoUK()),"Past date deep link must be replaced");
 assert.equal(await page.$eval("#dateStatus",el=>!el.hidden),true);
 await page.evaluate(()=>{
  const e=app.events.find(e=>e.id==="event-wb-rhyme-10");
  const p=getPlace(e.placeId),day="2026-10-16";
  detail({kind:"event",p,e:occurrence(e,day),day});
 });
 const when=await page.$eval("#detailBody .fact:nth-child(2)",el=>el.innerText);
 assert.ok(when.includes("16 October"),"Selected weekly event must show its actual date");
 assert.ok((await page.$eval("#detailBody",el=>el.innerText)).includes("Every Friday"),"Regular pattern should remain separately available");
 await page.click("#detailClose");
 await page.click(".save-button");
 await page.addScriptTag({path:require.resolve("axe-core/axe.min.js")});
 const violations=await page.evaluate(async()=>{const result=await axe.run({runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21a","wcag21aa"]}});return result.violations.map(x=>({id:x.id,targets:x.nodes.map(n=>n.target)}))});
 assert.deepEqual(violations,[],"Save notification must not cause accessibility failure: "+JSON.stringify(violations));
 await context.close();
 console.log("PASS V3.1 directory, card tap, distance gating, dates, recurrence and toast accessibility");
}
async function testPermissions(browser,base){
 const granted=await browser.createBrowserContext();
 await granted.overridePermissions(base,["geolocation"]);
 const p=await granted.newPage();
 await p.setGeolocation({latitude:53.038,longitude:-1.202});
 await p.goto(base+"/",{waitUntil:"networkidle2"});await p.waitForSelector(".result-card");
 await p.waitForFunction(()=>app.origin!==null);
 assert.deepEqual(await p.evaluate(()=>app.origin),[53.038,-1.202],"existing geolocation permission should auto-apply");
 assert.equal(await p.$eval("#locationPicker",el=>el.hidden),true,"granted permission should skip onboarding");
 await p.select("#areaInput","Beeston");
 await p.reload({waitUntil:"networkidle2"});
 await p.waitForSelector(".result-card");
 assert.equal(await p.evaluate(()=>app.area),"Beeston","granted geolocation overrode explicit saved area");

 await granted.close();
 const denied=await browser.createBrowserContext();
 await denied.overridePermissions(base,[]);
 const p2=await denied.newPage();await p2.goto(base+"/",{waitUntil:"networkidle2"});await p2.waitForSelector(".result-card");
 await p2.click("#detectLocation");
 await p2.waitForFunction(()=>document.querySelector("#locationStatus").textContent.includes("blocked"),{timeout:12000});
 assert.ok((await p2.$eval("#locationStatus",el=>el.innerText)).includes("blocked"),"permission error needs actionable explanation");
 assert.equal(await p2.$eval("#locationPicker",el=>el.hidden),false,"denied permissions must keep location controls visible");
 await denied.close();
 console.log("PASS location permissions: grant/deny and manual fallback");
}
(async()=>{
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const base="http://127.0.0.1:"+server.address().port;
 const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined,args:["--no-sandbox"]});
 try{for(const size of [320,390,768,1440])await test(browser,base,size);await testPermissions(browser,base);await testV31(browser,base)}finally{await browser.close();server.close()}
})().catch(error=>{console.error(error.stack||error);server.close();process.exitCode=1});
