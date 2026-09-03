// Sincronização em tempo real entre aparelhos conectados.
(function realtimeSyncModule(){
  let syncChannel=null;
  let syncTimer=null;
  const pending={};

  function debounce(key,fn,delay=180){
    clearTimeout(pending[key]);
    pending[key]=setTimeout(()=>Promise.resolve(fn()).catch(err=>console.warn('realtime '+key,err?.message||err)),delay);
  }

  function ensureStatus(){
    const bar=document.getElementById('sessionBar');
    if(!bar||document.getElementById('realtimeStatus'))return;
    const el=document.createElement('span');
    el.id='realtimeStatus';
    el.className='session-pill';
    el.textContent='● Sincronizando';
    bar.insertBefore(el,bar.querySelector('button')||null);
  }

  function setStatus(text,ok){
    ensureStatus();
    const el=document.getElementById('realtimeStatus');
    if(!el)return;
    el.textContent=(ok?'● ':'○ ')+text;
    el.style.background=ok?'#dff3e533':'#fff1c733';
  }

  async function syncVisitsFull(){
    if(typeof sb==='undefined'||!authUser||typeof D==='undefined'||typeof state==='undefined')return;
    const {data,error}=await sb.from('visitas').select('igreja,cidade,endereco,status').eq('status','visitada');
    if(error)throw error;
    const next={};
    (data||[]).forEach(v=>{
      const list=D.cities?.[v.cidade]||[];
      let idx=list.findIndex(x=>(x.name||'')===v.igreja&&(!v.endereco||(x.addr||'')===v.endereco));
      if(idx<0)idx=list.findIndex(x=>(x.name||'')===v.igreja);
      if(idx>=0)next[v.cidade+'|'+idx]=true;
    });
    state.visited=next;
    if(typeof save==='function')save();
    if(typeof renderRoute==='function')renderRoute();
    if(typeof renderAll==='function')renderAll();
    if(typeof updateKpis==='function')updateKpis();
    if(typeof updateMapDay==='function'&&typeof map!=='undefined'&&map)updateMapDay();
  }

  async function syncCultosFull(){
    if(typeof carregarIgrejaCfg==='function')await carregarIgrejaCfg();
    if(typeof renderPainelCultos==='function'&&document.getElementById('cultos')?.classList.contains('active'))renderPainelCultos();
  }

  async function syncAgendaFull(){
    if(typeof loadRouteOverrides==='function')await loadRouteOverrides();
  }

  async function syncAll(){
    if(!authUser)return;
    await Promise.allSettled([syncVisitsFull(),syncCultosFull(),syncAgendaFull()]);
  }

  function stopRealtime(){
    clearInterval(syncTimer);
    syncTimer=null;
    if(syncChannel&&typeof sb!=='undefined'){
      try{sb.removeChannel(syncChannel);}catch(_){ }
    }
    syncChannel=null;
    setStatus('Offline',false);
  }

  function startRealtime(){
    if(typeof sb==='undefined'||!authUser)return;
    ensureStatus();
    if(syncChannel)return;

    syncChannel=sb.channel('roteiro-equipe-realtime-v2')
      .on('postgres_changes',{event:'*',schema:'public',table:'visitas'},()=>debounce('visitas',syncVisitsFull))
      .on('postgres_changes',{event:'*',schema:'public',table:'igrejas_config'},()=>debounce('cultos',syncCultosFull))
      .on('postgres_changes',{event:'*',schema:'public',table:'agenda'},()=>debounce('agenda',syncAgendaFull))
      .subscribe(status=>{
        if(status==='SUBSCRIBED'){
          setStatus('Ao vivo',true);
          syncAll();
        }else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){
          setStatus('Reconectando',false);
        }
      });

    // Rede móvel pode suspender sockets em segundo plano. Esta checagem é um fallback leve.
    syncTimer=setInterval(()=>{if(document.visibilityState==='visible'&&authUser)syncAll();},90000);
  }

  window.sincronizarTudoAgora=syncAll;
  window.iniciarRealtimeEquipe=startRealtime;

  if(typeof window.aplicarSessao==='function'){
    const prevApply=window.aplicarSessao;
    window.aplicarSessao=async function(session){
      await prevApply(session);
      startRealtime();
      await syncAll();
    };
  }

  if(typeof window.bloquearSessao==='function'){
    const prevBlock=window.bloquearSessao;
    window.bloquearSessao=async function(){
      stopRealtime();
      return prevBlock();
    };
  }

  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible'&&authUser){startRealtime();debounce('resume',syncAll,80);}
  });
  window.addEventListener('online',()=>{if(authUser){startRealtime();debounce('online',syncAll,80);}});
  window.addEventListener('focus',()=>{if(authUser)debounce('focus',syncAll,120);});

  setTimeout(()=>{if(typeof authUser!=='undefined'&&authUser){startRealtime();syncAll();}},1200);
})();
