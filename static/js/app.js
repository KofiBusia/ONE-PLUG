/* Server bootstrap: Flask injects a JSON data island (#oneplug-boot) in templates/index.html.
   A non-executable <script type="application/json"> keeps this readable under a strict CSP
   that disallows inline JavaScript. Maps keys come from environment variables
   (GOOGLE_MAPS_API_KEY, GOOGLE_MAP_ID). */
const BOOT = JSON.parse(document.getElementById("oneplug-boot")?.textContent || "null")
  || {config:{},operators:{},stations:[],countries:{}};
const API = BOOT.config.apiBase || "/api";
const GOOGLE_MAPS_API_KEY = BOOT.config.googleMapsApiKey || "";
const GOOGLE_MAP_ID       = BOOT.config.googleMapId || "";

/* ---------- Network data now lives in the database (see seed/seed_data.json) ---------- */
const OPS = BOOT.operators;
const STATIONS = BOOT.stations;
const ME={lat:5.6037,lng:-0.1870};
const VCLASSES=["Motorbike","Tricycle"];
const IC={bolt:`<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M13.5 1.5 3.5 14h7.5l-1.5 8.5L20.5 10H13l.5-8.5z"/></svg>`,
  batt:`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="1.5" y="6" width="18.5" height="12" rx="3" fill="currentColor"/><rect x="20.5" y="9.5" width="2.5" height="5" rx="1" fill="currentColor"/><path d="M5.5 10.2h8.5l-1.6-1.6M14 13.8H5.5l1.6 1.6" fill="none" stroke="var(--icon-cut,#fff)" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  all:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/></svg>`};
const PLUGS=["CCS2","Type 2","CHAdeMO","GB/T"];

/* ---------- COUNTRIES: adding a country = one entry here + its networks and stations ---------- */
const COUNTRIES = BOOT.countries;
let CC="gh";try{const m=localStorage.getItem("oneplug-africa-v1-country");if(m&&COUNTRIES[m])CC=m;}catch(e){}
const C=(k=CC)=>COUNTRIES[k];
Object.assign(ME,C().me);
const _fmt={};
function money(n,cc=CC){const c=C(cc),z=["XOF","RWF","NGN","KES"].includes(c.cur)?0:2;
  const f=_fmt[cc]||(_fmt[cc]=new Intl.NumberFormat(c.locale,{style:"currency",currency:c.cur,minimumFractionDigits:z,maximumFractionDigits:z}));return f.format(n);}
const stripe=(c=C())=>`<span class="mstripe" aria-hidden="true">${c.c.map(x=>`<i style="background:${x}"></i>`).join("")}</span>`;
function renderMarket(){const c=C();
  $("#mktPill").innerHTML=stripe()+`<span>${esc(c.city)}</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`;
  $("#mktPill").setAttribute("aria-label",`Country: ${c.name}. Change country`);
  $("#splashMkt").innerHTML=stripe()+`<span>${esc(c.city)} · ${esc(c.name)}</span>`;
  $("#fitBtn").textContent=c.code;$("#fitBtn").setAttribute("aria-label","Show all of "+c.name);
  $("#q").placeholder=`Search ${c.city} chargers & swaps`;}
function setCountry(cc){if(SES)return toast("Stop charging first");releaseHold();CC=cc;try{localStorage.setItem("oneplug-africa-v1-country",cc);}catch(e){}
  Object.assign(ME,C().me);if(meMarker)meMarker.position={lat:ME.lat,lng:ME.lng};F.op=null;F.q="";$("#q").value="";
  renderMarket();fitGhana();const t=(document.querySelector(".view.active")||{id:"v-explore"}).id.slice(2);renderAll();go(t);
  toast(`${C().city}, ${C().name} · prices in ${C().cur}`);}
function openCountry(){
  openPage(`<div class="topbar">${backBtn}<span></span></div><h1 class="hero-name">Choose country</h1>
    <p class="muted">One OnePlug account works in every country. The map, networks, currency and payment methods switch to the country you pick. Your vehicles and saved stations come with you.</p>
    <button class="btn soft block" id="detect" style="margin:16px 0 6px">Use my location</button>
    <div class="group">${Object.entries(COUNTRIES).map(([k,c])=>`<button class="conn" data-cc="${k}" aria-pressed="${k===CC}"><span class="radio"></span>${stripe(c)}<span class="grow"><b>${esc(c.name)}</b><div class="st-sub">${esc(c.city)} · ${c.cur} · ${esc(c.pay.join(", "))}</div></span><span class="st-sub">${STATIONS.filter(s=>s.cc===k).length} stations</span></button>`).join("")}</div>
    <p class="note">Each country is one settings entry: currency, payment methods, map area, language and its partner networks. Adding a market doesn't change the app.</p>`);
  $("#pageBody").querySelectorAll("[data-cc]").forEach(b=>b.onclick=()=>{closePage();setCountry(b.dataset.cc);});
  $("#detect").onclick=()=>{if(!navigator.geolocation)return toast("Location isn't available. Pick from the list.");
    navigator.geolocation.getCurrentPosition(p=>{const here={lat:p.coords.latitude,lng:p.coords.longitude};let best="gh",bd=1e9;
      for(const [k,c] of Object.entries(COUNTRIES)){const d=km(here,c.me);if(d<bd){bd=d;best=k;}}
      closePage();setCountry(best);if(bd>900)setTimeout(()=>toast(`OnePlug isn't live near you yet. Showing ${C(best).name}, the closest country.`),2400);},
      ()=>toast("Location is off. Pick a country from the list."),{timeout:8000});};
}
/* ---------- hold a charger or battery pack for 15 minutes ---------- */
let HOLD=null;
function releaseHold(){if(!HOLD)return;const s=STATIONS.find(x=>x.id===HOLD.sid),c=s&&s.conns.find(x=>x.id===HOLD.cid);if(c&&c.status==="reserved")c.status="available";HOLD=null;}
function bestFor(v){const mine=STATIONS.filter(s=>s.cc===CC).map(s=>({s,d:km(ME,s)}));
  const ok=isSwapV(v)?mine.filter(({s})=>s.kind==="swap"&&s.veh.includes(v.vclass)&&avail(s))
    :mine.filter(({s})=>s.kind==="charge"&&s.conns.some(c=>c.status==="available"&&v.plugs.includes(c.type)));
  return ok.sort((a,b)=>a.d-b.d)[0];}
function holdAt(id){const s=STATIONS.find(x=>x.id===id),v=veh();
  const c=s.kind==="swap"?s.conns.find(c=>c.status==="available"):s.conns.filter(c=>c.status==="available"&&v.plugs.includes(c.type)).sort((a,b)=>b.kw-a.kw)[0];
  if(!c)return toast("Nothing free to hold here right now");releaseHold();c.status="reserved";HOLD={sid:s.id,cid:c.id,until:Date.now()+15*6e4};
  toast(s.kind==="swap"?`Battery in slot ${c.slot} held for 15 minutes`:`${c.type} charger held for 15 minutes`);renderExplore();}
const mmss=ms=>{const t=Math.max(0,Math.round(ms/1000));return Math.floor(t/60)+":"+String(t%60).padStart(2,"0");};
function renderHero(){const el=$("#hero");if(!el)return;const v=veh();
  if(HOLD){const s=STATIONS.find(x=>x.id===HOLD.sid),c=s.conns.find(x=>x.id===HOLD.cid),d=km(ME,s);
    el.innerHTML=`<div class="hero"><div class="k">Held for you · <span id="holdLeft" class="num">${mmss(HOLD.until-Date.now())}</span> left</div>
      <h3>${esc(s.name)}</h3><div class="sub">${s.kind==="swap"?`Full battery in slot ${c.slot}`:`${c.type} · ${c.kw} kW`} · ${d.toFixed(1)} km · ${mins(d)} min · ${money(s.price)}${s.kind==="swap"?"/swap":"/kWh"}</div>
      <div class="acts"><a class="btn" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}">Navigate</a><button class="btn ghost" data-hopen="${s.id}">${s.kind==="swap"?"Swap here":"Charge here"}</button><button class="btn ghost" data-hcancel aria-label="Cancel hold">Cancel</button></div></div>`;return;}
  const b=bestFor(v);
  if(!b){el.innerHTML=`<div class="hero"><div class="k">${isSwapV(v)?"Battery swap":"Charging"} · ${esc(v.name)}</div><h3>Nothing free nearby</h3><div class="sub">Stations in ${esc(C().name)} are busy or don't fit ${esc(v.name)} right now. Try another filter or vehicle.</div></div>`;return;}
  const s=b.s,k=counts(s);
  el.innerHTML=`<div class="hero"><div class="k">${isSwapV(v)?"Nearest swap":"Best charger"} for ${esc(v.name)}</div>
    <h3>${esc(s.name)}</h3><div class="sub">${esc(OPS[s.op].name)} · ${b.d<1?"<1":b.d.toFixed(1)} km · ${mins(b.d)} min · ${s.kind==="swap"?`${k.a} full packs · ${money(s.price)}/swap`:`${k.a} free · ${money(s.price)}/kWh`}</div>
    <div class="acts"><button class="btn" data-hhold="${s.id}">Hold 15 min</button><button class="btn ghost" data-hopen="${s.id}">Details</button></div></div>`;}
document.getElementById("hero").addEventListener("click",e=>{const t=e.target.closest("button");if(!t)return;
  if(t.dataset.hhold)holdAt(t.dataset.hhold);else if(t.dataset.hopen)reopen(t.dataset.hopen);else if("hcancel" in t.dataset){releaseHold();toast("Hold cancelled");renderExplore();}});
setInterval(()=>{if(!HOLD)return;if(Date.now()>HOLD.until){releaseHold();toast("Your hold expired");renderExplore();return;}const e=$("#holdLeft");if(e)e.textContent=mmss(HOLD.until-Date.now());},1000);
document.getElementById("mktPill").onclick=()=>openCountry();

const LOGO=`<span class="mark"><svg viewBox="0 0 200 230" aria-hidden="true"><rect x="70" y="4" width="16" height="36" rx="6" fill="#006B3F"></rect><rect x="114" y="4" width="16" height="36" rx="6" fill="#006B3F"></rect><path d="M100 186 C100 206 118 212 140 212 L152 212" fill="none" class="lks" stroke="#10211A" stroke-width="14" stroke-linecap="round"></path><rect x="150" y="199" width="38" height="26" rx="6" class="lk" fill="#10211A"></rect><rect x="186" y="206" width="8" height="12" rx="2.5" class="lk" fill="#10211A"></rect><rect x="156" y="205" width="7" height="14" rx="1.5" fill="#FCD116"></rect><rect x="165.5" y="205" width="7" height="14" rx="1.5" fill="#FCD116"></rect><rect x="175" y="205" width="7" height="14" rx="1.5" fill="#FCD116"></rect><circle cx="100" cy="112" r="78" fill="#006B3F"></circle><circle cx="100" cy="112" r="67.5" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" stroke-dasharray="318 106" transform="rotate(-90 100 112)" opacity="0.95"></circle><circle cx="100" cy="44.5" r="4.5" fill="#FFFFFF"></circle><circle cx="100" cy="112" r="57" fill="#FCD116"></circle><polygon points="108,70 76,118 98,118 90,154 126,104 104,104 116,70" fill="#10211A" stroke="#10211A" stroke-width="2" stroke-linejoin="round"></polygon></svg></span>`,LOGO_W=`<svg viewBox="0 0 200 230" aria-hidden="true"><rect x="70" y="4" width="16" height="36" rx="6" fill="#FFFFFF"></rect><rect x="114" y="4" width="16" height="36" rx="6" fill="#FFFFFF"></rect><path d="M100 186 C100 206 118 212 140 212 L152 212" fill="none" stroke="#FFFFFF" stroke-width="14" stroke-linecap="round"></path><rect x="150" y="199" width="38" height="26" rx="6" fill="#FFFFFF"></rect><rect x="186" y="206" width="8" height="12" rx="2.5" fill="#FFFFFF"></rect><rect x="156" y="205" width="7" height="14" rx="1.5" fill="#006B3F"></rect><rect x="165.5" y="205" width="7" height="14" rx="1.5" fill="#006B3F"></rect><rect x="175" y="205" width="7" height="14" rx="1.5" fill="#006B3F"></rect><circle cx="100" cy="112" r="78" fill="#FFFFFF"></circle><circle cx="100" cy="112" r="67.5" fill="none" stroke="#006B3F" stroke-width="5" stroke-linecap="round" stroke-dasharray="318 106" transform="rotate(-90 100 112)" opacity="0.95"></circle><circle cx="100" cy="44.5" r="4.5" fill="#006B3F"></circle><circle cx="100" cy="112" r="57" fill="#FCD116"></circle><polygon points="108,70 76,118 98,118 90,154 126,104 104,104 116,70" fill="#10211A" stroke="#10211A" stroke-width="2" stroke-linejoin="round"></polygon></svg>`,KENTE=`<svg class="kente" viewBox="0 0 400 14" preserveAspectRatio="none" aria-hidden="true"><rect x="0" y="0" width="14" height="14" fill="#FCD116"/><rect x="14" y="0" width="6" height="14" fill="#006B3F"/><rect x="20" y="0" width="4" height="14" fill="#FCD116"/><rect x="24" y="0" width="10" height="14" fill="#CE1126"/><rect x="34" y="0" width="4" height="14" fill="#000"/><rect x="38" y="0" width="14" height="14" fill="#FCD116"/><rect x="52" y="0" width="6" height="14" fill="#CE1126"/><rect x="58" y="0" width="4" height="14" fill="#FCD116"/><rect x="62" y="0" width="10" height="14" fill="#006B3F"/><rect x="72" y="0" width="4" height="14" fill="#000"/><rect x="76" y="0" width="14" height="14" fill="#FCD116"/><rect x="90" y="0" width="6" height="14" fill="#006B3F"/><rect x="96" y="0" width="4" height="14" fill="#FCD116"/><rect x="100" y="0" width="10" height="14" fill="#CE1126"/><rect x="110" y="0" width="4" height="14" fill="#000"/><rect x="114" y="0" width="14" height="14" fill="#FCD116"/><rect x="128" y="0" width="6" height="14" fill="#CE1126"/><rect x="134" y="0" width="4" height="14" fill="#FCD116"/><rect x="138" y="0" width="10" height="14" fill="#006B3F"/><rect x="148" y="0" width="4" height="14" fill="#000"/><rect x="152" y="0" width="14" height="14" fill="#FCD116"/><rect x="166" y="0" width="6" height="14" fill="#006B3F"/><rect x="172" y="0" width="4" height="14" fill="#FCD116"/><rect x="176" y="0" width="10" height="14" fill="#CE1126"/><rect x="186" y="0" width="4" height="14" fill="#000"/><rect x="190" y="0" width="14" height="14" fill="#FCD116"/><rect x="204" y="0" width="6" height="14" fill="#CE1126"/><rect x="210" y="0" width="4" height="14" fill="#FCD116"/><rect x="214" y="0" width="10" height="14" fill="#006B3F"/><rect x="224" y="0" width="4" height="14" fill="#000"/><rect x="228" y="0" width="14" height="14" fill="#FCD116"/><rect x="242" y="0" width="6" height="14" fill="#006B3F"/><rect x="248" y="0" width="4" height="14" fill="#FCD116"/><rect x="252" y="0" width="10" height="14" fill="#CE1126"/><rect x="262" y="0" width="4" height="14" fill="#000"/><rect x="266" y="0" width="14" height="14" fill="#FCD116"/><rect x="280" y="0" width="6" height="14" fill="#CE1126"/><rect x="286" y="0" width="4" height="14" fill="#FCD116"/><rect x="290" y="0" width="10" height="14" fill="#006B3F"/><rect x="300" y="0" width="4" height="14" fill="#000"/><rect x="304" y="0" width="14" height="14" fill="#FCD116"/><rect x="318" y="0" width="6" height="14" fill="#006B3F"/><rect x="324" y="0" width="4" height="14" fill="#FCD116"/><rect x="328" y="0" width="10" height="14" fill="#CE1126"/><rect x="338" y="0" width="4" height="14" fill="#000"/><rect x="342" y="0" width="14" height="14" fill="#FCD116"/><rect x="356" y="0" width="6" height="14" fill="#CE1126"/><rect x="362" y="0" width="4" height="14" fill="#FCD116"/><rect x="366" y="0" width="10" height="14" fill="#006B3F"/><rect x="376" y="0" width="4" height="14" fill="#000"/><rect x="380" y="0" width="14" height="14" fill="#FCD116"/><rect x="394" y="0" width="6" height="14" fill="#006B3F"/><rect x="400" y="0" width="4" height="14" fill="#FCD116"/><rect x="404" y="0" width="10" height="14" fill="#CE1126"/><rect x="414" y="0" width="4" height="14" fill="#000"/><rect x="418" y="0" width="14" height="14" fill="#FCD116"/><rect x="432" y="0" width="6" height="14" fill="#CE1126"/><rect x="438" y="0" width="4" height="14" fill="#FCD116"/><rect x="442" y="0" width="10" height="14" fill="#006B3F"/><rect x="452" y="0" width="4" height="14" fill="#000"/><rect x="0" y="5.5" width="400" height="3" fill="#000" opacity=".35"/></svg>`;
const BRAND=`<div class="brandhead">${LOGO}<div><div class="wm">OnePlug</div><div class="tag">One app. Every charge, every swap.</div></div></div>`;
/* ---------- per-device state ---------- */
const KEY="oneplug-africa-v1";
const defaults={bal:Object.fromEntries(Object.entries(COUNTRIES).map(([k,c])=>[k,c.welcome])),tx:Object.entries(COUNTRIES).map(([k,c])=>({cc:k,t:"Welcome credit",a:c.welcome,d:Date.now()-864e5})),history:[],favs:[],vehicles:[{name:"My EV",vclass:"Car",battery:64,soc:34,limit:80,plugs:["CCS2","Type 2"]},{name:"My Okada",vclass:"Motorbike",range:90,soc:18,limit:100,plugs:[]}],vIdx:0};
let S=load();
function load(){try{const r=localStorage.getItem(KEY);return r?Object.assign(JSON.parse(JSON.stringify(defaults)),JSON.parse(r)):JSON.parse(JSON.stringify(defaults));}catch(e){return JSON.parse(JSON.stringify(defaults));}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}

/* ---------- helpers ---------- */
const $=s=>document.querySelector(s);
const ghs=n=>money(n);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function km(a,b){const r=Math.PI/180,dl=(b.lat-a.lat)*r,dg=(b.lng-a.lng)*r;const x=Math.sin(dl/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dg/2)**2;return 12742*Math.asin(Math.sqrt(x));}
function mins(d){return Math.round(d/35*60);}
function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("show");clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove("show"),2300);}

const PREV=[["OnePlug — Country-Neutral App","Neutral badge and market stripes, Ghana stations only","https://claude.ai/artifact/3WRKNeti4oBtG2WMxKucGS"],
  ["OnePlug App Mockup","Design mockup: nearest-station card, holds, Countries screen","https://claude.ai/artifact/DhCd27Tt7GpC2rfLen6mWg"],
  ["OnePlug Ghana","Ghana-flag badge with the black star · the working app","https://claude.ai/artifact/43NABHGN8b2M8fADnh2Sxd"],
  ["OnePlug — Country-Neutral Brand","Master badge and country skins","https://claude.ai/artifact/Hcd4xYinefW97qes9m3DtH"]];
const avail=s=>s.conns.filter(c=>c.status==="available").length;
const sState=s=>avail(s)?"available":s.conns.every(c=>c.status==="offline")?"offline":"busy";
const col={available:"var(--charge)",busy:"var(--busy)",offline:"var(--off)",reserved:"var(--swap)"};
const veh=()=>S.vehicles[S.vIdx];
const counts=s=>({a:s.conns.filter(c=>c.status==="available").length,b:s.conns.filter(c=>c.status==="busy"||c.status==="reserved").length,o:s.conns.filter(c=>c.status==="offline").length});
function ring({a,b,o},size,big){const n=a+b+o,r=15.5,C=2*Math.PI*r,each=n<=16,g=n>1?(each?2.4:1.6):0;let off=0,arcs="";
  [[a,"var(--charge)"],[b,"var(--busy)"],[o,"var(--off)"]].forEach(([k,c])=>{if(!k)return;const parts=each?k:1,step=each?C/n:C*k/n;
    for(let i=0;i<parts;i++){const len=Math.max(step-g,.8);arcs+=`<circle r="${r}" cx="20" cy="20" fill="none" stroke="${c}" stroke-width="${big?4:5}" stroke-dasharray="${len.toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${(-(off+g/2)).toFixed(2)}" transform="rotate(-90 20 20)"/>`;off+=step;}});
  return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true"><circle r="18.5" cx="20" cy="20" fill="var(--surface)"/>${arcs}<text x="20" y="20.5" text-anchor="middle" dominant-baseline="central" font-size="${n>99?10:n>9?13:15}" font-weight="800" fill="var(--ink)">${n}</text></svg>`;}
const ringLabel=s=>{const k=counts(s);return s.kind==="swap"?`Battery swap, ${s.conns.length} slots: ${k.a} full, ${k.b} charging, ${k.o} offline`:`${s.conns.length} chargers installed: ${k.a} available, ${k.b} in use, ${k.o} offline`;};
const isSwapV=v=>v&&v.vclass&&v.vclass!=="Car";
const SLBL=s=>s.kind==="swap"?{available:"Full",busy:"Charging",offline:"Offline"}:{available:"Available",busy:"In use",offline:"Offline"};
const vRange=v=>isSwapV(v)?Math.round(v.soc/100*(v.range||90)):Math.round(v.soc/100*v.battery*6.5);
/* swap-station marker: rounded square in swap blue, battery gauge = share of full packs, number = full packs ready */
function tile({a,b,o},size,big){const n=a+b+o||1,f=a/n,c=a?"var(--charge)":b?"var(--busy)":"var(--off)";
  return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true">
  <rect x="2" y="2" width="36" height="36" rx="10" fill="var(--surface)" stroke="var(--swap)" stroke-width="${big?2.6:3.4}"/>
  <rect x="11" y="7.5" width="16" height="8" rx="2" fill="none" stroke="var(--swap)" stroke-width="1.8"/><rect x="27.6" y="10" width="2" height="3" rx=".6" fill="var(--swap)"/>
  <rect x="12.7" y="9.2" width="${(12.6*Math.max(f,a?.12:0)).toFixed(2)}" height="4.6" rx="1" fill="${c}"/>
  <text x="20" y="27" text-anchor="middle" dominant-baseline="central" font-size="${a>9?12.5:14}" font-weight="800" fill="var(--ink)">${a}</text></svg>`;}
const marker=(s,size,big)=>s.kind==="swap"?tile(counts(s),size,big):ring(counts(s),size,big);

/* ---------- explore ---------- */
const F={q:"",kind:"all",avail:false,fast:false,plug:null,vc:null,op:null,fav:false,area:"gh"};
function setKind(k){F.kind=k;
  if(k==="swap"){F.fast=false;F.plug=null;}if(k==="charge")F.vc=null;
  if(F.op&&k!=="all"&&OPS[F.op].kind!==k)F.op=null;
  renderFilters();renderExplore();}
function renderFilters(){
  $("#kindseg").innerHTML=[["all","All",IC.all],["charge","Charging",IC.bolt],["swap","Battery swap",IC.batt]]
    .map(([k,l,i])=>`<button data-k="${k}" aria-pressed="${F.kind===k}">${i}${l}</button>`).join("");
  const sw=F.kind==="swap",ch=F.kind==="charge";
  $("#filters").innerHTML=`<button class="chip" data-f="avail" aria-pressed="${F.avail}">${sw?"Full batteries":ch?"Available":"Available now"}</button>
  <button class="chip" data-f="fav" aria-pressed="${F.fav}">Saved</button>
  ${sw?"":`<button class="chip" data-f="fast" aria-pressed="${F.fast}">50 kW+</button>`}
  ${sw?"":PLUGS.map(p=>`<button class="chip" data-plug="${p}" aria-pressed="${F.plug===p}">${p}</button>`).join("")}
  ${ch?"":VCLASSES.map(v=>`<button class="chip" data-vc="${v}" aria-pressed="${F.vc===v}">${v==="Motorbike"?"E-motorbike":"E-tricycle"}</button>`).join("")}
  ${Object.entries(OPS).filter(([k,o])=>o.cc===CC&&(F.kind==="all"||o.kind===F.kind)).map(([k,o])=>`<button class="chip" data-op="${k}" aria-pressed="${F.op===k}">${o.name}</button>`).join("")}`;
}
$("#kindseg").addEventListener("click",e=>{const b=e.target.closest("button");if(b)setKind(b.dataset.k);});
$("#filters").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;
  if(b.dataset.f)F[b.dataset.f]=!F[b.dataset.f];else if(b.dataset.plug)F.plug=F.plug===b.dataset.plug?null:b.dataset.plug;
  else if(b.dataset.vc)F.vc=F.vc===b.dataset.vc?null:b.dataset.vc;else F.op=F.op===b.dataset.op?null:b.dataset.op;
  renderFilters();renderExplore();});
function renderLegend(){
  const sw=F.kind==="swap",ch=F.kind==="charge";
  const shapes=(sw?"":`<span class="shape"><span class="chipic">${IC.bolt}</span>Charger</span>`)+(ch?"":`<span class="shape"><span class="chipic swap">${IC.batt}</span>Battery swap</span>`);
  $("#legend").innerHTML=`${shapes}<span><i style="background:var(--charge)"></i>${sw?"Full":ch?"Available":"Available / full"}</span><span><i style="background:var(--busy)"></i>${sw?"Charging":ch?"In use":"In use / charging"}</span><span><i style="background:var(--off)"></i>Offline</span>`;}
$("#q").addEventListener("input",e=>{F.q=e.target.value.trim().toLowerCase();renderExplore();});

function filtered(){
  return STATIONS.filter(s=>{
    if(s.cc!==CC)return false;
    if(F.q&&!(s.name+" "+s.area+" "+OPS[s.op].name+" "+(s.kind==="swap"?"battery swap "+s.veh.join(" "):"charger")).toLowerCase().includes(F.q))return false;
    if(F.kind!=="all"&&s.kind!==F.kind)return false;
    if(F.avail&&!avail(s))return false;
    if(F.fast&&(s.kind!=="charge"||!s.conns.some(c=>c.kw>=50)))return false;
    if(F.plug&&(s.kind!=="charge"||!s.conns.some(c=>c.type===F.plug)))return false;
    if(F.vc&&(s.kind!=="swap"||!s.veh.includes(F.vc)))return false;
    if(F.op&&s.op!==F.op)return false;
    if(F.fav&&!S.favs.includes(s.id))return false;
    return true;}).map(s=>({...s,dist:km(ME,s)})).sort((a,b)=>a.dist-b.dist);
}
/* ---------- Google Maps ---------- */
let gmap=null,AME=null,clusterer=null,meMarker=null,markers={},currentList=[];
const GHANA_BOUNDS={north:11.2,south:4.7,west:-3.3,east:1.25};
function showMapNotice(html){$("#map").innerHTML=`<div class="map-notice">${html}</div>`;}
function colorScheme(){const t=document.documentElement.dataset.theme;return t==="dark"?"DARK":t==="light"?"LIGHT":"FOLLOW_SYSTEM";}
function loadGoogleMaps(){
  if(!GOOGLE_MAPS_API_KEY||GOOGLE_MAPS_API_KEY.startsWith("YOUR_")){
    showMapNotice(`<b>Map not connected</b>Google Maps loads when this file is hosted on your own site with your API key and Map ID pasted into <code>GOOGLE_MAPS_API_KEY</code> and <code>GOOGLE_MAP_ID</code>. Everything else in the app works here.`);return;}
  window.gm_authFailure=()=>showMapNotice(`<b>Google Maps rejected the key</b>Check that billing is on, the Maps JavaScript API is enabled, and the key's website restrictions include this domain.`);
  window.__gmInit=()=>initMap().catch(()=>showMapNotice(`<b>The map couldn't load</b>Check your connection and the Map ID, then reload.`));
  const sc=document.createElement("script");
  sc.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&v=weekly&loading=async&callback=__gmInit`;
  sc.async=true;sc.onerror=()=>showMapNotice(`<b>The map couldn't load</b>Google Maps didn't respond. Check your connection and reload.`);
  document.head.appendChild(sc);
}
function pinEl(s){const d=document.createElement("div");
  if(s.kind==="swap"){d.className="gswap";d.innerHTML=tile(counts(s),40)+`<span class="kbadge swap">${IC.batt}</span>`;}
  else{d.className="gring";d.innerHTML=ring(counts(s),40)+`<span class="kbadge">${IC.bolt}</span>`;}
  return d;}
async function initMap(){
  const {Map}=await google.maps.importLibrary("maps");
  ({AdvancedMarkerElement:AME}=await google.maps.importLibrary("marker"));
  if(clusterer){clusterer.clearMarkers();clusterer=null;}
  $("#map").innerHTML="";
  gmap=new Map($("#map"),{center:{lat:7.9,lng:-1.0},zoom:6,mapId:GOOGLE_MAP_ID,colorScheme:colorScheme(),
    disableDefaultUI:true,clickableIcons:false,gestureHandling:"greedy"});
  fitGhana();
  const me=document.createElement("div");me.className="gme";
  meMarker=new AME({map:gmap,position:{lat:ME.lat,lng:ME.lng},content:me,title:"You",zIndex:999});
  markers={};
  STATIONS.forEach(s=>{
    const m=new AME({position:{lat:s.lat,lng:s.lng},title:`${s.name}: ${ringLabel(s)}`,content:pinEl(s),gmpClickable:true});
    m.__s=s;m.addListener("click",()=>openStation(s.id));markers[s.id]=m;});
  if(window.markerClusterer){
    clusterer=new markerClusterer.MarkerClusterer({map:gmap,markers:[],renderer:{render:({count,position,markers:ms})=>{
      const k=ms.reduce((t,m)=>{const c=counts(m.__s);t.a+=c.a;t.b+=c.b;t.o+=c.o;return t;},{a:0,b:0,o:0}),el=document.createElement("div");
      el.className="gring";el.innerHTML=ring(k,52);
      return new AME({position,content:el,title:`${count} stations: ${k.a} available or full, ${k.b} in use or charging, ${k.o} offline`,zIndex:1000+count});}}});
  }
  renderMap(currentList.length?currentList:filtered());
}
function renderMap(list){
  currentList=list;if(!gmap)return;
  const show=new Set(list.map(s=>s.id)),vis=[];
  STATIONS.forEach(s=>{const m=markers[s.id];if(!m)return;m.content=pinEl(s);m.title=`${s.name}: ${ringLabel(s)}`;
    if(show.has(s.id))vis.push(m);else if(!clusterer)m.map=null;});
  if(clusterer){clusterer.clearMarkers(true);clusterer.addMarkers(vis);}
  else vis.forEach(m=>m.map=gmap);
}
function fitGhana(){if(gmap)gmap.fitBounds(C().bounds,{top:190,bottom:40,left:10,right:60});}
$("#fitBtn").onclick=fitGhana;
$("#zin").onclick=()=>gmap&&gmap.setZoom(gmap.getZoom()+1);
$("#zout").onclick=()=>gmap&&gmap.setZoom(gmap.getZoom()-1);
$("#meBtn").onclick=()=>{
  const goMe=()=>{if(!gmap)return;gmap.panTo({lat:ME.lat,lng:ME.lng});gmap.setZoom(13);};
  if(!navigator.geolocation){toast("Location isn't available. Showing Accra.");goMe();return;}
  navigator.geolocation.getCurrentPosition(p=>{ME.lat=p.coords.latitude;ME.lng=p.coords.longitude;
      if(meMarker)meMarker.position={lat:ME.lat,lng:ME.lng};renderExplore();goMe();},
    ()=>{toast("Location is off. Showing Accra.");goMe();},{enableHighAccuracy:true,timeout:8000});
};
async function initMini(s){
  const el=$("#mini");if(!el)return;
  if(!gmap){el.style.display="none";return;}
  const {Map}=await google.maps.importLibrary("maps");
  const mm=new Map(el,{center:{lat:s.lat,lng:s.lng},zoom:15,mapId:GOOGLE_MAP_ID,colorScheme:colorScheme(),
    disableDefaultUI:true,gestureHandling:"none",keyboardShortcuts:false,clickableIcons:false});
  new AME({map:mm,position:{lat:s.lat,lng:s.lng},content:pinEl(s)});
}
function bars(s){return `<div class="bars" aria-hidden="true">${s.conns.map(c=>`<i class="${c.status==="available"?"on":c.status==="busy"||c.status==="reserved"?"bz":"of"}"></i>`).join("")}</div>`;}
function renderExplore(){
  const list=filtered();renderMap(list);
  const nc=list.filter(s=>s.kind==="charge").length,ns=list.length-nc;renderLegend();renderHero();
  $("#netLabel").textContent=F.kind==="charge"?`${nc} charging stations`:F.kind==="swap"?`${ns} swap stations`:`${nc} charging · ${ns} swap`;
  $("#list").innerHTML=list.length?list.map(s=>{const k=counts(s);
    if(s.kind==="swap")return `<button class="st-card swap" data-id="${s.id}">
      <span><h3>${esc(s.name)}<span class="tag-kind">${IC.batt}Battery swap</span></h3><div class="st-sub">${OPS[s.op].name} · <span class="stars">★</span>${rtg(s).avg.toFixed(1)} · ${s.dist<1?"<1":s.dist.toFixed(0)} km · ${mins(s.dist)} min · ${s.veh.map(v=>v==="Motorbike"?"E-motorbike":"E-tricycle").join(", ")}</div><div class="st-sub">${k.a} full · ${k.b} charging${k.o?` · ${k.o} offline`:""}</div></span>
      <span class="stalls" role="img" aria-label="${ringLabel(s)}"><span style="display:flex;justify-content:flex-end"><span class="gswap" style="filter:none;cursor:inherit">${tile(k,46)}<span class="kbadge swap">${IC.batt}</span></span></span><div class="lbl">${ghs(s.price)}/swap</div></span>
    </button>`;
    const mx=Math.max(...s.conns.map(c=>c.kw));
    return `<button class="st-card" data-id="${s.id}">
      <span><h3>${esc(s.name)}<span class="tag-kind charge">${IC.bolt}Charging</span></h3><div class="st-sub">${OPS[s.op].name} · <span class="stars">★</span>${rtg(s).avg.toFixed(1)} · ${s.dist<1?"<1":s.dist.toFixed(0)} km · ${mins(s.dist)} min · up to ${mx} kW</div><div class="st-sub">${counts(s).a} available · ${counts(s).b} in use${counts(s).o?` · ${counts(s).o} offline`:""}</div></span>
      <span class="stalls" role="img" aria-label="${ringLabel(s)}"><span style="display:flex;justify-content:flex-end"><span class="gring" style="filter:none;cursor:inherit">${ring(counts(s),46)}<span class="kbadge">${IC.bolt}</span></span></span><div class="lbl">${ghs(s.price)}/kWh</div></span>
    </button>`;}).join(""):`<div class="empty">No stations match. Remove a filter or switch to All.</div>`;
}
$("#list").addEventListener("click",e=>{const b=e.target.closest(".st-card");if(b)openStation(b.dataset.id);});

/* ---------- full-screen page ---------- */
let lastFocus=null;
function openPage(html,dock){lastFocus=document.activeElement;$("#pageBody").innerHTML=html;$("#page").classList.add("open");$("#page").scrollTop=0;
  if(dock){$("#dockBody").innerHTML=dock;$("#dock").classList.add("open");}else $("#dock").classList.remove("open");
  document.body.style.overflow="hidden";setTimeout(()=>{const f=$("#pageBody").querySelector("button,input");f&&f.focus();},30);}
function closePage(){$("#page").classList.remove("open");$("#dock").classList.remove("open");document.body.style.overflow="";lastFocus&&lastFocus.focus&&lastFocus.focus();}
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&$("#page").classList.contains("open"))closePage();});
const backBtn=`<button class="iconbtn" data-close aria-label="Back"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m15 5-7 7 7 7"/></svg></button>`;
document.addEventListener("click",e=>{if(e.target.closest("[data-close]"))closePage();});

/* ---------- server calls ---------- */
async function postJSON(path,body){const r=await fetch(API+path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  let j=null;try{j=await r.json();}catch(e){}if(!r.ok)throw new Error((j&&j.error)||`Request failed (${r.status})`);return j;}
/* merge fresh community data from the server without touching live connector state (holds, sessions) */
function applyStation(st){const s=STATIONS.find(x=>x.id===st.id);if(!s)return;s.r0=st.r0;s.n0=st.n0;s.reports=st.reports;s.confirmedAt=st.confirmedAt;}
/* ---------- ratings, problem reports & status freshness ---------- */
const ISSUES={charge:["Charger not working","Status shown is wrong","Blocked by a petrol car","Payment failed","Cable damaged","Station closed"],
  swap:["No full batteries","Battery wouldn't release","Status shown is wrong","Payment failed","Station closed"]};
function rtg(s){const mine=(S.reviews||{})[s.id]||[];return {avg:s.r0,n:s.n0,mine};}
function ago(t){const m=Math.max(1,Math.round((Date.now()-t)/6e4));return m<60?m+" min ago":m<1440?Math.round(m/60)+" h ago":Math.round(m/1440)+" d ago";}
function freshLine(s){const c=(S.confirms||{})[s.id],base=Date.now()-s.upd*6e4,sc=s.confirmedAt||0;const t=Math.max(base,c||0,sc);
  return `Updated ${ago(t)} · ${c&&c===t?"confirmed by you":sc&&sc===t?"confirmed by a driver":"live from "+esc(OPS[s.op].name)}`;}
function starStr(a){const f=Math.round(a);return "★".repeat(f)+"☆".repeat(5-f);}
function communityBlock(s){const r=rtg(s),reps=(s.reports||[]).filter(x=>x.d>Date.now()-864e5*3),open=CMOPEN.has(s.id);
  return `<button class="cm-toggle" data-cm="toggle" data-sid="${s.id}" aria-expanded="${open}" aria-controls="cmPanel">
    <span class="grow"><span class="cm-t">Ratings &amp; reports</span>
    <span class="cm-sum"><span class="stars">★</span> ${r.avg.toFixed(1)} · ${r.n} ratings${reps.length?` · <span class="cm-badge">${reps.length} problem${reps.length>1?"s":""} reported</span>`:" · No problems reported"}</span></span>
    <svg class="chev" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
  <div id="cmPanel" class="cm-panel"${open?"":" hidden"}>
  <div class="group">
    <div class="row"><span class="cm-rate"><b>${r.avg.toFixed(1)}</b><span class="stars" aria-label="${r.avg.toFixed(1)} out of 5 stars">${starStr(r.avg)}</span></span><span class="muted">${r.n} ratings</span></div>
    ${reps.length?reps.slice(-3).reverse().map(x=>`<div class="row rep-item"><span><i class="stat-dot" style="background:var(--rep-strong)"></i></span><span class="grow"><b>${esc(x.issue)}</b><div class="st-sub">Reported ${ago(x.d)}${x.note?" · "+esc(x.note):""}</div>${x.units&&x.units.length?`<div class="rep-units">${x.units.map(u=>`<span>${esc(u)}</span>`).join("")}</div>`:""}${x.photos&&x.photos.length?`<div class="rep-thumbs">${x.photos.map((p,i)=>`<img src="${p}" alt="Report photo ${i+1}">`).join("")}</div>`:""}</span></div>`).join(""):`<div class="row"><span class="muted">No problems reported in the last 3 days</span></div>`}
    ${r.mine.slice(-2).reverse().map(x=>`<div class="row"><span class="grow"><span class="stars">${starStr(x.r)}</span><div class="st-sub">Your rating · ${ago(x.d)}${x.t?" · “"+esc(x.t)+"”":""}</div></span></div>`).join("")}
  </div>
  <div class="cm-actions">
    <button class="btn soft" data-cm="rate" data-sid="${s.id}">★ Rate station</button>
    <button class="btn soft rep-btn" data-cm="report" data-sid="${s.id}">${RIC.alert}Report problem</button>
  </div>
  <button class="btn soft block" data-cm="ok" data-sid="${s.id}" style="margin-bottom:8px">✓ Status looks right</button>
  <div id="cmBox"></div></div>`;}
const CM={stars:0,issue:null,units:new Set(),photos:[]};
const CMOPEN=new Set();
const RIC={alert:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>`,
  wand:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 4 5 5L9 20H4v-5z"/><path d="M19 2v3M20.5 3.5h-3"/></svg>`,
  cam:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/></svg>`,
  x:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>`,
  tick:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>`};
const unitName=(s,c)=>s.kind==="swap"?`Slot ${c.slot}`:`Charger ${c.id.split("-").pop()}`;
const unitSub=(s,c)=>(s.kind==="swap"?"":`${c.type} · `)+({available:s.kind==="swap"?"Full":"Free",busy:s.kind==="swap"?"Charging":"In use",offline:"Offline",reserved:"Held"}[c.status]||"");
function autoUnits(s){
  if(HOLD&&HOLD.sid===s.id)return {ids:[HOLD.cid],why:"the one you're holding"};
  const last=S.history.find(h=>h.station===s.name&&(h.cid||h.slot));
  if(last){const c=last.cid?s.conns.find(c=>c.id===last.cid):s.conns.find(c=>c.slot===last.slot);if(c)return {ids:[c.id],why:"the one you last used"};}
  const off=s.conns.filter(c=>c.status==="offline").map(c=>c.id);
  if(off.length)return {ids:off,why:off.length>1?"the ones showing offline":"the one showing offline"};
  return {ids:[],why:""};}
function reportHTML(s){const id=s.id,sw=s.kind==="swap";
  return `<div class="rep-card" role="group" aria-label="Report a problem">
    <div class="rep-head"><span class="ic">${RIC.alert}</span><div><h3>Report a problem</h3><p>Goes straight to ${esc(OPS[s.op].name)} · ${esc(s.name)}</p></div></div>
    <div class="rep-body">
      <div class="rep-step"><span><span class="n">1</span>Which ${sw?"batteries":"chargers"}?</span><button class="auto" data-cm="auto" data-sid="${id}">${RIC.wand}Auto-select</button></div>
      <div class="units" role="group" aria-label="Affected ${sw?"battery slots":"chargers"}">${s.conns.map(c=>`<button class="unit" data-cm="unit" data-sid="${id}" data-u="${c.id}" aria-pressed="false"><b>${unitName(s,c)}</b>${unitSub(s,c)}<i class="sd" style="background:${col[c.status]}"></i><span class="tick">${RIC.tick}</span></button>`).join("")}</div>
      <div class="rep-step"><span><span class="n">2</span>What's wrong?</span></div>
      <div class="issue">${ISSUES[s.kind].map(x=>`<button data-cm="issue" data-sid="${id}" data-i="${esc(x)}" aria-pressed="false">${esc(x)}</button>`).join("")}</div>
      <div class="rep-step"><span><span class="n">3</span>Add photos</span><span class="opt-l">Optional · up to 3</span></div>
      <div class="photos" id="repPhotos"></div>
      <textarea id="cmText" maxlength="200" placeholder="Anything else? (e.g. screen shows error E-42, cable cut near the plug)"></textarea>
      <button class="btn block rep-send" data-cm="sendRep" data-sid="${id}" style="margin-top:12px" disabled>Pick what's wrong to send</button>
    </div></div>`;}
function drawPhotos(){const el=$("#repPhotos");if(!el)return;
  el.innerHTML=CM.photos.map((p,i)=>`<div class="ph"><img src="${p}" alt="Photo ${i+1} of the problem"><button type="button" data-cm="phdel" data-i="${i}" aria-label="Remove photo ${i+1}">${RIC.x}</button></div>`).join("")
    +(CM.photos.length<3?`<label class="addph">${RIC.cam}${CM.photos.length?"Add more":"Add photo"}<input type="file" id="repPhoto" accept="image/*" multiple aria-label="Add photo of the problem"></label>`:"");}
function addPhotos(files){[...files].filter(f=>f.type.startsWith("image/")).slice(0,3-CM.photos.length).forEach(f=>{
  const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{if(CM.photos.length>=3)return;const k=Math.min(1,480/Math.max(im.width,im.height)),cv=document.createElement("canvas");
    cv.width=Math.round(im.width*k);cv.height=Math.round(im.height*k);cv.getContext("2d").drawImage(im,0,0,cv.width,cv.height);CM.photos.push(cv.toDataURL("image/jpeg",.72));drawPhotos();updateSend();};im.src=r.result;};r.readAsDataURL(f);});}
document.addEventListener("change",e=>{if(e.target.id==="repPhoto"&&e.target.files.length)addPhotos(e.target.files);});
function updateSend(){const btn=$("#cmBox [data-cm=sendRep]");if(!btn)return;const s=STATIONS.find(x=>x.id===btn.dataset.sid),n=CM.units.size,sw=s.kind==="swap";
  const what=n?` · ${n} ${sw?(n>1?"batteries":"battery"):(n>1?"chargers":"charger")}`:"",pics=CM.photos.length?` · ${CM.photos.length} photo${CM.photos.length>1?"s":""}`:"";
  btn.disabled=!CM.issue;btn.textContent=CM.issue?`Send report${what}${pics}`:"Pick what's wrong to send";}
function syncUnits(){document.querySelectorAll("#cmBox [data-cm=unit]").forEach(x=>x.setAttribute("aria-pressed",CM.units.has(x.dataset.u)));updateSend();}
function reopen(id){const s=STATIONS.find(x=>x.id===id);s.kind==="swap"?openSwapStation(id):openStation(id);}
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-cm]");if(!b)return;const id=b.dataset.sid,s=STATIONS.find(x=>x.id===id),box=$("#cmBox"),act=b.dataset.cm;
  if(act==="toggle"){const o=!CMOPEN.has(id);o?CMOPEN.add(id):CMOPEN.delete(id);b.setAttribute("aria-expanded",o);$("#cmPanel").hidden=!o;if(o)b.scrollIntoView({behavior:"smooth",block:"start"});return;}
  if(act==="rate"){CM.stars=0;box.innerHTML=`<div class="cm-box"><h3>Rate ${esc(s.name)}</h3>
      <div class="star-pick" role="radiogroup" aria-label="Stars">${[1,2,3,4,5].map(n=>`<button data-cm="star" data-sid="${id}" data-n="${n}" aria-pressed="false" aria-label="${n} star${n>1?"s":""}">★</button>`).join("")}</div>
      <textarea id="cmText" maxlength="160" placeholder="Optional: what was it like? (e.g. fast, clean, friendly staff)"></textarea>
      <button class="btn block" data-cm="sendRate" data-sid="${id}" style="margin-top:10px" disabled>Submit rating</button></div>`;box.scrollIntoView({behavior:"smooth",block:"nearest"});}
  else if(act==="star"){CM.stars=+b.dataset.n;box.querySelectorAll("[data-cm=star]").forEach(x=>x.setAttribute("aria-pressed",+x.dataset.n<=CM.stars));box.querySelector("[data-cm=sendRate]").disabled=false;}
  else if(act==="sendRate"){const t=($("#cmText").value||"").trim(),r=CM.stars;b.disabled=true;
    postJSON(`/stations/${encodeURIComponent(id)}/reviews`,{stars:r,text:t}).then(st=>{applyStation(st);S.reviews=S.reviews||{};(S.reviews[id]=S.reviews[id]||[]).push({r,t,d:Date.now()});save();reopen(id);toast("Thanks for rating "+s.name);})
      .catch(err=>{b.disabled=false;toast(err.message||"Couldn't send your rating. Try again.");});}
  else if(act==="report"){CM.issue=null;CM.units=new Set();CM.photos=[];box.innerHTML=reportHTML(s);drawPhotos();box.scrollIntoView({behavior:"smooth",block:"start"});}
  else if(act==="unit"){const u=b.dataset.u;CM.units.has(u)?CM.units.delete(u):CM.units.add(u);syncUnits();}
  else if(act==="auto"){const a=autoUnits(s);if(!a.ids.length){toast(`Nothing stands out. Tap the affected ${s.kind==="swap"?"batteries":"chargers"}.`);return;}
    CM.units=new Set(a.ids);syncUnits();toast(`Selected ${a.ids.map(u=>unitName(s,s.conns.find(c=>c.id===u))).join(", ")}: ${a.why}. Tap to change.`);}
  else if(act==="phdel"){CM.photos.splice(+b.dataset.i,1);drawPhotos();updateSend();}
  else if(act==="issue"){CM.issue=b.dataset.i;box.querySelectorAll("[data-cm=issue]").forEach(x=>x.setAttribute("aria-pressed",x===b));updateSend();}
  else if(act==="sendRep"){const units=[...CM.units].map(u=>unitName(s,s.conns.find(c=>c.id===u))),n=CM.photos.length;
    b.disabled=true;
    postJSON(`/stations/${encodeURIComponent(id)}/reports`,{issue:CM.issue,units,photos:CM.photos.slice(),note:(($("#cmText")||{}).value||"").trim()}).then(st=>{applyStation(st);reopen(id);
    toast(`Report sent to ${OPS[s.op].name}${units.length?" for "+units.join(", "):""}${n?` with ${n} photo${n>1?"s":""}`:""}. Thank you`);})
      .catch(err=>{b.disabled=false;toast(err.message||"Couldn't send your report. Try again.");});}
  else if(act==="ok"){b.disabled=true;postJSON(`/stations/${encodeURIComponent(id)}/confirm`,{}).then(st=>{applyStation(st);S.confirms=S.confirms||{};S.confirms[id]=Date.now();save();reopen(id);toast("Thanks — status confirmed");})
      .catch(err=>{b.disabled=false;toast(err.message||"Couldn't confirm. Try again.");});}
});

function openStation(id,sel){
  const s=STATIONS.find(x=>x.id===id),v=veh(),fav=S.favs.includes(id),d=km(ME,s);
  if(s.kind==="swap")return openSwapStation(id);
  const ok=c=>(c.status==="available"||(HOLD&&HOLD.cid===c.id))&&v.plugs.includes(c.type);
  if(!sel&&HOLD&&HOLD.sid===id)sel=HOLD.cid;
  if(!sel){const f=s.conns.filter(ok).sort((a,b)=>b.kw-a.kw)[0];sel=f&&f.id;}
  openPage(`
    <div class="topbar">${backBtn}
      <button class="iconbtn" id="favBtn" aria-label="${fav?"Remove from saved":"Save station"}"><svg width="20" height="20" viewBox="0 0 24 24" fill="${fav?"currentColor":"none"}" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 17.3 5.8 21l1.6-7L2 9.3l7.2-.6L12 2l2.8 6.7 7.2.6-5.4 4.7 1.6 7z"/></svg></button></div>
    <div class="kind-banner"><span class="ic">${IC.bolt}</span>Charging station</div>
    <div class="muted">${OPS[s.op].name} network</div>
    <h1 class="hero-name">${esc(s.name)}</h1>
    <div class="ring-hero" role="img" aria-label="${ringLabel(s)}"><span class="mk">${ring(counts(s),96,true)}<span class="kbadge big-badge">${IC.bolt}</span></span><div class="counts">
      <span><i class="stat-dot" style="background:var(--charge)"></i><b>${counts(s).a}</b> available</span>
      <span><i class="stat-dot" style="background:var(--busy)"></i><b>${counts(s).b}</b> in use</span>
      <span><i class="stat-dot" style="background:var(--off)"></i><b>${counts(s).o}</b> offline</span><span class="fresh">${freshLine(s)}</span></div></div>
    <div class="minimap" id="mini" aria-hidden="true"></div>
    <div class="group">
      <div class="row"><span class="muted">Price</span><b>${ghs(s.price)} per kWh</b></div>
      <div class="row"><span class="muted">Distance</span><b>${d.toFixed(1)} km · ${mins(d)} min</b></div>
      <div class="row"><span class="muted">Hours</span><b>${esc(s.hours)}</b></div>
      <div class="row"><span class="muted">Nearby</span><b style="text-align:right">${esc(s.amen)}</b></div>
    </div>
    <div class="sec-title">Choose a charger</div>
    <div class="group" role="radiogroup" aria-label="Chargers">
      ${s.conns.map(c=>{const fits=v.plugs.includes(c.type);return `<button class="conn" role="radio" data-c="${c.id}" aria-pressed="${sel===c.id}" aria-checked="${sel===c.id}" ${ok(c)?"":"disabled"}>
        <span class="radio"></span><span class="grow"><b>${c.type} · ${c.kw} kW</b><div class="st-sub">${c.id}${fits?"":" · doesn't fit "+esc(v.name)}</div></span>
        <span class="st-sub"><i class="stat-dot" style="background:${col[c.status]}"></i>${c.status==="available"?"Available":c.status==="busy"?"In use":c.status==="reserved"?"Held for you":"Offline"}</span></button>`;}).join("")}
    </div>
    ${communityBlock(s)}
    <p class="note">No ${OPS[s.op].name} account needed. You pay from your OnePlug wallet.</p>`,
  `<a class="btn soft" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}">Navigate</a>
   <button class="btn block" id="startBtn" ${sel?"":"disabled"}>${sel?"Start charging":isSwapV(v)?`Your ${v.vclass.toLowerCase()} uses battery swap`:"No compatible charger free"}</button>`);
  initMini(s);
  $("#favBtn").onclick=()=>{fav?S.favs=S.favs.filter(x=>x!==id):S.favs.push(id);save();openStation(id,sel);toast(fav?"Removed from saved":"Saved");};
  $("#pageBody").querySelectorAll("[data-c]").forEach(b=>b.onclick=()=>openStation(id,b.dataset.c));
  $("#startBtn").onclick=()=>{const c=s.conns.find(c=>c.id===sel);const need=Math.max(0,(v.limit-v.soc)/100*v.battery)*s.price;
    if(S.bal[CC]<Math.min(need,s.price*4)){toast("Top up your wallet to start charging");closePage();go("wallet");openTopup();return;}
    closePage();startSession(s,c);};
}

/* ---------- battery swap ---------- */
const favIcon=fav=>`<svg width="20" height="20" viewBox="0 0 24 24" fill="${fav?"currentColor":"none"}" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 17.3 5.8 21l1.6-7L2 9.3l7.2-.6L12 2l2.8 6.7 7.2.6-5.4 4.7 1.6 7z"/></svg>`;
const vcl=v=>v==="Motorbike"?"E-motorbike":v==="Tricycle"?"E-tricycle":v;
function slotGrid(s,pick){return `<div class="slotgrid" role="img" aria-label="${ringLabel(s)}">${s.conns.map(c=>`<div class="slot ${c.status==="available"?"full":c.status==="busy"?"chg":"off"}${pick===c.id?" pick":""}"><span class="cell"><i></i></span>${c.slot}</div>`).join("")}</div>`;}
function openSwapStation(id){
  const s=STATIONS.find(x=>x.id===id),v=veh(),fav=S.favs.includes(id),d=km(ME,s),k=counts(s);
  const mine=S.vehicles.map((x,i)=>[x,i]).filter(([x])=>isSwapV(x));
  const fits=isSwapV(v)&&s.veh.includes(v.vclass),held=HOLD&&HOLD.sid===id,can=fits&&(k.a>0||held);
  openPage(`
    <div class="topbar">${backBtn}<button class="iconbtn" id="favBtn" aria-label="${fav?"Remove from saved":"Save station"}">${favIcon(fav)}</button></div>
    <div class="kind-banner swap"><span class="ic">${IC.batt}</span>Battery swap station</div>
    <div class="muted">${OPS[s.op].name} network</div>
    <h1 class="hero-name">${esc(s.name)}</h1>
    <div class="ring-hero" role="img" aria-label="${ringLabel(s)}"><span class="mk">${tile(k,96,true)}<span class="kbadge swap big-badge">${IC.batt}</span></span><div class="counts">
      <span><i class="stat-dot" style="background:var(--charge)"></i><b>${k.a}</b> full batteries</span>
      <span><i class="stat-dot" style="background:var(--busy)"></i><b>${k.b}</b> charging</span>
      <span><i class="stat-dot" style="background:var(--off)"></i><b>${k.o}</b> offline</span><span class="fresh">${freshLine(s)}</span></div></div>
    <div class="minimap" id="mini" aria-hidden="true"></div>
    <div class="group">
      <div class="row"><span class="muted">Swap price</span><b>${ghs(s.price)} per swap</b></div>
      <div class="row"><span class="muted">Swap time</span><b>About 2 minutes</b></div>
      <div class="row"><span class="muted">Vehicles</span><b>${s.veh.map(vcl).join(", ")}</b></div>
      <div class="row"><span class="muted">Battery pack</span><b>${esc(s.pack)}</b></div>
      <div class="row"><span class="muted">Distance</span><b>${d.toFixed(1)} km · ${mins(d)} min</b></div>
      <div class="row"><span class="muted">Hours</span><b>${esc(s.hours)}</b></div>
      <div class="row"><span class="muted">Nearby</span><b style="text-align:right">${esc(s.amen)}</b></div>
    </div>
    <div class="sec-title">Battery slots</div>
    ${slotGrid(s)}
    <div class="sec-title">Swapping for</div>
    ${mine.length?`<div class="group" role="radiogroup" aria-label="Vehicle">${mine.map(([x,i])=>{const ok=s.veh.includes(x.vclass);return `<button class="conn" role="radio" data-v="${i}" aria-pressed="${i===S.vIdx}" aria-checked="${i===S.vIdx}">
        <span class="radio"></span><span class="grow"><b>${esc(x.name)}</b><div class="st-sub">${vcl(x.vclass)} · ${x.soc}% battery${ok?"":" · not supported here"}</div></span></button>`;}).join("")}</div>`
      :`<p class="note">Battery swap is for e-motorbikes and e-tricycles. Add one in Account to swap here.</p>`}
    ${communityBlock(s)}
    <p class="note">No ${OPS[s.op].name} account needed. Swaps are paid from your OnePlug wallet.</p>`,
  `<a class="btn soft" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}">Navigate</a>
   <button class="btn block" id="swapBtn" ${can?"":"disabled"}>${can?`Swap battery · ${ghs(s.price)}`:!isSwapV(v)?"Pick a swap vehicle":!fits?`No ${vcl(v.vclass).toLowerCase()} packs here`:"No full batteries right now"}</button>`);
  initMini(s);
  $("#favBtn").onclick=()=>{fav?S.favs=S.favs.filter(x=>x!==id):S.favs.push(id);save();openSwapStation(id);toast(fav?"Removed from saved":"Saved");};
  $("#pageBody").querySelectorAll("[data-v]").forEach(b=>b.onclick=()=>{if(SES)return toast("Stop charging first");S.vIdx=+b.dataset.v;save();openSwapStation(id);});
  $("#swapBtn").onclick=()=>{if(S.bal[CC]<s.price){toast("Top up your wallet to swap");closePage();go("wallet");openTopup();return;}runSwap(s);};
}
function runSwap(s){
  const v=veh(),take=(HOLD&&HOLD.sid===s.id&&s.conns.find(c=>c.id===HOLD.cid))||s.conns.find(c=>c.status==="available"),from=v.soc;
  take.status="reserved";HOLD=null;
  const steps=[`Full battery reserved in slot ${take.slot}`,`Switch off your ${vcl(v.vclass).toLowerCase()} and remove the empty battery`,`Slot ${take.slot} opens: leave your empty battery, take the full one`,`Paid ${ghs(s.price)} from your wallet`];
  let n=0;
  const draw=()=>{openPage(`<div class="topbar"><span></span><span></span></div>
    <div class="muted">${OPS[s.op].name} · ${esc(s.name)}</div>
    <h1 class="hero-name">${n<steps.length?"Swapping battery":"Swap complete"}</h1>
    ${slotGrid(s,take.id)}
    <ol class="steps">${steps.map((t,i)=>`<li class="${i<n?"done":i===n?"now":""}"><span class="dot">${i<n?"✓":i+1}</span>${t}</li>`).join("")}</ol>
    ${n<steps.length?`<p class="note">Demo: each step completes automatically.</p>`:`
    <div class="sec-title">Receipt</div>
    <div class="group">
      <div class="row"><span class="muted">Vehicle</span><b>${esc(v.name)}</b></div>
      <div class="row"><span class="muted">Battery</span><b class="num">${from}% → 100%</b></div>
      <div class="row"><span class="muted">Range now</span><b class="num">About ${v.range||90} km</b></div>
      <div class="row"><span class="muted">Network</span><b>${OPS[s.op].name}</b></div>
      <div class="row"><span class="muted">Paid from wallet</span><b class="num">${ghs(s.price)}</b></div>
    </div>`}`,n<steps.length?null:`<button class="btn block" id="swapDone">Done</button>`);
    if(n>=steps.length)$("#swapDone").onclick=()=>{closePage();go("charge");};};
  const step=()=>{n++;
    if(n===steps.length){take.status="busy";v.soc=100;S.bal[CC]-=s.price;
      S.history.unshift({cc:CC,kind:"swap",id:"S"+Date.now().toString().slice(-6),station:s.name,op:OPS[s.op].name,cost:s.price,kwh:0,d:Date.now(),from,soc:100,slot:take.slot});
      S.tx.unshift({cc:CC,t:s.name,sub:"Battery swap · "+OPS[s.op].name,a:-s.price,d:Date.now()});save();renderExplore();}
    draw();if(n<steps.length)setTimeout(step,1000);};
  draw();setTimeout(step,1000);
}

/* ---------- charging session ---------- */
let SES=null,timer=null,receipt=null;
function startSession(s,c){
  const v=veh();if(HOLD&&HOLD.cid===c.id)HOLD=null;c.status="busy";receipt=null;
  SES={s,c,v,startSoc:v.soc,soc:v.soc,kwh:0,start:Date.now(),kw:0,ramp:0};
  timer=setInterval(tick,500);go("charge");renderExplore();toast(`Charging at ${s.name}`);
}
function peak(){const {c,soc}=SES;const base=c.type==="Type 2"?Math.min(c.kw,11):c.kw;return base*(soc<50?1:soc<70?0.75:soc<85?0.45:0.2);}
function tick(){
  SES.ramp=Math.min(1,SES.ramp+0.25);
  SES.kw=peak()*SES.ramp*(0.96+Math.random()*0.06);
  const add=SES.kw*(3/60)/2; // 1s ≈ 3 min
  SES.kwh+=add;SES.soc=Math.min(100,SES.startSoc+SES.kwh/SES.v.battery*100);
  const cost=SES.kwh*SES.s.price;
  if(SES.soc>=SES.v.limit||cost>=S.bal[CC]){stopSession(SES.soc>=SES.v.limit?"Reached charge limit":"Wallet balance used up");return;}
  renderCharge();
}
function stopSession(reason){
  clearInterval(timer);timer=null;
  const {s,c,kwh,v}=SES,cost=Math.min(S.bal[CC],kwh*s.price);
  S.bal[CC]-=cost;v.soc=Math.round(SES.soc);
  const r={cc:CC,cid:c.id,kind:"charge",id:"R"+Date.now().toString().slice(-6),station:s.name,op:OPS[s.op].name,plug:c.type+" · "+c.kw+" kW",kwh,cost,mins:Math.round((Date.now()-SES.start)/1000*3),d:Date.now(),from:SES.startSoc,soc:v.soc,reason};
  S.history.unshift(r);S.tx.unshift({cc:CC,t:s.name,sub:"Charging · "+OPS[s.op].name,a:-cost,d:Date.now()});
  c.status="available";SES=null;receipt=r;save();renderExplore();go("charge");
}
function batteryBar(soc,limit,charging){
  return `<div class="battery" role="img" aria-label="Battery ${Math.floor(soc)} percent, limit ${limit} percent">
    <div class="fill ${charging?"charging":""}" style="width:${soc}%"></div><div class="limit" style="left:calc(${limit}% - 1.5px)"></div></div>`;
}
function renderCharge(){
  const el=$("#v-charge");$("#liveDot").style.display=SES?"inline-block":"none";
  const v=veh();
  if(SES){
    const {s,c}=SES,cost=SES.kwh*s.price,left=Math.max(0,(v.limit-SES.soc)/100*v.battery),eta=SES.kw>0?Math.round(left/Math.max(SES.kw*0.7,1)*60):0;
    el.innerHTML=`<div class="screen">${BRAND}<div class="car-stage">
      <div class="car-name">${esc(v.name)} · ${esc(s.name)}</div>
      <div class="soc-big num">${Math.floor(SES.soc)}<sup>%</sup></div>
      <div class="charge-state">Charging · ${eta} min to ${v.limit}%</div></div>
      ${batteryBar(SES.soc,v.limit,true)}
      <div class="lim-row"><span>Charge limit</span><b style="color:var(--ink)">${v.limit}%</b></div>
      <input type="range" id="lim" min="50" max="100" step="5" value="${v.limit}" aria-label="Charge limit">
      <div class="grid4">
        <div><b class="num">${SES.kw.toFixed(0)} kW</b><span>Power</span></div>
        <div><b class="num">+${SES.kwh.toFixed(1)} kWh</b><span>Energy added</span></div>
        <div><b class="num">${ghs(cost)}</b><span>Cost so far</span></div>
        <div><b class="num">+${Math.round(SES.kwh*6.5)} km</b><span>Range added</span></div>
      </div>
      <div class="group"><div class="row"><span class="muted">Charger</span><b>${c.type} · ${c.kw} kW</b></div><div class="row"><span class="muted">Network</span><b>${OPS[s.op].name}</b></div></div>
      <button class="btn stop block" id="stop">Stop charging</button>
      <p class="note">Demo speed: 1 second ≈ 3 minutes.</p></div>`;
    $("#lim").oninput=e=>{v.limit=+e.target.value;save();};
    $("#lim").onchange=()=>renderCharge();
    $("#stop").onclick=()=>stopSession("Stopped by you");
    return;
  }
  if(receipt){const r=receipt;
    el.innerHTML=`<div class="screen">${BRAND}<div class="car-stage"><div class="car-name">${esc(r.reason)}</div>
      <div class="soc-big num">${r.soc}<sup>%</sup></div><div class="charge-state" style="color:var(--muted)">${r.from}% → ${r.soc}% in ${r.mins} min</div></div>
      ${batteryBar(r.soc,v.limit,false)}
      <div class="sec-title">Receipt ${r.id}</div>
      <div class="group">
        <div class="row"><span class="muted">Location</span><b>${esc(r.station)}</b></div>
        <div class="row"><span class="muted">Network</span><b>${r.op}</b></div>
        <div class="row"><span class="muted">Charger</span><b>${r.plug}</b></div>
        <div class="row"><span class="muted">Energy</span><b class="num">${r.kwh.toFixed(2)} kWh</b></div>
        <div class="row"><span class="muted">Paid from wallet</span><b class="num">${ghs(r.cost)}</b></div>
      </div>
      <button class="btn block" id="done">Done</button></div>`;
    $("#done").onclick=()=>{receipt=null;renderCharge();};return;
  }
  const hist=S.history.some(h=>(h.cc||"gh")===CC)?`<div class="sec-title">Recent</div><div class="group">${S.history.filter(h=>(h.cc||"gh")===CC).slice(0,5).map(h=>`<div class="row"><span>${esc(h.station)}<div class="st-sub">${h.op} · ${new Date(h.d).toLocaleDateString(C().locale,{day:"numeric",month:"short"})} · ${h.kind==="swap"?`Battery swap ${h.from}% → 100%`:h.kwh.toFixed(1)+" kWh"}</div></span><b class="num">${money(h.cost,h.cc||"gh")}</b></div>`).join("")}</div>`:"";
  if(isSwapV(v)){
    el.innerHTML=`<div class="screen">${BRAND}<div class="car-stage">
      <div class="car-name">${esc(v.name)} · ${vcl(v.vclass)}</div>
      <div class="soc-big num">${v.soc}<sup>%</sup></div>
      <div class="charge-state" style="color:${v.soc<25?"var(--off)":"var(--muted)"}">About ${vRange(v)} km left${v.soc<25?" · swap soon":""}</div></div>
      ${batteryBar(v.soc,100,false)}
      <div style="display:flex;gap:10px;margin-top:20px"><button class="btn block" id="find">Find swap station</button><button class="btn soft block" id="scan">Scan station</button></div>
      ${hist||`<p class="note">Ride in, swap your empty battery for a full one in about 2 minutes, and pay from your OnePlug wallet.</p>`}</div>`;
    $("#find").onclick=()=>{setKind("swap");go("explore");};$("#scan").onclick=openScanner;return;
  }
  el.innerHTML=`<div class="screen">${BRAND}<div class="car-stage">
      <div class="car-name">${esc(v.name)} · parked</div>
      <div class="soc-big num">${v.soc}<sup>%</sup></div>
      <div class="charge-state" style="color:var(--muted)">About ${Math.round(v.soc/100*v.battery*6.5)} km range</div></div>
      ${batteryBar(v.soc,v.limit,false)}
      <div class="lim-row"><span>Charge limit</span><b style="color:var(--ink)" id="limv">${v.limit}%</b></div>
      <input type="range" id="lim" min="50" max="100" step="5" value="${v.limit}" aria-label="Charge limit">
      <div style="display:flex;gap:10px;margin-top:20px"><button class="btn block" id="scan">Scan charger</button><button class="btn soft block" id="find">Find charger</button></div>
      ${hist||`<p class="note">Plug into any network's charger in Ghana. Scan its QR code or pick it from the map, and OnePlug handles the rest.</p>`}</div>`;
  $("#lim").oninput=e=>{v.limit=+e.target.value;$("#limv").textContent=v.limit+"%";el.querySelector(".limit").style.left=`calc(${v.limit}% - 1.5px)`;save();};
  $("#scan").onclick=openScanner;$("#find").onclick=()=>{setKind("charge");go("explore");};
}
function openScanner(){
  openPage(`<div class="topbar">${backBtn}<span></span></div>
    <h1 class="hero-name">Scan charger</h1><p class="muted">Point your camera at the QR code on any charger or swap station, from any network.</p>
    <div class="scanner" aria-hidden="true"></div>
    <label class="field"><span>Or enter the charger or station ID</span><input id="cid" placeholder="GH-AP-001-1" autocomplete="off"></label>
    <div class="err" id="scanErr"></div>`,
    `<button class="btn soft block" id="demoScan">Simulate scan</button><button class="btn block" id="useId">Continue</button>`);
  const find=id=>{for(const s of STATIONS){const c=s.conns.find(c=>c.id.toLowerCase()===id.toLowerCase());if(c)return[s,c];}return null;};
  $("#useId").onclick=()=>{const raw=$("#cid").value.trim(),st=STATIONS.find(s=>s.kind==="swap"&&s.id.toLowerCase()===raw.toLowerCase());
    if(st)return openSwapStation(st.id);
    const r=find(raw);
    if(!r){$("#scanErr").textContent="Charger ID not found. It's printed under the QR code, like GH-VG-001-1 or GH-PS-001.";return;}
    if(r[1].status!=="available"){$("#scanErr").textContent=`${r[1].id} is ${r[1].status==="busy"?"in use":"offline"}. Pick another charger at ${r[0].name}.`;return;}
    openStation(r[0].id,r[1].id);};
  $("#demoScan").onclick=()=>{const v=veh(),pool=[];
    if(isSwapV(v)){const sw=STATIONS.filter(s=>s.kind==="swap"&&s.veh.includes(v.vclass)&&avail(s)).sort((a,b)=>km(ME,a)-km(ME,b))[0];
      if(!sw)return toast("No swap station with full batteries nearby");$("#cid").value=sw.id;setTimeout(()=>openSwapStation(sw.id),400);return;}STATIONS.forEach(s=>s.conns.forEach(c=>{if(c.status==="available"&&v.plugs.includes(c.type))pool.push([s,c]);}));
    const p=pool[Math.floor(Math.random()*pool.length)];$("#cid").value=p[1].id;setTimeout(()=>openStation(p[0].id,p[1].id),400);};
}

/* ---------- wallet ---------- */
const nw=k=>{const n=Object.values(OPS).filter(o=>o.cc===CC&&o.kind===k).length;return `${n} ${k==="charge"?"charging":"battery-swap"} network${n===1?"":"s"}`;};
function renderWallet(){
  $("#v-wallet").innerHTML=`<div class="screen"><div class="brandhead">${LOGO}<div><div class="wm">OnePlug</div><div class="tag">One app. Every charge, every swap.</div></div></div><h1 class="screen-title">Wallet</h1>
    <div class="muted">${esc(C().name)} wallet · ${C().cur}</div><div class="balance num">${ghs(S.bal[CC])}</div>
    <p class="muted" style="margin:8px 0 18px">Accepted at ${nw("charge")} and ${nw("swap")}, ${STATIONS.filter(s=>s.cc===CC).length} stations in ${esc(C().name)}.</p>
    <button class="btn block" id="top">Add funds</button>
    <div class="sec-title">History</div>
    <div class="group">${S.tx.filter(t=>(t.cc||"gh")===CC).slice(0,15).map(t=>`<div class="row"><span>${esc(t.t)}<div class="st-sub">${t.sub?esc(t.sub)+" · ":""}${new Date(t.d).toLocaleString(C().locale,{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</div></span><b class="num" style="${t.a>0?"color:var(--charge)":""}">${t.a>0?"+":"−"}${ghs(Math.abs(t.a))}</b></div>`).join("")}</div></div>`;
  $("#top").onclick=openTopup;
}
function openTopup(){
  let amt=C().top[2],method=C().pay.includes(S.momo)?S.momo:C().pay[0];
  const methods=C().pay;
  const draw=()=>{openPage(`<div class="topbar">${backBtn}<span></span></div>
    <h1 class="hero-name">Add funds</h1>
    <div class="soc-big num" style="font-size:64px;margin:16px 0">${ghs(amt)}</div>
    <div class="pay-grid">${C().top.map(a=>`<button class="opt" data-a="${a}" aria-pressed="${amt===a}">${a.toLocaleString(C().locale)}</button>`).join("")}</div>
    <div class="sec-title">Pay with</div>
    <div class="group">${[...methods,"Bank card"].map(m=>`<button class="conn" data-p="${m}" aria-pressed="${method===m}"><span class="radio"></span><span class="grow"><b>${m}</b></span></button>`).join("")}</div>
    <label class="field"><span>${method==="Bank card"?"Card number":"Mobile Money number"}</span><input id="num" inputmode="numeric" placeholder="${method==="Bank card"?"4242 4242 4242 4242":C().phone}" value="${esc($("#num")?.value||"")}"></label>
    <p class="note">${method==="Bank card"?"Your card is charged now.":"You'll get a prompt on your phone to approve with your PIN."} Demo only, no money moves.</p>`,
    `<button class="btn block" id="pay">Add ${ghs(amt)}</button>`);
    $("#pageBody").querySelectorAll("[data-a]").forEach(b=>b.onclick=()=>{amt=+b.dataset.a;draw();});
    $("#pageBody").querySelectorAll("[data-p]").forEach(b=>b.onclick=()=>{method=b.dataset.p;draw();});
    $("#pay").onclick=()=>{const n=$("#num").value.replace(/\D/g,"");
      if(n.length<9){$("#num").focus();toast(method==="Bank card"?"Enter your card number":"Enter your mobile money number");return;}
      $("#pay").disabled=true;$("#pay").textContent=method==="Bank card"?"Processing…":"Approve on your phone…";
      setTimeout(()=>{S.bal[CC]+=amt;S.momo=method;S.tx.unshift({cc:CC,t:"Funds added",sub:method,a:amt,d:Date.now()});save();closePage();go("wallet");toast(`Added ${ghs(amt)}`);},1400);};
  };draw();
}

/* ---------- account ---------- */
function renderAccount(){
  const H=S.history.filter(h=>(h.cc||"gh")===CC),tot=H.reduce((a,h)=>a+(h.kwh||0),0),nsw=H.filter(h=>h.kind==="swap").length,th=document.documentElement.dataset.theme||"auto";
  $("#v-account").innerHTML=`<div class="screen"><div class="brandhead">${LOGO}<div><div class="wm">OnePlug</div><div class="tag">One app. Every charge, every swap.</div></div></div><h1 class="screen-title">Account</h1>
    <div class="card-rfid"><span class="mark card-mark">${LOGO_W}</span><div class="chip-ic"></div><div class="cnum num">4821 0093 1745</div><div class="st-sub">OnePlug charge card · tap at any network's charger</div>${stripe()}</div>
    <div class="sec-title">Country</div>
    <div class="group"><button class="conn" id="ctryBtn">${stripe()}<span class="grow"><b>${esc(C().name)}</b><div class="st-sub">${esc(C().city)} · ${C().cur} · ${esc(C().pay.join(", "))} · ${esc(C().lang)}</div></span><span class="st-sub" style="color:var(--accent-text);font-weight:700">Change</span></button></div>
    <div class="sec-title">Vehicles</div>
    <div class="group">${S.vehicles.map((v,i)=>`<button class="conn" data-v="${i}" aria-pressed="${i===S.vIdx}"><span class="radio"></span><span class="grow"><b>${esc(v.name)}</b><div class="st-sub">${isSwapV(v)?`${vcl(v.vclass)} · battery swap · ~${v.range||90} km`:`${v.battery} kWh · ${v.plugs.join(", ")}`}</div></span><span class="st-sub">${v.soc}%</span></button>`).join("")}
      <button class="conn" id="addV"><span class="grow" style="color:var(--accent-text);font-weight:600">Add vehicle</span></button></div>
    <div class="sec-title">Charging stats</div>
    <div class="grid4" style="margin-top:0"><div><b class="num">${H.length-nsw}</b><span>Charging sessions</span></div><div><b class="num">${nsw}</b><span>Battery swaps</span></div>
      <div><b class="num">${tot.toFixed(0)} kWh</b><span>Energy charged</span></div><div><b class="num">${money(H.reduce((a,h)=>a+h.cost,0))}</b><span>Spent</span></div></div>
    <div class="sec-title">Charging networks</div>
    <div class="group">${Object.values(OPS).filter(o=>o.cc===CC&&o.kind==="charge").map(o=>`<div class="row"><b>${o.name}</b><span class="st-sub" style="color:var(--charge)">OCPI · Connected</span></div>`).join("")}</div>
    <div class="sec-title">Battery-swap networks</div>
    <div class="group">${Object.values(OPS).filter(o=>o.cc===CC&&o.kind==="swap").map(o=>`<div class="row"><b>${o.name}</b><span class="st-sub" style="color:var(--swap)">Partner API · Connected</span></div>`).join("")}</div>
    <p class="note">Charging networks link through OCPI roaming. Battery-swap networks link through a partner API that shares slot availability and takes swap payments. Both feed one station list, so you find and pay for any of them here.</p>
    <div class="group"><div class="row"><span>Appearance</span><div class="toggle">${["auto","light","dark"].map(t=>`<button data-th="${t}" aria-pressed="${th===t}">${t[0].toUpperCase()+t.slice(1)}</button>`).join("")}</div></div>
      <div class="row"><span>Demo data</span><button class="btn soft" id="reset" style="padding:8px 12px">Reset</button></div></div>
    <div class="sec-title">Earlier versions</div>
    <div class="group">${PREV.map(([t,d,u])=>`<a class="row verlink" href="${u}" target="_blank" rel="noopener"><span class="grow"><b>${esc(t)}</b><div class="st-sub">${esc(d)}</div></span><span class="arr" aria-hidden="true">↗</span></a>`).join("")}</div>
    <p class="note">OnePlug Africa: one account in every country. Switching country changes the map, networks, currency and payment methods; your vehicles, saved stations and history come with you. Each country keeps its own wallet balance in local currency.</p>
    <p class="note">Prototype with fictional networks and demo prices at real locations in 6 countries. Charger status, battery slots, charging and swaps are simulated.</p></div>`;
  $("#v-account").querySelectorAll("[data-v]").forEach(b=>b.onclick=()=>{if(SES)return toast("Stop charging first");S.vIdx=+b.dataset.v;save();renderAccount();renderExplore();});
  $("#v-account").querySelectorAll("[data-th]").forEach(b=>b.onclick=()=>{const t=b.dataset.th;if(t==="auto")delete document.documentElement.dataset.theme;else document.documentElement.dataset.theme=t;try{localStorage.setItem(KEY+"-theme",t);}catch(e){}renderAccount();if(gmap)initMap();});
  $("#ctryBtn").onclick=openCountry;
  $("#addV").onclick=addVehicle;
  $("#reset").onclick=()=>{if(SES)return toast("Stop charging first");S=JSON.parse(JSON.stringify(defaults));receipt=null;save();renderAll();go("account");toast("Demo data reset");};
}
function addVehicle(){
  const plugs=new Set(["CCS2"]);let vc="Car";
  const draw=()=>{const n=$("#vn")?.value||"",b=$("#vb")?.value||"64",rg=$("#vr")?.value||"90",car=vc==="Car";
    openPage(`<div class="topbar">${backBtn}<span></span></div><h1 class="hero-name">Add vehicle</h1>
    <div class="sec-title">Type</div>
    <div class="seg3">${["Car","Motorbike","Tricycle"].map(t=>`<button class="opt" data-vt="${t}" aria-pressed="${vc===t}">${t==="Car"?"Car":vcl(t)}</button>`).join("")}</div>
    <label class="field"><span>Name</span><input id="vn" placeholder="${car?"e.g. Hyundai Kona":vc==="Motorbike"?"e.g. My okada":"e.g. My pragya"}" value="${esc(n)}"></label>
    ${car?`<label class="field"><span>Battery size (kWh)</span><input id="vb" type="number" min="10" max="200" value="${esc(b)}"></label>
    <div class="sec-title">Plugs your car accepts</div>
    <div class="group">${PLUGS.map(p=>`<button class="conn" data-pl="${p}" aria-pressed="${plugs.has(p)}"><span class="radio" style="border-radius:6px"></span><span class="grow"><b>${p}</b></span></button>`).join("")}</div>`
    :`<label class="field"><span>Range on a full battery (km)</span><input id="vr" type="number" min="20" max="300" value="${esc(rg)}"></label>
    <p class="note">${vcl(vc)}s use battery swap stations: trade your empty battery for a full one instead of plugging in.</p>`}`,
    `<button class="btn block" id="saveV">Add vehicle</button>`);
    $("#pageBody").querySelectorAll("[data-vt]").forEach(x=>x.onclick=()=>{vc=x.dataset.vt;draw();});
    $("#pageBody").querySelectorAll("[data-pl]").forEach(x=>x.onclick=()=>{const p=x.dataset.pl;plugs.has(p)?plugs.delete(p):plugs.add(p);draw();});
    $("#saveV").onclick=()=>{const n=$("#vn").value.trim();
      if(!n){toast("Name your vehicle");$("#vn").focus();return;}
      if(vc!=="Car"){S.vehicles.push({name:n,vclass:vc,range:+$("#vr").value||90,soc:30,limit:100,plugs:[]});}
      else{const b=+$("#vb").value;if(!plugs.size){toast("Pick at least one plug");return;}
      S.vehicles.push({name:n,vclass:"Car",battery:b||60,soc:30,limit:80,plugs:[...plugs]});}S.vIdx=S.vehicles.length-1;save();closePage();renderAccount();renderExplore();toast("Vehicle added");};
  };draw();
}

/* ---------- nav ---------- */
function go(tab){
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id==="v-"+tab));
  document.querySelectorAll("nav.tabs button").forEach(b=>{if(b.dataset.tab===tab)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");});
  if(tab==="explore")requestAnimationFrame(()=>renderExplore());if(tab==="charge")renderCharge();if(tab==="wallet")renderWallet();if(tab==="account")renderAccount();
  window.scrollTo(0,0);
}
document.querySelectorAll("nav.tabs button").forEach(b=>b.addEventListener("click",()=>go(b.dataset.tab)));
setInterval(()=>{const s=STATIONS[Math.floor(Math.random()*STATIONS.length)],c=s.conns[Math.floor(Math.random()*s.conns.length)];
  if(SES&&c===SES.c)return;if(c.status==="available"||c.status==="busy")c.status=c.status==="available"?"busy":"available";
  if($("#v-explore").classList.contains("active")&&!$("#page").classList.contains("open"))renderExplore();},7000);
function renderAll(){renderFilters();renderExplore();renderCharge();}
loadGoogleMaps();
try{const t=localStorage.getItem(KEY+"-theme");if(t&&t!=="auto")document.documentElement.dataset.theme=t;}catch(e){}
renderMarket();renderAll();
(()=>{const sp=$("#splash"),hide=()=>sp.classList.add("gone");sp.onclick=hide;setTimeout(hide,1600);})();
