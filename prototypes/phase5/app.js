/* PHASE 5 PROTOTYPE. Real MapLibre GL (the same vendored engine production
   uses), synthetic cartography from data.js, synthetic doors. It makes NO
   network request of any kind: no tile server, no Supabase, no RPC. */
(function () {
  const D = window.DEMO;
  const COL = { unworked:"#2E86FF", sold:"#22B558", nothome:"#F5B301",
                goback:"#7C5CFC", notint:"#E5484D", dnk:"#0B0F16" };
  const LBL = { unworked:"Unworked", sold:"Sold", nothome:"Not home",
                goback:"Go back", notint:"Not interested", dnk:"Do not knock" };
  const $ = (s) => document.querySelector(s);

  const fc = (f) => ({ type:"FeatureCollection", features:f });
  const line = (g,p) => ({ type:"Feature", geometry:{type:"LineString",coordinates:g}, properties:p });
  const poly = (g,p) => ({ type:"Feature", geometry:{type:"Polygon",coordinates:g}, properties:p });
  const pt   = (g,p) => ({ type:"Feature", geometry:{type:"Point",coordinates:g}, properties:p });

  const centroid = (ring) => {
    let x=0,y=0; ring.slice(0,-1).forEach(c=>{x+=c[0];y+=c[1];});
    return [x/(ring.length-1), y/(ring.length-1)];
  };

  const map = new maplibregl.Map({
    container:"map", attributionControl:false, pitchWithRotate:false, dragRotate:false,
    // preserveDrawingBuffer keeps the last frame readable. Without it a
    // headless screenshot can capture a stale WebGL frame — that is a
    // capture concern only; it changes nothing about what the map draws.
    preserveDrawingBuffer:true,
    center:D.C, zoom:16.7,
    style:{ version:8, sources:{}, layers:[{id:"bg",type:"background",paint:{"background-color":"#F2F3F5"}}] },
  });
  map.touchZoomRotate.disableRotation();
  window.__map = map;   // diagnostics only; the prototype never reads it

  map.on("load", () => {
    /* ---------- synthetic basemap ---------- */
    map.addSource("park", { type:"geojson", data:fc([poly(D.park,{})]) });
    map.addLayer({ id:"park", type:"fill", source:"park", paint:{"fill-color":"#E6EDE4"} });

    map.addSource("blocks", { type:"geojson", data:fc(D.blocks.map(b=>poly(b,{}))) });
    map.addLayer({ id:"blocks", type:"fill", source:"blocks",
      paint:{"fill-color":"#E7E9EC","fill-outline-color":"#DCDFE4"} });

    map.addSource("roads", { type:"geojson", data:fc(D.roads.map(r=>line(r.geo,{name:r.name,cls:r.cls}))) });
    map.addLayer({ id:"road-case", type:"line", source:"roads",
      paint:{"line-color":"#E2E4E8","line-width":["match",["get","cls"],"hwy",17,"major",13,9]} });
    map.addLayer({ id:"road-fill", type:"line", source:"roads",
      layout:{"line-cap":"round"},
      paint:{"line-color":"#FFFFFF","line-width":["match",["get","cls"],"hwy",13,"major",9.5,6]} });

    /* ---------- hoods ---------- */
    const hf = D.hoods.map(h=>poly([h.ring],{id:h.id,color:h.color,label:h.label,mine:h.id==="h-14b"}));
    map.addSource("hoods", { type:"geojson", data:fc(hf) });
    map.addLayer({ id:"hood-fill", type:"fill", source:"hoods",
      paint:{"fill-color":["get","color"],"fill-opacity":["case",["get","mine"],0.07,0.035]} });
    map.addLayer({ id:"hood-line", type:"line", source:"hoods",
      paint:{"line-color":["get","color"],
             "line-width":["case",["get","mine"],2.4,1.2],
             "line-opacity":["case",["get","mine"],0.9,0.4]} });

    /* compact hood LABELS — the number, never the full record name.
       Drawn as DOM markers on purpose: a symbol layer needs a glyph server,
       and this prototype makes no network request for map data. Renaming
       nothing: `label` is display-only, `name` is what the record holds. */
    D.hoods.forEach((h) => {
      const el = document.createElement("div");
      el.textContent = h.label;
      el.title = h.name;
      const mine = h.id === "h-14b";
      el.style.cssText =
        "font:700 11px/1 'Outfit',sans-serif;letter-spacing:.02em;padding:4px 7px;border-radius:7px;" +
        "background:rgba(255,255,255," + (mine ? ".95" : ".78") + ");" +
        "border:1px solid " + (mine ? "rgba(16,17,20,.16)" : "rgba(16,17,20,.08)") + ";" +
        "color:" + (mine ? "#17181A" : "rgba(16,17,20,.5)") + ";" +
        "box-shadow:0 1px 2px rgba(16,24,40,.10);pointer-events:none;white-space:nowrap";
      new maplibregl.Marker({ element: el }).setLngLat(centroid(h.ring)).addTo(map);
    });

    /* Street names. DOM markers again — the same glyph-server constraint —
       repeated along each road so a name stays on screen as the rep pans.
       The marker element owns its own transform, so the rotation for a
       north-south street lives on an inner span. */
    const streetLabels = [];
    const along = (g,t) => [g[0][0]+(g[1][0]-g[0][0])*t, g[0][1]+(g[1][1]-g[0][1])*t];
    D.roads.forEach((r) => {
      const vertical = Math.abs(r.geo[0][0]-r.geo[1][0]) < Math.abs(r.geo[0][1]-r.geo[1][1]);
      [0.34, 0.68].forEach((t) => {
        const el = document.createElement("div");
        const sp = document.createElement("span");
        sp.textContent = r.name;
        sp.style.cssText =
          "display:block;font:600 10px/1 'Outfit',sans-serif;letter-spacing:.07em;" +
          "color:rgba(16,17,20,.40);white-space:nowrap;text-transform:uppercase;" +
          "text-shadow:0 0 3px #fff,0 0 3px #fff,0 0 4px #fff;" +
          (vertical ? "transform:rotate(-90deg)" : "");
        el.style.pointerEvents = "none";
        el.appendChild(sp);
        streetLabels.push(el);
        new maplibregl.Marker({ element: el }).setLngLat(along(r.geo, t)).addTo(map);
      });
    });

    /* Street names are working-zoom detail. Above the turf they only clutter
       the shapes a leader is there to read, so they drop out. */
    const streetLabelVis = () => {
      const on = map.getZoom() >= 15.1 ? "" : "none";
      streetLabels.forEach(el => { el.style.display = on; });
    };
    map.on("zoom", streetLabelVis); streetLabelVis();

    /* ---------- doors: progressive detail ---------- */
    const df = D.doors.map(d=>pt([d.lng,d.lat],{
      id:d.id, color:COL[d.disp], disp:d.disp, dnk:d.disp==="dnk",
      mine:d.hood==="h-14b",
      // Not Home deepens with each attempt in the cycle (existing behaviour)
      shade: d.disp==="nothome" ? Math.min(d.attempts,3) : 0 }));
    map.addSource("doors", { type:"geojson", data:fc(df) });

    // zoomed OUT: small dots, distribution readable
    map.addLayer({ id:"door-dot", type:"circle", source:"doors", maxzoom:15.7,
      paint:{ "circle-radius":["interpolate",["linear"],["zoom"],13,1.8,15.7,4.0],
              "circle-color":["get","color"],
              "circle-opacity":["case",["get","mine"],1,0.42] } });

    // working zoom: real pins
    map.addLayer({ id:"door-halo", type:"circle", source:"doors", minzoom:15.7,
      paint:{ "circle-radius":["interpolate",["linear"],["zoom"],15.7,6,18.5,11.5],
              "circle-color":"#FFFFFF",
              "circle-opacity":["case",["get","mine"],1,0.5] } });
    map.addLayer({ id:"door", type:"circle", source:"doors", minzoom:15.7,
      paint:{ "circle-radius":["interpolate",["linear"],["zoom"],15.7,4.2,18.5,8.6],
              "circle-color":["case",
                 ["==",["get","disp"],"nothome"],
                 ["match",["get","shade"],1,"#F5CE55",2,"#F5B301",3,"#E08A00","#F5B301"],
                 ["get","color"]],
              "circle-stroke-width":["case",["get","dnk"],2,0],
              "circle-stroke-color":"rgba(255,255,255,.85)",
              "circle-opacity":["case",["get","mine"],1,0.45] } });
    // DNK never disappears into the crowd: its own ring at every zoom
    map.addLayer({ id:"door-dnk", type:"circle", source:"doors",
      filter:["==",["get","dnk"],true],
      paint:{ "circle-radius":["interpolate",["linear"],["zoom"],13,3.6,18.5,12.5],
              "circle-color":"rgba(0,0,0,0)",
              "circle-stroke-width":1.6,"circle-stroke-color":"#0B0F16","circle-stroke-opacity":.85 } });

    /* The rep's own position. A field map that cannot answer "where am I
       standing" is not a field map. Synthetic coordinate, no geolocation
       call is made by this prototype. */
    const me = document.createElement("div");
    me.style.cssText =
      "width:18px;height:18px;border-radius:50%;background:#2E86FF;" +
      "border:3px solid #fff;box-shadow:0 0 0 6px rgba(46,134,255,.18)," +
      "0 2px 6px rgba(16,24,40,.35);pointer-events:none";
    new maplibregl.Marker({ element: me }).setLngLat(D.P(-250, -120)).addTo(map);

    map.addSource("sel", { type:"geojson", data:fc([]) });
    map.addLayer({ id:"sel-ring", type:"circle", source:"sel",
      paint:{ "circle-radius":["interpolate",["linear"],["zoom"],16,14,18.5,21],
              "circle-color":"rgba(255,255,255,.55)",
              "circle-stroke-width":3,"circle-stroke-color":"#17181A" } });

    map.on("click", "door", (e)=>openDoor(e.features[0].properties.id));
    map.on("click", "door-dot", (e)=>openDoor(e.features[0].properties.id));
    ["door","door-dot"].forEach(l=>{
      map.on("mouseenter", l, ()=>map.getCanvas().style.cursor="pointer");
      map.on("mouseleave", l, ()=>map.getCanvas().style.cursor="");
    });
    layout(); window.PROTO_READY = true;
  });

  /* ---------- layout: rail + status pill sit above whatever is open ---------- */
  function layout(){
    const tab = document.querySelector(".tabbar").offsetHeight;
    const mg = $("#mgbar"), pill = $("#spill");
    // the manage toolbar lives ABOVE the tab bar; the rail and the status
    // pill stack above whichever of the two is currently showing
    const base = tab + 12 + (mg.hidden ? 0 : mg.offsetHeight + 10);
    $("#rail").style.bottom = base + "px";
    pill.style.bottom = base + "px";
  }

  /* ---------- door sheet ---------- */
  let cur = null;
  function openDoor(id){
    const d = D.doors.find(x=>x.id===id); if(!d) return;
    cur = d;
    $("#d-addr").textContent = d.addr;
    $("#d-who").textContent = d.name || "No name on file";
    $("#d-who").style.color = d.name ? "" : "var(--t3)";
    const h = D.hoods.find(x=>x.id===d.hood);
    $("#d-co").textContent = h.name + " · " + d.lat.toFixed(5) + ", " + d.lng.toFixed(5);
    const b = $("#d-badge");
    b.querySelector(".sw").style.background = COL[d.disp];
    b.querySelector("span:last-child").textContent =
      LBL[d.disp] + (d.disp==="nothome" && d.attempts>1 ? " ×"+d.attempts : "");

    $("#dnkslot").innerHTML = d.disp==="dnk"
      ? `<div class="dnkbanner"><span class="i">■</span><span>Do not knock. Only a leader can clear this, and the server records who did it.</span></div>` : "";
    $("#d-last").innerHTML = d.disp==="unworked"
      ? `<span>Never knocked — <b>fresh door</b></span>`
      : `<span><b>${LBL[d.disp]}</b> · ${d.when} · by ${d.by}</span>`;
    $("#d-cbslot").innerHTML = d.cb
      ? `<div class="cbrow"><span class="k"></span>Callback booked — <b>${d.cb}</b></div>` : "";
    $("#d-noteslot").innerHTML = d.note
      ? `<div class="note lead">${d.note}<span class="m">${d.by} · ${d.when}</span></div>` : "";
    $("#d-hist").innerHTML = (d.note
        ? `<div class="note">${d.note}<span class="m">${d.by} · ${d.when}</span></div>` : "")
      + `<div class="note">${d.disp==="unworked" ? "No attempts yet in this cycle." :
           LBL[d.disp]+" recorded."}<span class="m">${d.when}</span></div>`;
    document.querySelectorAll(".ocb").forEach(x=>x.classList.toggle("sel", x.dataset.d===d.disp));
    $("#d-sold").style.display = d.disp==="dnk" ? "none" : "";

    map.getSource("sel").setData(fc([pt([d.lng,d.lat],{})]));
    $("#scrim").classList.add("on"); $("#door").classList.add("open");
    window.__sel = [d.lng, d.lat];
    frameSelection(d);
  }
  /* Keep the selected door in the band of map still visible above the sheet,
     with its neighbours around it — the rep must never lose their place. */
  function frameSelection(d){
    // offsetHeight, not the live rect: the sheet is mid-transition here
    const box = map.getContainer().getBoundingClientRect();
    const sheetTop = window.innerHeight - $("#door").offsetHeight;
    const top = document.querySelector(".topbar").getBoundingClientRect().bottom + 10;
    const bottom = Math.max(0, box.bottom - sheetTop) + 12;
    map.easeTo({ center:[d.lng,d.lat],
                 zoom:Math.max(map.getZoom(), 16.9),
                 duration:420, padding:{ top:top, bottom:bottom, left:20, right:20 } });
  }

  function closeDoor(){
    $("#scrim").classList.remove("on"); $("#door").classList.remove("open");
    map.getSource("sel").setData(fc([]));
    map.setPadding({ top:0, bottom:0, left:0, right:0 });
    cur=null;
  }
  $("#scrim").addEventListener("click", closeDoor);
  document.querySelectorAll(".ocb").forEach(b=>b.addEventListener("click",()=>{
    document.querySelectorAll(".ocb").forEach(x=>x.classList.remove("sel"));
    b.classList.add("sel");
  }));

  /* ---------- turf + rail ---------- */
  $("#f-turf").addEventListener("click",()=>{
    const h = D.hoods[0];
    map.fitBounds([h.ring[0], h.ring[2]], { padding:{top:120,bottom:170,left:40,right:70}, duration:600 });
  });
  $("#f-manage").addEventListener("click",()=>{ $("#mgbar").hidden=false; layout(); });
  $("#mgclose").addEventListener("click",()=>{ $("#mgbar").hidden=true; layout(); });

  /* ---------- demo states ---------- */
  const S = { pill(t,bad){ const p=$("#spill"); if(!t){p.hidden=true;return;}
      p.hidden=false; p.classList.toggle("bad",!!bad); $("#spilltx").textContent=t; layout(); } };

  /* Header numbers are DERIVED from the demo data, never typed in — a
     prototype that quotes a count its own map contradicts is not a preview
     of anything. */
  const mine = D.doors.filter(d => d.hood === "h-14b");
  const mineLeft = mine.filter(d => d.disp === "unworked").length;
  const allLeft = D.doors.filter(d => d.disp === "unworked").length;
  const pct = (left, total) => Math.round(100 * (total - left) / total) + "%";

  window.setState = function (s) {
    closeDoor(); $("#mgbar").hidden = true; $("#f-manage").hidden = true; S.pill(null);
    if (s === "A") {
      $("#tnm").textContent="Hood 14 B";
      $("#tsb").textContent="Your turf · 2 reps · " + mine.length + " doors";
      $("#hdot").style.background="#17181A";
      $("#pleft").textContent = mineLeft;
      $("#pfill").style.width = pct(mineLeft, mine.length);
      const h0 = D.hoods[0];
      map.fitBounds([h0.ring[0], h0.ring[2]],
        { padding:{top:120,bottom:120,left:26,right:78}, duration:0 });
      S.pill("3 to sync");
    }
    if (s === "B") {
      window.setState("A"); S.pill("3 to sync");
      // a door in the MIDDLE of the hood, so the sheet is shown with real
      // neighbouring doors around the selection rather than empty ground
      const c = centroid(D.hoods[0].ring);
      const kx = Math.cos(c[1] * Math.PI / 180);
      const dist = (p) => Math.hypot((p.lng-c[0])*kx, p.lat-c[1]);
      const near = D.doors.filter(x=>x.hood==="h-14b").sort((p,q)=>dist(p)-dist(q));
      const d = near.find(x=>x.disp==="goback" && x.name && x.note)
             || near.find(x=>x.disp==="goback") || near[0];
      openDoor(d.id);
    }
    if (s === "C") {
      $("#tnm").textContent="All turf";
      $("#tsb").textContent="Leader view · 3 hoods · " + D.doors.length + " doors";
      $("#hdot").style.background="#17181A";
      $("#pleft").textContent = allLeft;
      $("#pfill").style.width = pct(allLeft, D.doors.length);
      $("#f-manage").hidden=false; $("#mgbar").hidden=false;
      map.jumpTo({ center:D.P(20, 60), zoom:14.75 });
    }
    layout();
  };
  const st = (location.hash||"#A").slice(1).toUpperCase();
  map.on("idle", function once(){ map.off("idle", once); window.setState(["A","B","C"].includes(st)?st:"A"); });
  window.addEventListener("hashchange",()=>window.setState((location.hash||"#A").slice(1).toUpperCase()));
  window.addEventListener("resize", layout);
})();
