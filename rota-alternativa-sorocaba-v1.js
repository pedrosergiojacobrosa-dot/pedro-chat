// Rota Alternativa Sorocaba V1 — ignora dias de culto e organiza pendentes por proximidade/bairro.
(function rotaAlternativaSorocabaV1(){
  let altPage=0;
  const PAGE_SIZE=12;
  const CARS=['Carro A','Carro B','Carro C'];
  const COLORS={'Carro A':'#176b3a','Carro B':'#2563eb','Carro C':'#d97706'};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

  // Agrupamento operacional por regiões/bairros de Sorocaba para reduzir deslocamentos cruzados.
  const ZONES=[
    {name:'Zona Norte',rank:1,keys:['parque sao bento','vitoria regia','sao guilherme','brasilandia','húngares','hungares','vila gomes','itavuvu','maria antonia prado','pacaembu','maria eugenia','laranjeiras','novo mundo','ana maria','vila angelica']},
    {name:'Zona Oeste',rank:2,keys:['piazza di roma','itanguá','itangua','guaiba','abatia','wanel','central parque','julio de mesquita','eden']},
    {name:'Zona Leste',rank:3,keys:['hortencia','colorau','alem ponte','barcelona','vila haro','vila santana','vila carvalho']},
    {name:'Centro / Sul',rank:4,keys:['centro','vila augusta','campolim','verg ueiro','vergueiro','jardim europa','jardim faculdade','alem linha']}
  ];

  function zoneFor(x){
    const s=norm((x.name||'')+' '+(x.addr||''));
    for(const z of ZONES){if(z.keys.some(k=>s.includes(norm(k))))return z;}
    return {name:'Sorocaba — demais bairros',rank:9,keys:[]};
  }
  function bairroFor(x){
    const a=String(x.addr||'');
    const m=a.match(/(?:—|,|-)\s*((?:Jardim|Jd\.?|Vila|Parque|Portal|Centro|Residencial|Loteamento|Conjunto|Chácara|Chacara)\s+[^—,.;]+)/i);
    return m?m[1].trim():zoneFor(x).name;
  }
  function pending(){
    if(typeof allChurches!=='function'||typeof state==='undefined')return [];
    return allChurches()
      .filter(x=>norm(x.city)==='sorocaba'&&!state?.visited?.[x.city+'|'+x.idx])
      .map(x=>({...x,_zone:zoneFor(x),_bairro:bairroFor(x)}))
      .sort((a,b)=>a._zone.rank-b._zone.rank||a._bairro.localeCompare(b._bairro,'pt-BR')||a.name.localeCompare(b.name,'pt-BR'));
  }
  function batches(){const p=pending();return Array.from({length:Math.ceil(p.length/PAGE_SIZE)},(_,i)=>p.slice(i*PAGE_SIZE,(i+1)*PAGE_SIZE));}
  function groupsFor(items){return CARS.map((car,i)=>({car,items:items.slice(i*4,i*4+4)}));}

  function routeUrl(items,pickup){
    if(!items.length)return '#';
    const ordered=pickup?items.slice().reverse():items.slice();
    const origin=pickup?ordered[0].addr:'Itu, SP';
    const dest=pickup?'Itu, SP':ordered[ordered.length-1].addr;
    const way=pickup?ordered.slice(1).map(x=>x.addr):ordered.slice(0,-1).map(x=>x.addr);
    return 'https://www.google.com/maps/dir/?api=1&origin='+encodeURIComponent(origin)+'&destination='+encodeURIComponent(dest)+(way.length?'&waypoints='+way.map(encodeURIComponent).join('|'):'');
  }
  function openGroup(car,pickup){
    const bs=batches(),items=bs[altPage]||[],g=groupsFor(items).find(x=>x.car===car);
    if(!g||!g.items.length)return alert(car+' não tem igrejas neste grupo.');
    window.open(routeUrl(g.items,pickup),'_blank');
  }

  function ensureUI(){
    if(document.getElementById('rotaAlternativa'))return;
    const nav=document.querySelector('header nav');
    if(nav&&!document.getElementById('altRouteNav')){
      const btn=document.createElement('button');btn.id='altRouteNav';btn.textContent='🔀 Rota alternativa';
      btn.onclick=()=>{if(typeof tab==='function')tab('rotaAlternativa');setTimeout(render,30);};
      const ref=[...nav.querySelectorAll('button')].find(b=>/todas as igrejas/i.test(b.textContent||''));
      nav.insertBefore(btn,ref||null);
    }
    const main=document.querySelector('main');if(!main)return;
    const sec=document.createElement('section');sec.className='tab';sec.id='rotaAlternativa';
    sec.innerHTML=`<div class="notice" style="border-color:#d59c27;background:#fff8df"><b>⚠ ROTA ALTERNATIVA — TERMINAR SOROCABA.</b><br>Esta aba ignora os dias de culto e considera todas as igrejas pendentes de Sorocaba como disponíveis. As igrejas já visitadas desaparecem automaticamente. A ordem é organizada por <b>proximidade de região/bairro</b> para reduzir deslocamentos.</div><div class="grid"><div class="card kpi"><span class="muted">Pendentes em Sorocaba</span><b id="altPending">0</b></div><div class="card kpi"><span class="muted">Grupos restantes</span><b id="altGroups">0</b></div><div class="card kpi"><span class="muted">Igrejas neste grupo</span><b id="altThis">0</b></div><div class="card kpi"><span class="muted">Regiões neste grupo</span><b id="altZones">0</b></div></div><div class="toolbar" style="margin-top:12px"><button class="btn secondary" onclick="rotaAlternativaAnterior()">‹ Grupo anterior</button><button class="btn" onclick="rotaAlternativaProxima()">Próximo grupo ›</button><span class="small muted" id="altPageLabel"></span></div><div id="altCards"></div>`;
    main.appendChild(sec);
  }

  function cardHtml(g){
    const color=COLORS[g.car],zones=[...new Set(g.items.map(x=>x._zone.name))];
    return `<div class="card" style="border-top:5px solid ${color}"><div class="car-title"><div><b>🚙 ${g.car}</b><div class="small muted">${g.items.length} pessoa${g.items.length===1?'':'s'} · ${esc(zones.join(' / ')||'sem paradas')}</div></div><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn secondary" style="padding:6px 8px" onclick='abrirRotaAlternativa(${JSON.stringify(g.car)},false)'>🗺️ Abrir rota</button><button class="btn secondary" style="padding:6px 8px" onclick='abrirRotaAlternativa(${JSON.stringify(g.car)},true)'>↩ Buscar equipe</button></div></div>${g.items.map((x,i)=>`<div class="stop"><div class="num">${i+1}</div><div><div class="small" style="font-weight:800;color:${color}">${esc(x._zone.name)} · ${esc(x._bairro)}</div><b>${esc(x.name)}</b><div class="small">${esc(x.addr)}</div><div class="small" style="margin-top:4px;color:#a16207">⚠ Rota alternativa: culto não considerado</div></div><div><button class="check" onclick='toggleVisit(${JSON.stringify(x.city)},${x.idx})'>MARCAR VISITADA</button><br><a class="maplink" target="_blank" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(x.addr)}">🗺️ Navegar</a></div></div>`).join('')||'<div class="small muted" style="padding:10px 2px">Sem paradas neste carro.</div>'}</div>`;
  }

  function render(){
    ensureUI();
    const p=pending(),bs=batches();
    if(altPage>=bs.length)altPage=Math.max(0,bs.length-1);
    const items=bs[altPage]||[],groups=groupsFor(items),zones=[...new Set(items.map(x=>x._zone.name))];
    const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
    set('altPending',p.length);set('altGroups',bs.length);set('altThis',items.length);set('altZones',zones.length);set('altPageLabel',bs.length?'Grupo '+(altPage+1)+' de '+bs.length:'Sorocaba concluída');
    const box=document.getElementById('altCards');if(box)box.innerHTML=p.length?`<div class="cargrid">${groups.map(cardHtml).join('')}</div>`:'<div class="card"><h2>✅ Sorocaba concluída</h2><p class="muted">Não há mais igrejas pendentes em Sorocaba.</p></div>';
  }
  function next(){const n=batches().length;if(altPage<n-1)altPage++;render();}
  function prev(){if(altPage>0)altPage--;render();}

  window.renderRotaAlternativaSorocaba=render;
  window.rotaAlternativaProxima=next;
  window.rotaAlternativaAnterior=prev;
  window.abrirRotaAlternativa=openGroup;
  ensureUI();render();

  // Após marcar visita, recalcula imediatamente os grupos e remove a igreja da alternativa.
  setTimeout(()=>{
    if(typeof window.toggleVisit==='function'&&!window.toggleVisit.__altSorocaba){
      const old=window.toggleVisit;
      const wrapped=async function(){const r=await old.apply(this,arguments);setTimeout(render,80);return r;};
      wrapped.__altSorocaba=true;window.toggleVisit=wrapped;
    }
  },6500);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(render,100);});
})();