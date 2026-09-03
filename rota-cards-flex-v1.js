// Rota Cards Flex V1 — cartões leem o carro real salvo na agenda e aceitam 1 a 5 pessoas por carro.
(function rotaCardsFlexV1(){
  const CAR_NAMES=['Carro A','Carro B','Carro C'];
  const COLORS={'Carro A':'#176b3a','Carro B':'#2563eb','Carro C':'#d97706'};
  let cache={};
  let rendering=false;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function findChurch(row){
    const list=D?.cities?.[row.cidade]||[];
    let idx=list.findIndex(x=>x.name===row.igreja&&(!row.endereco||x.addr===row.endereco));
    if(idx<0)idx=list.findIndex(x=>x.name===row.igreja);
    return idx>=0?{city:row.cidade,idx,...list[idx]}:{city:row.cidade,idx:-1,name:row.igreja,addr:row.endereco||''};
  }
  async function fetchDay(day){
    if(typeof sb==='undefined'||!authUser)return [];
    const {data,error}=await sb.from('agenda').select('id,igreja,cidade,endereco,carro,equipe,dia_indice,posicao,status,horario,observacao').eq('status','programada').eq('dia_indice',day).order('posicao',{ascending:true});
    if(error){console.warn('rota flex',error.message);return cache[day]||[];}
    cache[day]=data||[];return cache[day];
  }
  function dayLabel(i){const d=window.getOperationalDayLabel?.(i)||'';return 'Dia '+(i+1)+(d?' · '+d:'');}
  function syncDayUI(){
    const label=dayLabel(activeDay);
    const title=document.getElementById('dayTitle');if(title)title.textContent=label;
    const meta=document.getElementById('dayMeta');if(meta)meta.textContent='Até 12 pessoas • cada carro fica em uma única cidade • pendências de dias anteriores entram primeiro';
    const buttons=document.getElementById('dayButtons');
    if(buttons)buttons.innerHTML=Array.from({length:28},(_,i)=>`<button class="btn ${i===activeDay?'':'secondary'}" onclick="activeDay=${i};const m=document.getElementById('mapDay');if(m)m.value='${i}';renderRoute();if(typeof updateMapDay==='function')updateMapDay();">${esc(dayLabel(i))}</button>`).join('');
    const picker=document.getElementById('operationalWeekday');if(picker)picker.value=window.getOperationalDayToken?.(activeDay)||'';
  }
  function visitButton(church,visited){
    if(church.idx<0)return '';
    const city=JSON.stringify(church.city),idx=church.idx;
    if(visited){
      if(typeof isAdmin==='function'&&isAdmin())return `<button class="check done" onclick='toggleVisit(${city},${idx})'>↩ DESVISITAR</button>`;
      return '<button class="check done" disabled>✓ VISITADA</button>';
    }
    return `<button class="check" onclick='toggleVisit(${city},${idx})'>MARCAR VISITADA</button>`;
  }
  function cardHtml(car,rows){
    const color=COLORS[car];
    const special=rows.length&&rows.length!==4?`<span class="small" style="font-weight:800;color:${color}">${rows.length<4?'⚠ FECHAMENTO':'➕ REFORÇO'}</span>`:'';
    return `<div class="card" style="border-top:5px solid ${color}"><div class="car-title"><div><b>🚙 ${car}</b> <span class="small muted">${rows.length} pessoa${rows.length===1?'':'s'}</span> ${special}</div><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn secondary" style="padding:6px 8px" onclick='abrirRotaCarroFlex(${JSON.stringify(car)},false)'>🗺️ Abrir rota</button><button class="btn secondary" style="padding:6px 8px" onclick='abrirRotaCarroFlex(${JSON.stringify(car)},true)'>↩ Buscar equipe</button></div></div>${rows.map((row,i)=>{
      const church=findChurch(row),visited=church.idx>=0&&!!state?.visited?.[church.city+'|'+church.idx];
      const pending=/PENDÊNCIA ANTERIOR/i.test(row.observacao||'');
      const cfg=typeof cfgDaIgreja==='function'?cfgDaIgreja(church.city,church.name,church.addr):{};
      const token=window.getOperationalDayToken?.(activeDay);
      const hour=row.horario||(typeof window.horarioCultoParaDia==='function'?window.horarioCultoParaDia(cfg,token):'');
      return `<div class="stop ${visited?'done':''}"><div class="num">${i+1}</div><div><div class="small muted">PESSOA ${i+1} · FICA NESTA IGREJA</div><b>${esc(church.name)}</b><div class="small"><b>${esc(church.city)}</b> — ${esc(church.addr)}</div>${hour?`<div class="small" style="margin-top:4px"><b>🕒 ${esc(window.getOperationalDayLabel?.(activeDay)||'Culto')}: ${esc(hour)}</b></div>`:''}${pending?'<div class="small" style="margin-top:4px;color:#a16207;font-weight:800">⚠ PENDÊNCIA DE ROTA ANTERIOR</div>':''}</div><div>${visitButton(church,visited)}<br><a class="maplink" target="_blank" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(church.addr)}">🗺️ Navegar</a></div></div>`;
    }).join('')}${rows.length?'':'<div class="small muted" style="padding:10px 2px">Sem paradas neste carro.</div>'}</div>`;
  }

  async function render(){
    if(rendering)return;
    rendering=true;
    try{
      syncDayUI();
      const rows=await fetchDay(Number(activeDay||0));
      const groups=Object.fromEntries(CAR_NAMES.map(c=>[c,[]]));
      rows.forEach(r=>{const car=CAR_NAMES.includes(r.carro)?r.carro:'Carro A';groups[car].push(r);});
      CAR_NAMES.forEach(c=>groups[c].sort((a,b)=>Number(a.posicao)-Number(b.posicao)));
      const box=document.getElementById('routeCards');if(box)box.innerHTML=`<div class="cargrid">${CAR_NAMES.map(c=>cardHtml(c,groups[c])).join('')}</div>`;
      const n=rows.length,vis=rows.filter(r=>{const c=findChurch(r);return c.idx>=0&&state?.visited?.[c.city+'|'+c.idx];}).length;
      const p=document.getElementById('routeTodayCount');if(p)p.textContent=n;
      const v=document.getElementById('routeVisitedCount');if(v)v.textContent=vis;
    }finally{rendering=false;}
  }

  async function openCar(car,pickup){
    const rows=(await fetchDay(Number(activeDay||0))).filter(r=>r.carro===car).sort((a,b)=>Number(a.posicao)-Number(b.posicao));
    if(!rows.length)return alert(car+' não tem paradas neste dia.');
    const cities=[...new Set(rows.map(r=>r.cidade))];
    if(cities.length>1)return alert('⚠ '+car+' está com cidades misturadas. Gere novamente a rota antes de navegar.');
    let origin,dest,way=[];
    if(!pickup){origin='Itu, SP';dest=rows[rows.length-1].endereco;way=rows.slice(0,-1).map(r=>r.endereco);}
    else{origin=rows[rows.length-1].endereco;dest='Itu, SP';way=rows.slice(0,-1).reverse().map(r=>r.endereco);}
    const url='https://www.google.com/maps/dir/?api=1&origin='+encodeURIComponent(origin)+'&destination='+encodeURIComponent(dest)+(way.length?'&waypoints='+way.map(encodeURIComponent).join('|'):'');
    window.open(url,'_blank');
  }

  function bind(){
    window.renderRoute=render;
    window.carregarRotaFlex=render;
    window.abrirRotaCarroFlex=openCar;
    window.openCarRoute=function(i){return openCar(CAR_NAMES[Number(i)]||'Carro A',false);};
  }
  bind();setTimeout(bind,1000);setTimeout(bind,3400);setTimeout(()=>render(),1200);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(render,120);});
})();
