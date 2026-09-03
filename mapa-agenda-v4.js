// Mapa V4 — agenda do Supabase é a fonte oficial das rotas e dos carros.
(function mapaAgendaV4(){
  const COLORS={A:'#176b3a',B:'#2563eb',C:'#d97706'};
  const CAR_NAMES={A:'Carro A',B:'Carro B',C:'Carro C'};
  const ITU=[-23.264,-47.299];
  let rowsCache={};
  let channel=null;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const carLetter=row=>{const c=String(row.carro||'').toUpperCase();if(c.includes('B'))return 'B';if(c.includes('C'))return 'C';if(c.includes('A'))return 'A';const p=Number(row.posicao);return p>=8?'C':p>=4?'B':'A';};
  const findChurch=row=>{const list=D?.cities?.[row.cidade]||[];let idx=list.findIndex(x=>x.name===row.igreja&&(!row.endereco||x.addr===row.endereco));if(idx<0)idx=list.findIndex(x=>x.name===row.igreja);return idx>=0?{city:row.cidade,idx,...list[idx]}:{city:row.cidade,idx:-1,name:row.igreja,addr:row.endereco||''};};

  function clearLayers(){if(typeof map==='undefined'||!map||typeof markers==='undefined'||!Array.isArray(markers))return;markers.forEach(x=>{try{map.removeLayer(x)}catch(_){}});markers.length=0;}
  function icon(letter,stop,visited){const bg=COLORS[letter];return L.divIcon({className:'',html:`<div style="width:32px;height:32px;border-radius:50%;background:${bg};color:#fff;border:3px solid #fff;box-shadow:0 2px 8px #0005;display:grid;place-items:center;font:800 13px Arial">${visited?'✓':stop}</div>`,iconSize:[32,32],iconAnchor:[16,16],popupAnchor:[0,-17]});}
  function displayCoord(church,index,total){const base=(D?.coords?.[church.city]||ITU).slice();if(total<=1)return base;const a=(index/total)*Math.PI*2,r=0.008+Math.min(.012,total*.0012);return [base[0]+Math.sin(a)*r,base[1]+Math.cos(a)*r];}

  async function fetchDay(day){
    if(typeof sb==='undefined'||!authUser)return [];
    const {data,error}=await sb.from('agenda').select('id,igreja,cidade,endereco,carro,equipe,dia_indice,posicao,status,horario').eq('status','programada').eq('dia_indice',day).order('posicao',{ascending:true});
    if(error){console.warn('mapa agenda',error.message);return rowsCache[day]||[];}
    rowsCache[day]=data||[];return rowsCache[day];
  }

  async function render(){
    if(typeof map==='undefined'||!map||typeof L==='undefined')return;
    const day=Number(typeof activeDay!=='undefined'?activeDay:0);
    const rows=await fetchDay(day);
    clearLayers();
    const groups={A:[],B:[],C:[]};
    rows.forEach(row=>groups[carLetter(row)].push(row));
    const sidebar=document.getElementById('mapStops');
    let html='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">'+['A','B','C'].map(l=>`<span class="small" style="display:inline-flex;align-items:center;gap:5px"><i style="width:11px;height:11px;border-radius:50%;background:${COLORS[l]};display:inline-block"></i><b>${CAR_NAMES[l]}</b></span>`).join('')+'</div>';
    const bounds=[ITU];

    for(const letter of ['A','B','C']){
      const group=groups[letter].sort((a,b)=>Number(a.posicao)-Number(b.posicao));
      const citySet=[...new Set(group.map(r=>r.cidade))];
      if(citySet.length>1){
        console.error('ROTA INVÁLIDA: carro com cidades misturadas',letter,citySet);
        html+=`<div class="notice" style="border-color:#d33"><b>⚠ ${CAR_NAMES[letter]} com cidades misturadas:</b> ${citySet.map(esc).join(', ')}</div>`;
      }
      const coords=[];
      group.forEach((row,i)=>{
        const church=findChurch(row),visited=church.idx>=0&&!!state?.visited?.[church.city+'|'+church.idx];
        const coord=displayCoord(church,i,group.length);coords.push(coord);bounds.push(coord);
        const stop=i+1;
        const m=L.marker(coord,{icon:icon(letter,stop,visited)}).addTo(map).bindPopup(`<div style="min-width:220px"><b style="color:${COLORS[letter]}">${CAR_NAMES[letter]} · ${stop}ª parada</b><br><b>${esc(church.name)}</b><br>${esc(church.city)}<br>${esc(church.addr)}<br>${visited?'✅ Visitada':'⏳ Pendente'}<br><a target="_blank" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(church.addr)}">Abrir no Google Maps ↗</a></div>`);markers.push(m);
        html+=`<div class="pill" style="border-left:6px solid ${COLORS[letter]};margin-bottom:6px"><b>${CAR_NAMES[letter]} · ${stop}</b><br>${esc(church.city)} — ${esc(church.name)} ${visited?'🟢':''}</div>`;
      });
      if(coords.length){const line=L.polyline([ITU,...coords],{color:COLORS[letter],weight:4,opacity:.75,lineCap:'round',lineJoin:'round'}).addTo(map);markers.push(line);}
    }
    if(rows.length){const origin=L.circleMarker(ITU,{radius:7,color:'#111827',weight:3,fillColor:'#fff',fillOpacity:1}).addTo(map).bindPopup('<b>Itu</b><br>Origem das rotas');markers.push(origin);}
    if(sidebar)sidebar.innerHTML=html+(rows.length?'':'<div class="notice"><b>Este dia ainda não tem rota gerada.</b><br>Escolha o dia da semana na aba Rota do dia e clique em “Gerar rota pelos cultos”.</div>');
    if(bounds.length>1){try{map.fitBounds(L.latLngBounds(bounds).pad(.16),{maxZoom:13})}catch(_){}}
    setTimeout(()=>{try{map.invalidateSize({pan:false})}catch(_){}},80);
  }

  async function openThree(){
    const rows=await fetchDay(Number(activeDay||0));
    for(const letter of ['A','B','C']){
      const group=rows.filter(r=>carLetter(r)===letter).sort((a,b)=>Number(a.posicao)-Number(b.posicao));
      if(!group.length)continue;
      const cities=[...new Set(group.map(r=>r.cidade))];
      if(cities.length>1){alert(CAR_NAMES[letter]+' está com cidades misturadas no banco. Gere novamente a rota antes de navegar.');continue;}
      const dest=group[group.length-1].endereco,way=group.slice(0,-1).map(r=>encodeURIComponent(r.endereco)).join('|');
      setTimeout(()=>window.open(`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent('Itu, SP')}&destination=${encodeURIComponent(dest)}${way?'&waypoints='+way:''}`,'_blank'),letter==='A'?0:letter==='B'?250:500);
    }
  }

  function bind(){
    window.updateMapDay=render;window.renderMapV4=render;window.openDayMaps=openThree;
    const sel=document.getElementById('mapDay');if(sel&&!sel.__agendaMapV4){sel.addEventListener('change',()=>setTimeout(render,60));sel.__agendaMapV4=true;}
    if(typeof tab==='function'&&!tab.__agendaMapV4){const prev=tab;const wrapped=function(id){const r=prev(id);if(id==='mapa')setTimeout(render,180);return r;};wrapped.__agendaMapV4=true;window.tab=wrapped;tab=wrapped;}
    if(!channel&&typeof sb!=='undefined'&&authUser){channel=sb.channel('mapa-agenda-v4').on('postgres_changes',{event:'*',schema:'public',table:'agenda'},payload=>{const d=Number(payload.new?.dia_indice??payload.old?.dia_indice);if(Number.isFinite(d))delete rowsCache[d];setTimeout(render,120);}).subscribe();}
  }
  setTimeout(bind,700);setTimeout(bind,1800);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){setTimeout(bind,50);setTimeout(render,120);}});
})();