// Rota Alternativa V4 — 4 carros, 4 pessoas por carro e cidade independente por equipe.
(function rotaAlternativaV4(){
  const CARS=['Carro A','Carro B','Carro C','Carro D'];
  const COLORS={'Carro A':'#176b3a','Carro B':'#2563eb','Carro C':'#d97706','Carro D':'#7c3aed'};
  const KEY='rota_alternativa_cidades_v4';
  let selected={};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function cidades(){
    if(typeof allChurches!=='function')return [];
    return [...new Set(allChurches().map(x=>x.city).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  }
  function load(){
    try{selected=JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(e){selected={};}
    const cs=cidades();
    CARS.forEach((car,i)=>{if(!cs.includes(selected[car]))selected[car]=cs[i%Math.max(1,cs.length)]||'';});
  }
  function save(){try{localStorage.setItem(KEY,JSON.stringify(selected));}catch(e){}}
  function pending(city){
    if(typeof allChurches!=='function')return [];
    return allChurches().filter(x=>x.city===city&&!state?.visited?.[x.city+'|'+x.idx]);
  }
  function itemsFor(car){
    const city=selected[car]||'';
    const same=CARS.filter(c=>selected[c]===city);
    const offset=Math.max(0,same.indexOf(car))*4;
    return pending(city).slice(offset,offset+4);
  }
  function setCity(car,city){selected[car]=city;save();render();}
  function routeUrl(items,pickup){
    if(!items.length)return '#';
    const ordered=pickup?items.slice().reverse():items.slice();
    const origin=pickup?ordered[0].addr:'Itu, SP';
    const dest=pickup?'Itu, SP':ordered[ordered.length-1].addr;
    const way=pickup?ordered.slice(1).map(x=>x.addr):ordered.slice(0,-1).map(x=>x.addr);
    return 'https://www.google.com/maps/dir/?api=1&origin='+encodeURIComponent(origin)+'&destination='+encodeURIComponent(dest)+(way.length?'&waypoints='+way.map(encodeURIComponent).join('|'):'');
  }
  function openCar(car,pickup){
    const items=itemsFor(car);
    if(!items.length)return alert(car+' não tem igrejas pendentes na cidade escolhida.');
    window.open(routeUrl(items,pickup),'_blank');
  }
  function card(car){
    const city=selected[car]||'',cs=cidades(),items=itemsFor(car),color=COLORS[car];
    return `<div class="card" style="border-top:5px solid ${color}"><div class="car-title"><div><b>🚙 ${car}</b><div class="small muted">4 pessoas · uma cidade por carro</div></div><div class="small" style="font-weight:800;color:${color}">${esc(city||'Escolha a cidade')}</div></div><label class="small muted"><b>Cidade desta equipe</b></label><select style="width:100%;margin:6px 0 12px" onchange='alterarCidadeRotaAlternativa(${JSON.stringify(car)},this.value)'>${cs.map(c=>`<option value="${esc(c)}" ${c===city?'selected':''}>${esc(c)}</option>`).join('')}</select>${items.map((x,i)=>`<div class="stop"><div class="num">${i+1}</div><div><div class="small muted">PESSOA ${i+1} · FICA NESTA IGREJA</div><b>${esc(x.name)}</b><div class="small"><b>${esc(x.city)}</b> — ${esc(x.addr)}</div></div><div><button class="check" onclick='toggleVisit(${JSON.stringify(x.city)},${x.idx})'>MARCAR VISITADA</button><br><a class="maplink" target="_blank" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(x.addr)}">🗺️ Navegar</a></div></div>`).join('')||'<div class="small muted" style="padding:12px 2px">Sem igrejas pendentes nesta cidade para este carro.</div>'}<div class="toolbar"><button class="btn" onclick='abrirRotaAlternativaCidade(${JSON.stringify(car)},false)'>🗺️ Abrir rota</button><button class="btn secondary" onclick='abrirRotaAlternativaCidade(${JSON.stringify(car)},true)'>↩ Buscar equipe</button></div></div>`;
  }
  function ensureUI(){
    const nav=document.querySelector('header nav');
    let btn=document.getElementById('altRouteNav');
    if(!btn&&nav){btn=document.createElement('button');btn.id='altRouteNav';nav.appendChild(btn);}
    if(btn){btn.textContent='🔀 Rotas alternativas';btn.onclick=()=>{if(typeof tab==='function')tab('rotaAlternativa');setTimeout(render,30);};}
    const duplicate=document.getElementById('altRouteCityNav');if(duplicate)duplicate.remove();
    const duplicateSection=document.getElementById('rotaAlternativaCidade');if(duplicateSection)duplicateSection.remove();
    const main=document.querySelector('main');if(!main)return;
    let sec=document.getElementById('rotaAlternativa');
    if(!sec){sec=document.createElement('section');sec.className='tab';sec.id='rotaAlternativa';main.appendChild(sec);}
  }
  function patchHeader(){
    const p=document.querySelector('header p');if(p)p.textContent='Plano operacional pré-elaborado • 4 carros • 16 pessoas • líder: você';
  }
  function render(){
    ensureUI();patchHeader();
    const sec=document.getElementById('rotaAlternativa');if(!sec)return;
    sec.innerHTML=`<div class="notice" style="border-color:#9fc7aa;background:#eef8f1"><b>🔀 ROTAS ALTERNATIVAS POR CIDADE</b><br>Escolha uma cidade diferente para cada carro. Exemplo: <b>Carro A — Porto Feliz</b>, <b>Carro B — Sorocaba</b>, <b>Carro C — Itu</b> e <b>Carro D — Salto</b>. Cada carro leva até <b>4 pessoas</b> e permanece em uma única cidade.</div><div class="grid"><div class="card kpi"><span class="muted">Carros</span><b>4</b></div><div class="card kpi"><span class="muted">Pessoas por carro</span><b>4</b></div><div class="card kpi"><span class="muted">Capacidade total</span><b>16</b></div><div class="card kpi"><span class="muted">Cidades disponíveis</span><b>${cidades().length}</b></div></div><div class="cargrid" style="margin-top:13px">${CARS.map(card).join('')}</div>`;
  }
  window.alterarCidadeRotaAlternativa=setCity;
  window.abrirRotaAlternativaCidade=openCar;
  window.renderRotaAlternativaSorocaba=render;
  window.renderRotaAlternativa=render;
  load();ensureUI();render();
  setTimeout(()=>{load();ensureUI();render();},900);
  setTimeout(()=>{ensureUI();render();},3000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(render,100);});
})();
