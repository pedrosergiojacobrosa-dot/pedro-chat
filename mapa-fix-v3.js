// Correção robusta do mapa: três carros, marcadores separados e redimensionamento do Leaflet.
(function mapaFixV3(){
  const COLORS=['#176b3a','#2563eb','#d97706'];
  const CAR_NAMES=['Carro A','Carro B','Carro C'];
  const ITU=[-23.264,-47.299];

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  // A base atual tem coordenada por cidade. Para não empilhar todas as igrejas no mesmo ponto,
  // aplicamos um deslocamento pequeno e determinístico apenas na visualização do mapa.
  function displayCoord(church,globalIndex){
    const base=(D?.coords?.[church.city]||ITU).slice();
    const route=D?.routes?.[activeDay]||[];
    const cityItems=route.filter(x=>x.city===church.city);
    if(cityItems.length<=1)return base;
    const sameBefore=route.slice(0,globalIndex).filter(x=>x.city===church.city).length;
    const angle=(sameBefore/cityItems.length)*Math.PI*2;
    const radius=0.008+Math.min(0.010,cityItems.length*0.0015);
    return [base[0]+Math.sin(angle)*radius,base[1]+Math.cos(angle)*radius];
  }

  function clearMapLayers(){
    if(typeof map==='undefined'||!map||typeof markers==='undefined'||!Array.isArray(markers))return;
    markers.forEach(layer=>{try{map.removeLayer(layer);}catch(_){}});
    markers.length=0;
  }

  function makeStopIcon(car,stop,visited){
    const bg=COLORS[car];
    const html=`<div style="width:32px;height:32px;border-radius:50%;background:${bg};color:#fff;border:3px solid #fff;box-shadow:0 2px 8px #0005;display:grid;place-items:center;font:800 13px Arial">${visited?'✓':stop}</div>`;
    return L.divIcon({className:'',html,iconSize:[32,32],iconAnchor:[16,16],popupAnchor:[0,-17]});
  }

  function renderMapV3(){
    if(typeof map==='undefined'||!map||typeof L==='undefined')return;
    clearMapLayers();

    const items=D?.routes?.[activeDay]||[];
    const sidebar=document.getElementById('mapStops');
    const perCar=[[],[],[]];

    const legend=`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">${COLORS.map((c,i)=>`<span class="small" style="display:inline-flex;align-items:center;gap:5px"><i style="width:11px;height:11px;border-radius:50%;background:${c};display:inline-block"></i><b>${CAR_NAMES[i]}</b></span>`).join('')}</div>`;

    let listHtml=legend;
    items.forEach((church,i)=>{
      const car=Math.min(2,Math.floor(i/4));
      const stop=(i%4)+1;
      const coord=displayCoord(church,i);
      const visited=!!state?.visited?.[church.city+'|'+church.idx];
      perCar[car].push({coord,church,stop,index:i});

      const marker=L.marker(coord,{icon:makeStopIcon(car,stop,visited)})
        .addTo(map)
        .bindPopup(`<div style="min-width:210px"><b style="color:${COLORS[car]}">${CAR_NAMES[car]} · ${stop}ª parada</b><br><b>${esc(church.name)}</b><br>${esc(church.addr)}<br><span>${visited?'✅ Visitada':'⏳ Pendente'}</span><br><a target="_blank" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(church.addr)}">Abrir no Google Maps ↗</a></div>`);
      markers.push(marker);

      listHtml+=`<div class="pill" style="border-left:6px solid ${COLORS[car]};margin-bottom:6px"><b>${CAR_NAMES[car]} · ${stop}</b><br>${esc(church.city)} — ${esc(church.name)} ${visited?'🟢':''}</div>`;
    });

    perCar.forEach((stops,car)=>{
      if(!stops.length)return;
      const coords=[ITU,...stops.map(s=>s.coord)];
      const line=L.polyline(coords,{color:COLORS[car],weight:4,opacity:.72,lineCap:'round',lineJoin:'round'}).addTo(map);
      markers.push(line);
    });

    if(items.length){
      const origin=L.circleMarker(ITU,{radius:7,color:'#111827',weight:3,fillColor:'#fff',fillOpacity:1}).addTo(map).bindPopup('<b>Itu</b><br>Origem das rotas');
      markers.push(origin);
    }

    if(sidebar)sidebar.innerHTML=listHtml+(items.length?'':'<div class="notice">Nenhuma parada cadastrada para este dia.</div>');

    const bounds=[ITU,...perCar.flatMap(g=>g.map(s=>s.coord))];
    if(bounds.length>1){
      try{map.fitBounds(L.latLngBounds(bounds).pad(.16),{maxZoom:13});}catch(_){ }
    }
    setTimeout(()=>{try{map.invalidateSize({pan:false});}catch(_){}},80);
  }

  function patchMapFunctions(){
    updateMapDay=renderMapV3;

    if(typeof tab==='function'&&!tab.__mapFixV3){
      const prev=tab;
      const wrapped=function(id){
        const result=prev(id);
        if(id==='mapa'){
          setTimeout(()=>{
            try{if(map)map.invalidateSize({pan:false});}catch(_){}
            renderMapV3();
          },180);
        }
        return result;
      };
      wrapped.__mapFixV3=true;
      tab=wrapped;
      window.tab=wrapped;
    }

    const sel=document.getElementById('mapDay');
    if(sel&&!sel.__mapFixV3){
      sel.addEventListener('change',()=>setTimeout(renderMapV3,50));
      sel.__mapFixV3=true;
    }

    const mapEl=document.getElementById('map');
    if(mapEl&&typeof ResizeObserver!=='undefined'&&!mapEl.__resizeFix){
      const ro=new ResizeObserver(()=>{if(typeof map!=='undefined'&&map&&mapEl.offsetParent!==null){try{map.invalidateSize({pan:false});}catch(_){}}});
      ro.observe(mapEl);mapEl.__resizeFix=true;
    }
  }

  function boot(){
    patchMapFunctions();
    if(typeof map!=='undefined'&&map)renderMapV3();
  }

  window.renderMapV3=renderMapV3;
  setTimeout(boot,500);
  setTimeout(boot,1500);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(boot,100);});
})();
