// Painel dedicado de cultos — usa igrejaCfg/igrejas_config já existentes.
(function(){
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function ensureUI(){
    const nav=document.querySelector('header nav');
    if(nav&&!document.getElementById('cultosNav')){
      const b=document.createElement('button'); b.id='cultosNav'; b.innerHTML='⛪ Cultos'; b.onclick=()=>{tab('cultos');renderPainelCultos();}; nav.insertBefore(b,document.getElementById('adminNav')||null);
    }
    const main=document.querySelector('main');
    if(main&&!document.getElementById('cultos')){
      const s=document.createElement('section'); s.className='tab'; s.id='cultos';
      s.innerHTML=`<div class="notice"><b>Painel de cultos.</b> Consulte os dias e horários de culto de cada igreja. Informações não confirmadas aparecem como <b>A confirmar</b>. O administrador pode editar e registrar a fonte da confirmação.</div>
      <div class="grid" style="margin-bottom:13px">
        <div class="card kpi"><span class="muted">Igrejas na base</span><b id="cultTotal">0</b></div>
        <div class="card kpi"><span class="muted">Culto confirmado</span><b id="cultOk">0</b></div>
        <div class="card kpi"><span class="muted">A confirmar</span><b id="cultPend">0</b></div>
        <div class="card kpi"><span class="muted">Conflitos</span><b id="cultConflict">0</b></div>
      </div>
      <div class="card"><div class="toolbar">
        <select id="cultCity" onchange="renderPainelCultos()"></select>
        <select id="cultStatus" onchange="renderPainelCultos()"><option value="all">Todos os status</option><option value="confirmado">Culto confirmado</option><option value="nao_confirmado">A confirmar</option><option value="conflito">Conflito</option></select>
        <select id="cultDay" onchange="renderPainelCultos()"><option value="all">Todos os dias</option><option>Domingo</option><option>Segunda</option><option>Terça</option><option>Quarta</option><option>Quinta</option><option>Sexta</option><option>Sábado</option></select>
        <input id="cultQ" oninput="renderPainelCultos()" placeholder="buscar igreja, cidade ou endereço" style="min-width:260px"/>
      </div><div class="admin-table-wrap" id="cultTable"></div></div>`;
      main.appendChild(s);
    }
    const city=document.getElementById('cultCity');
    if(city&&city.options.length===0) city.innerHTML='<option value="ALL">Todas as cidades</option>'+Object.keys(D.cities||{}).sort((a,b)=>a.localeCompare(b,'pt-BR')).map(c=>`<option>${esc(c)}</option>`).join('');
  }
  function normDay(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
  window.renderPainelCultos=function(){
    ensureUI();
    const all=typeof allChurches==='function'?allChurches():[];
    const city=document.getElementById('cultCity')?.value||'ALL';
    const status=document.getElementById('cultStatus')?.value||'all';
    const day=document.getElementById('cultDay')?.value||'all';
    const q=(document.getElementById('cultQ')?.value||'').toLowerCase();
    let arr=all.map(x=>({x,cfg:typeof cfgDaIgreja==='function'?cfgDaIgreja(x.city,x.name,x.addr):{}}));
    const total=arr.length, ok=arr.filter(z=>z.cfg.culto_status==='confirmado').length, conf=arr.filter(z=>z.cfg.culto_status==='conflito').length;
    document.getElementById('cultTotal').textContent=total; document.getElementById('cultOk').textContent=ok; document.getElementById('cultConflict').textContent=conf; document.getElementById('cultPend').textContent=total-ok-conf;
    if(city!=='ALL')arr=arr.filter(z=>z.x.city===city);
    if(status!=='all')arr=arr.filter(z=>(z.cfg.culto_status||'nao_confirmado')===status);
    if(day!=='all')arr=arr.filter(z=>normDay(z.cfg.culto_dias).includes(normDay(day).slice(0,4)));
    if(q)arr=arr.filter(z=>(z.x.city+' '+z.x.name+' '+z.x.addr+' '+(z.cfg.culto_dias||'')+' '+(z.cfg.culto_horario||'')).toLowerCase().includes(q));
    const rank={confirmado:0,conflito:1,nao_confirmado:2};
    arr.sort((a,b)=>(rank[a.cfg.culto_status||'nao_confirmado']-rank[b.cfg.culto_status||'nao_confirmado'])||a.x.city.localeCompare(b.x.city,'pt-BR')||a.x.name.localeCompare(b.x.name,'pt-BR'));
    const rows=arr.map(({x,cfg})=>{
      const st=cfg.culto_status||'nao_confirmado'; const label=st==='confirmado'?'🟢 Confirmado':st==='conflito'?'🔴 Conflito':'🟡 A confirmar';
      const src=cfg.culto_fonte?`<a class="maplink" href="${esc(cfg.culto_fonte)}" target="_blank">Fonte ↗</a>`:'—';
      const edit=(typeof isAdmin==='function'&&isAdmin())?`<button class="btn secondary" style="padding:5px 8px" onclick="editarOperacaoIgreja(${JSON.stringify(x.city)},${JSON.stringify(x.name)},${JSON.stringify(x.addr)})">Editar</button>`:'';
      return `<tr><td><b>${esc(x.city)}</b></td><td><b>${esc(x.name)}</b><div class="small muted">${esc(x.addr)}</div></td><td>${esc(cfg.culto_dias||'A confirmar')}</td><td>${esc(cfg.culto_horario||'—')}</td><td>${label}</td><td>${esc(cfg.prioridade||'normal')}</td><td>${src}</td><td>${edit}</td></tr>`;
    }).join('');
    document.getElementById('cultTable').innerHTML=`<table><thead><tr><th>Cidade</th><th>Igreja / Endereço</th><th>Dia(s) de culto</th><th>Horário</th><th>Status</th><th>Prioridade</th><th>Fonte</th><th></th></tr></thead><tbody>${rows||'<tr><td colspan="8">Nenhuma igreja encontrada com estes filtros.</td></tr>'}</tbody></table>`;
  };
  const oldCarregar=window.carregarIgrejaCfg;
  if(typeof oldCarregar==='function') window.carregarIgrejaCfg=async function(){await oldCarregar(); if(document.getElementById('cultos')?.classList.contains('active'))renderPainelCultos();};
  ensureUI(); setTimeout(ensureUI,500); setTimeout(()=>{if(document.getElementById('cultos')?.classList.contains('active'))renderPainelCultos();},1200);
})();