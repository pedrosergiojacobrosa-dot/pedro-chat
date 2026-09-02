(function routeEditorModule(){
  const BASE_ROUTES=(D.routes||[]).map(route=>route.map(x=>({...x})));
  let routeOverrides={};
  let editorDay=0;
  let editorPos=0;
  let agendaChannel=null;

  const escRoute=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const keyRoute=(day,pos)=>day+'|'+pos;
  const keyChurch=x=>x.city+'|'+x.idx;
  const carName=pos=>pos<4?'Carro A':pos<8?'Carro B':'Carro C';
  const carLetter=pos=>pos<4?'A':pos<8?'B':'C';
  const weekdayToken=date=>['dom','seg','ter','qua','qui','sex','sab'][date.getDay()];
  const normalizeDays=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

  function configFor(x){
    return typeof cfgDaIgreja==='function'?cfgDaIgreja(x.city,x.name,x.addr):{};
  }

  function hasServiceOn(x,date){
    const cfg=configFor(x);
    const days=normalizeDays(cfg.culto_dias);
    if(days)return days.includes(weekdayToken(date));
    if(cfg.culto_status==='conflito')return false;
    return null;
  }

  function findChurch(city,name,address){
    const list=D.cities[city]||[];
    let idx=list.findIndex(x=>x.name===name&&x.addr===address);
    if(idx<0)idx=list.findIndex(x=>x.name===name);
    if(idx<0)return null;
    return {city,idx,...list[idx]};
  }

  function applyOverrides(){
    D.routes.splice(0,D.routes.length,...BASE_ROUTES.map(route=>route.map(x=>({...x}))));
    Object.values(routeOverrides).forEach(row=>{
      const day=Number(row.dia_indice),pos=Number(row.posicao);
      const church=findChurch(row.cidade,row.igreja,row.endereco);
      if(church&&D.routes[day]&&pos>=0&&pos<12)D.routes[day][pos]=church;
    });
  }

  function refreshRouteViews(){
    if(typeof renderRoute==='function')renderRoute();
    if(typeof renderCal==='function')renderCal();
    if(typeof updateMapDay==='function'&&typeof map!=='undefined'&&map)updateMapDay();
    const plan=document.getElementById('nPlan');
    if(plan)plan.textContent=D.routes.reduce((total,route)=>total+route.length,0);
  }

  async function loadRouteOverrides(){
    if(typeof sb==='undefined'||!authUser)return;
    const {data,error}=await sb.from('agenda')
      .select('id,igreja,cidade,endereco,data_visita,horario,carro,status,dia_indice,posicao,observacao')
      .eq('status','programada')
      .not('dia_indice','is',null)
      .not('posicao','is',null);
    if(error){console.warn('ajustes de rota',error.message);return;}
    routeOverrides={};
    (data||[]).forEach(row=>routeOverrides[keyRoute(row.dia_indice,row.posicao)]=row);
    applyOverrides();
    refreshRouteViews();
    subscribeRouteChanges();
  }

  function subscribeRouteChanges(){
    if(agendaChannel||typeof sb==='undefined')return;
    agendaChannel=sb.channel('agenda-rota-compartilhada')
      .on('postgres_changes',{event:'*',schema:'public',table:'agenda'},()=>loadRouteOverrides())
      .subscribe();
  }

  function ensureRouteEditorUI(){
    if(!document.getElementById('routeEditorStyles')){
      const style=document.createElement('style');
      style.id='routeEditorStyles';
      style.textContent=`
        .route-tools{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}
        .route-change{margin-top:7px;display:flex;gap:6px;flex-wrap:wrap}
        .route-compat{display:inline-block;margin-top:6px;padding:3px 7px;border-radius:999px;font-size:11px;font-weight:800}
        .route-compat.ok{background:#dff3e5;color:#155b33}
        .route-compat.bad{background:#fde7e5;color:#8b322d}
        .route-compat.unknown{background:#fff1c7;color:#725a0b}
        .route-modal{display:none;position:fixed;inset:0;z-index:100001;background:#0009;align-items:center;justify-content:center;padding:16px}
        .route-modal.open{display:flex}
        .route-modal-box{width:min(900px,98vw);max-height:92vh;overflow:auto;background:#fff;border-radius:18px;padding:16px}
        .route-choice{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;border:1px solid var(--line);border-radius:11px;padding:10px;margin:7px 0}
        .route-choice.compatible{border-left:5px solid #2e9b57}
        .route-choice.unknown{border-left:5px solid #d7a51c}
        @media(max-width:650px){.route-choice{grid-template-columns:1fr}.route-choice .btn{width:100%}}
      `;
      document.head.appendChild(style);
    }

    const routeSection=document.getElementById('rota');
    if(routeSection&&!document.getElementById('routeTools')){
      const tools=document.createElement('div');
      tools.id='routeTools';
      tools.className='route-tools';
      tools.innerHTML='<button class="btn" onclick="autoAdjustRouteByServices()">✨ Ajustar o dia pelos cultos</button><span class="small muted" style="align-self:center">Trocas feitas aqui ficam salvas para toda a equipe.</span>';
      const cards=document.getElementById('routeCards');
      cards?.parentNode?.insertBefore(tools,cards);
    }

    if(!document.getElementById('routeChangeModal')){
      const modal=document.createElement('div');
      modal.id='routeChangeModal';
      modal.className='route-modal';
      modal.innerHTML=`
        <div class="route-modal-box">
          <div style="display:flex;justify-content:space-between;gap:12px;align-items:start">
            <div><h2 style="margin:0">Trocar igreja da rota</h2><p class="muted" id="routeCurrentStop"></p></div>
            <button class="btn secondary" onclick="closeRouteChange()">Fechar</button>
          </div>
          <div class="toolbar">
            <input id="routeSearch" placeholder="Buscar igreja, cidade ou endereço" oninput="renderRouteChoices()" style="min-width:280px;flex:1">
            <label class="small"><input id="routeCompatibleOnly" type="checkbox" checked onchange="renderRouteChoices()"> Somente com culto neste dia</label>
          </div>
          <div id="routeChoiceList"></div>
        </div>`;
      document.body.appendChild(modal);
    }
  }

  function renderRouteDecorations(){
    ensureRouteEditorUI();
    const items=D.routes[activeDay]||[];
    const date=dateFor(activeDay);
    const cards=[...document.querySelectorAll('#routeCards .cargrid > .card')];

    cards.forEach((card,index)=>{
      const header=card.querySelector('.car-title');
      if(header&&!header.querySelector('.individual-route')){
        const button=document.createElement('button');
        button.className='btn secondary individual-route';
        button.style.padding='6px 9px';
        button.textContent='🗺️ Abrir rota';
        button.onclick=()=>openCarRoute(index);
        header.appendChild(button);
      }
    });

    [...document.querySelectorAll('#routeCards .stop')].forEach((stop,pos)=>{
      const church=items[pos];
      if(!church)return;
      const state=hasServiceOn(church,date);
      const middle=stop.children[1];
      if(middle&&!middle.querySelector('.route-compat')){
        const badge=document.createElement('span');
        badge.className='route-compat '+(state===true?'ok':state===false?'bad':'unknown');
        badge.textContent=state===true?'✓ Culto compatível com o dia':state===false?'✕ Sem culto cadastrado neste dia':'? Dia de culto ainda não informado';
        middle.appendChild(document.createElement('br'));
        middle.appendChild(badge);
      }
      if(typeof isAdmin==='function'&&isAdmin()&&middle&&!middle.querySelector('.route-change')){
        const actions=document.createElement('div');
        actions.className='route-change';
        actions.innerHTML='<button class="btn" style="padding:5px 8px" onclick="openRouteChange('+pos+')">🔄 Trocar igreja</button>'+
          (routeOverrides[keyRoute(activeDay,pos)]?'<button class="btn secondary" style="padding:5px 8px" onclick="restoreBaseRoute('+pos+')">↩ Usar igreja original</button>':'');
        middle.appendChild(actions);
      }
    });
  }

  function openCarRoute(carIndex){
    const items=(D.routes[activeDay]||[]).slice(carIndex*4,carIndex*4+4);
    if(!items.length)return alert('Este carro ainda não tem paradas.');
    const destination=items[items.length-1].addr;
    const waypoints=items.slice(0,-1).map(x=>encodeURIComponent(x.addr)).join('|');
    const url='https://www.google.com/maps/dir/?api=1&origin='+encodeURIComponent('Itu, SP')+
      '&destination='+encodeURIComponent(destination)+(waypoints?'&waypoints='+waypoints:'');
    window.open(url,'_blank');
  }

  function openRouteChange(pos){
    if(typeof isAdmin!=='function'||!isAdmin())return alert('Somente o administrador pode trocar igrejas.');
    editorDay=activeDay;
    editorPos=pos;
    ensureRouteEditorUI();
    const current=D.routes[editorDay][editorPos];
    document.getElementById('routeCurrentStop').innerHTML='<b>'+carName(editorPos)+' · parada '+((editorPos%4)+1)+'</b><br>Atual: '+escRoute(current.name)+' — '+escRoute(current.city);
    document.getElementById('routeSearch').value='';
    document.getElementById('routeCompatibleOnly').checked=true;
    document.getElementById('routeChangeModal').classList.add('open');
    renderRouteChoices();
  }

  function closeRouteChange(){
    document.getElementById('routeChangeModal')?.classList.remove('open');
  }

  function candidateChurches(){
    const query=(document.getElementById('routeSearch')?.value||'').toLowerCase();
    const onlyCompatible=document.getElementById('routeCompatibleOnly')?.checked;
    const current=D.routes[editorDay][editorPos];
    const date=dateFor(editorDay);
    const used=new Set(D.routes.flat().map(keyChurch));
    used.delete(keyChurch(current));

    return allChurches()
      .filter(x=>!used.has(keyChurch(x)))
      .filter(x=>!state.visited[keyChurch(x)])
      .map(x=>({x,compat:hasServiceOn(x,date),cfg:configFor(x)}))
      .filter(row=>!onlyCompatible||row.compat===true)
      .filter(row=>!query||(row.x.city+' '+row.x.name+' '+row.x.addr+' '+(row.cfg.culto_dias||'')).toLowerCase().includes(query))
      .sort((a,b)=>{
        const compatRank=v=>v===true?0:v===null?1:2;
        const priorityRank=v=>v==='alta'?0:v==='normal'?1:2;
        return compatRank(a.compat)-compatRank(b.compat)||
          Number(b.x.city===current.city)-Number(a.x.city===current.city)||
          priorityRank(a.cfg.prioridade||'normal')-priorityRank(b.cfg.prioridade||'normal')||
          a.x.city.localeCompare(b.x.city,'pt-BR')||
          a.x.name.localeCompare(b.x.name,'pt-BR');
      })
      .slice(0,120);
  }

  function renderRouteChoices(){
    const list=document.getElementById('routeChoiceList');
    if(!list)return;
    const rows=candidateChurches();
    if(!rows.length){
      list.innerHTML='<div class="notice">Nenhuma igreja compatível foi encontrada. Desmarque “Somente com culto neste dia” para ver todas as igrejas disponíveis.</div>';
      return;
    }
    list.innerHTML=rows.map(({x,compat,cfg})=>`
      <div class="route-choice ${compat===true?'compatible':'unknown'}">
        <div><b>${escRoute(x.name)}</b><div>${escRoute(x.city)} — ${escRoute(x.addr)}</div><div class="small">${compat===true?'🟢 Culto compatível':compat===false?'🔴 Sem culto neste dia':'🟡 Dias ainda não informados'}${cfg.culto_dias?' · '+escRoute(cfg.culto_dias):''}${cfg.culto_horario?' · '+escRoute(cfg.culto_horario):''}</div></div>
        <button class="btn" onclick='saveRouteChange(${JSON.stringify(x.city)},${x.idx})'>Escolher</button>
      </div>`).join('');
  }

  async function saveAssignment(day,pos,church,reason,quiet){
    const cfg=configFor(church);
    const payload={
      igreja:church.name,
      cidade:church.city,
      endereco:church.addr,
      data_visita:dk(dateFor(day)),
      horario:cfg.culto_horario||null,
      equipe:'Equipe '+carLetter(pos),
      carro:carName(pos),
      status:'programada',
      observacao:reason,
      criado_por:authUser.id,
      atualizado_por:authUser.id,
      dia_indice:day,
      posicao:pos
    };
    const {data,error}=await sb.from('agenda').upsert(payload,{onConflict:'dia_indice,posicao'}).select().single();
    if(error)throw error;
    routeOverrides[keyRoute(day,pos)]=data;
    applyOverrides();
    if(!quiet)refreshRouteViews();
    return data;
  }

  async function saveRouteChange(city,idx){
    const church={city,idx,...D.cities[city][idx]};
    try{
      await saveAssignment(editorDay,editorPos,church,'Substituição manual no roteiro',false);
      await registrarAtividade('rota_alterada',church.name,church.city,carName(editorPos)+' · dia '+(editorDay+1));
      closeRouteChange();
    }catch(error){
      alert('Não foi possível trocar a igreja: '+(error.message||error));
    }
  }

  async function restoreBaseRoute(pos){
    if(!confirm('Voltar para a igreja original desta parada?'))return;
    const {error}=await sb.from('agenda').delete().eq('dia_indice',activeDay).eq('posicao',pos);
    if(error)return alert('Não foi possível restaurar: '+error.message);
    delete routeOverrides[keyRoute(activeDay,pos)];
    applyOverrides();
    await registrarAtividade('rota_restaurada',null,null,carName(pos)+' · dia '+(activeDay+1));
    refreshRouteViews();
  }

  async function autoAdjustRouteByServices(){
    if(typeof isAdmin!=='function'||!isAdmin())return alert('Somente o administrador pode ajustar a rota.');
    const date=dateFor(activeDay);
    const route=D.routes[activeDay]||[];
    const incompatible=route.map((x,pos)=>({x,pos})).filter(row=>hasServiceOn(row.x,date)===false);
    if(!incompatible.length)return alert('Nenhuma parada com conflito de culto foi encontrada neste dia.');
    if(!confirm('O sistema encontrou '+incompatible.length+' parada(s) incompatível(is). Substituir automaticamente por igrejas com culto neste dia?'))return;

    const used=new Set(D.routes.flat().map(keyChurch));
    let changed=0;
    for(const row of incompatible){
      used.delete(keyChurch(row.x));
      const candidates=allChurches()
        .filter(x=>!used.has(keyChurch(x))&&!state.visited[keyChurch(x)]&&hasServiceOn(x,date)===true)
        .sort((a,b)=>{
          const sameA=Number(a.city===row.x.city),sameB=Number(b.city===row.x.city);
          const priorityRank=x=>configFor(x).prioridade==='alta'?0:configFor(x).prioridade==='baixa'?2:1;
          return sameB-sameA||priorityRank(a)-priorityRank(b)||a.city.localeCompare(b.city,'pt-BR');
        });
      const replacement=candidates[0];
      if(!replacement){used.add(keyChurch(row.x));continue;}
      await saveAssignment(activeDay,row.pos,replacement,'Ajuste automático conforme dia de culto',true);
      used.add(keyChurch(replacement));
      changed++;
    }
    applyOverrides();
    refreshRouteViews();
    await registrarAtividade('rota_auto_ajustada',null,null,changed+' troca(s) no dia '+(activeDay+1));
    alert(changed?changed+' igreja(s) foram substituídas por opções com culto compatível.':'Não encontrei igrejas disponíveis com culto compatível.');
  }

  window.openCarRoute=openCarRoute;
  window.openRouteChange=openRouteChange;
  window.closeRouteChange=closeRouteChange;
  window.renderRouteChoices=renderRouteChoices;
  window.saveRouteChange=saveRouteChange;
  window.restoreBaseRoute=restoreBaseRoute;
  window.autoAdjustRouteByServices=autoAdjustRouteByServices;
  window.loadRouteOverrides=loadRouteOverrides;

  const previousRenderRoute=window.renderRoute;
  window.renderRoute=function(){
    previousRenderRoute();
    renderRouteDecorations();
  };

  if(typeof window.salvarCfgIgreja==='function'){
    const previousSaveConfig=window.salvarCfgIgreja;
    window.salvarCfgIgreja=async function(...args){
      const result=await previousSaveConfig(...args);
      refreshRouteViews();
      return result;
    };
  }

  if(typeof window.aplicarSessao==='function'){
    const previousApplySession=window.aplicarSessao;
    window.aplicarSessao=async function(session){
      await previousApplySession(session);
      await loadRouteOverrides();
    };
  }

  ensureRouteEditorUI();
  setTimeout(()=>{
    if(typeof authUser!=='undefined'&&authUser)loadRouteOverrides();
    else refreshRouteViews();
  },900);
})();
