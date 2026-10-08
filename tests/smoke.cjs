/* Responsive functional & WCAG smoke tests. Run: npm run test:ui. */
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const http=require("node:http");
const puppeteer=require("puppeteer");
const ROOT=path.resolve(__dirname,"..");
const MIME={".html":"text/html",".js":"text/javascript",".json":"application/json",".css":"text/css",".svg":"image/svg+xml",".png":"image/png",".webmanifest":"application/manifest+json"};
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,"http://localhost");
 const relative=(u.pathname==="/"?"index.html":decodeURIComponent(u.pathname.slice(1)));
 const full=path.resolve(ROOT,relative);
 if(!full.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(full,(err,body)=>{if(err){res.writeHead(404).end();return;}res.writeHead(200,{"Content-Type":MIME[path.extname(full)]||"application/octet-stream"});res.end(body);});
});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const test=async(browser,base,width)=>{
 const context=await browser.createBrowserContext();
 const page=await context.newPage();
 const errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 await page.setViewport({width,height:900,deviceScaleFactor:1});
 await page.goto(base+"?date=2026-10-09",{waitUntil:"domcontentloaded",timeout:20000});
 await page.waitForSelector(".activity-card");
 const layout=await page.evaluate(()=>({
   overflow:document.documentElement.scrollWidth-innerWidth,
   firstCardTop:Math.round(document.querySelector(".activity-card").getBoundingClientRect().top),
   count:document.querySelectorAll(".activity-card").length,
   sections:document.querySelectorAll(".discovery-section").length,
   heading:document.querySelectorAll("h1").length
 }));
 assert.equal(layout.overflow,0,width+": horizontal overflow");
 assert.equal(layout.count,18,width+": should progressively show 18 ideas");
 assert.equal(layout.sections,2,width+": dated events and general places must be separate");
 assert.equal(layout.heading,1,width+": should have exactly one primary heading");
 assert.ok(layout.firstCardTop<700,width+": first result too far down screen: "+layout.firstCardTop);
 await page.click("#loadMore");
 assert.equal(await page.$$eval(".activity-card",a=>a.length),36,"load more");
 await page.click('[data-quick="local"]');
 assert.ok(await page.$$eval(".card-kicker",els=>els.length>0&&els.every(el=>el.textContent.includes("Easy & local"))),"local filter");
 await page.click('[data-quick="local"]');
 const isMobile=width<=900;
 if(isMobile){
   await page.click("#filterToggle");
   assert.equal(await page.$eval("#filterPanel",el=>el.getAttribute("role")),"dialog","mobile filter dialog");
   await page.click('input[name="distance"][value="nearby"]');
   await page.click("#applyFilters");
   const bands=await page.$$eval(".card-kicker",els=>els.map(e=>e.textContent));
   assert.ok(bands.some(x=>x.includes("Easy & local")),"45-minute filter excludes local outings");
   assert.ok(bands.every(x=>!x.includes("Special trip")),"45-minute filter includes special trips");
   await page.click("#filterToggle");
   await page.keyboard.press("Escape");
   assert.equal(await page.$eval("#filterToggle",el=>el.getAttribute("aria-expanded")),"false","Escape closes filter panel");
   // Desktop filter reset is permanently visible; mobile one is hidden after Escape.
   await page.click('[data-quick="local"]');
   await page.click('[data-quick="local"]');
 }
 await page.click(".activity-card h3 [data-open]");
 assert.equal(await page.$eval("#detailDialog",el=>el.open),true,"activity details modal");
 assert.ok(await page.$eval("#detailBody",el=>el.textContent.includes("Directions")),"activity directions missing");
 await page.click("#detailSave");
 await page.click("#detailClose");
 const nav=isMobile?".mobile-tabs":".top-tabs";
 await page.click(nav+' [data-view="saved"]');
 assert.ok(await page.$$eval("#savedCards .activity-card",a=>a.length)>0,"save favourites");
 await page.reload({waitUntil:"domcontentloaded"});
 await page.waitForSelector(".activity-card");
 await page.click(nav+' [data-view="saved"]');
 await page.waitForSelector("#savedCards .activity-card");
 await page.click(nav+' [data-view="calendar"]');
 assert.ok((await page.$$eval(".calendar-cell",a=>a.length))>=28,"calendar days not rendered");
 await page.click('[data-calendar-date="2026-10-10"]');
 assert.equal(await page.$eval("#dateInput",el=>el.value),"2026-10-10","calendar date and date field out of sync");
 await page.click(nav+' [data-view="map"]');
 await sleep(500);
 assert.equal(await page.evaluate(()=>typeof window.L.markerClusterGroup),"function","clustered map library missing");
 assert.ok((await page.$$eval("#map .map-pin",a=>a.length))>0,"no map pins");
 assert.ok(await page.$eval("#mapTotal",el=>el.textContent.includes("areas")),"map list not available");
 await page.addScriptTag({path:require.resolve("axe-core/axe.min.js")});
 const violations=await page.evaluate(async()=>{
  const data=await axe.run({runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21a","wcag21aa"]}});
  return data.violations.map(v=>v.id+":"+v.nodes.length);
 });
 assert.deepEqual(violations,[],"WCAG violations: "+violations.join(", "));
 assert.deepEqual(errors,[],"Browser errors: "+errors.join(", "));
 console.log("PASS",width+"px",JSON.stringify({firstResultAt:layout.firstCardTop,eventsAndPlacesGrouped:true,map:true,calendar:true,saved:true,accessibility:"pass"}));
 await context.close();
};
(async()=>{
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const port=server.address().port;
 let browser;
 try{
   browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined,args:["--no-sandbox","--disable-setuid-sandbox"]});
   for(const w of [320,390,768,1440])await test(browser,"http://127.0.0.1:"+port+"/",w);
 }catch(e){console.error(e);process.exitCode=1;}
 finally{if(browser)await browser.close();server.close();}
})();
