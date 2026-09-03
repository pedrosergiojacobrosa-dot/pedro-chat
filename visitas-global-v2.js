// Visitas V2 — status global por igreja, sincronizado para toda a equipe.
(function visitasGlobalV2(){
  let busy=new Set();
  const key=(city,idx)=>city+'|'+idx;

  function repaint(){
    if(typeof save==='function')save();
    if(typeof renderRoute==='function')renderRoute();
    if(typeof renderAll==='function')renderAll();
    if(typeof updateKpis==='function')updateKpis();
    if(typeof updateMapDay==='function'&&typeof map!=='undefined'&&map)updateMapDay();
  }

  async function syncFull(){
    if(typeof sb==='undefined'||!authUser||typeof D==='undefined'||typeof state==='undefined')return;
    const {data,error}=await sb.from('visitas').select('igreja,cidade,endereco,status').eq('status','visitada');
    if(error){console.warn('visitas globais',error.message);return;}
    const next={};
    (data||[]).forEach(v=>{
      const list=D.cities?.[v.cidade]||[];
      let idx=list.findIndex(x=>(x.name||'')===v.igreja&&((v.endereco||'')===(x.addr||'')));
      if(idx<0)idx=list.findIndex(x=>(x.name||'')===v.igreja);
      if(idx>=0)next[key(v.cidade,idx)]=true;
    });
    state.visited=next;
    repaint();
  }

  async function setVisit(city,idx){
    const k=key(city,idx),church=(D.cities?.[city]||[])[idx];
    if(!church||!authUser||busy.has(k))return;
    busy.add(k);
    const was=!!state.visited[k],target=!was;
    state.visited[k]=target;
    repaint();
    try{
      if(target){
        let q=sb.from('visitas').select('id').eq('cidade',city).eq('igreja',church.name).eq('status','visitada');
        q=(church.addr||'')?q.eq('endereco',church.addr):q.or('endereco.is.null,endereco.eq.');
        const {data:existing,error:findErr}=await q.limit(1);
        if(findErr)throw findErr;
        if(!(existing||[]).length){
          const {error}=await sb.from('visitas').insert({usuario_id:authUser.id,igreja:church.name,cidade:city,endereco:church.addr||null,equipe:authProfile?.equipe||null,carro:authProfile?.carro||null,status:'visitada'});
          if(error&&error.code!=='23505')throw error;
        }
        if(typeof registrarAtividade==='function')await registrarAtividade('visita',church.name,city,'Marcou a igreja como visitada');
      }else{
        let q=sb.from('visitas').delete().eq('cidade',city).eq('igreja',church.name).eq('status','visitada');
        q=(church.addr||'')?q.eq('endereco',church.addr):q.or('endereco.is.null,endereco.eq.');
        const {error}=await q;
        if(error)throw error;
        if(typeof registrarAtividade==='function')await registrarAtividade('visita_desfeita',church.name,city,'Removeu globalmente a marcação de visitada');
      }
      await syncFull();
    }catch(e){
      state.visited[k]=was;
      repaint();
      alert('Não foi possível atualizar a visita: '+(e?.message||e));
    }finally{busy.delete(k);}
  }

  window.toggleVisit=setVisit;
  window.sincronizarVisitas=syncFull;
  window.sincronizarVisitasGlobal=syncFull;

  if(typeof window.aplicarSessao==='function'){
    const prev=window.aplicarSessao;
    window.aplicarSessao=async function(session){await prev(session);await syncFull();};
  }
  setTimeout(()=>{if(typeof authUser!=='undefined'&&authUser)syncFull();},900);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&authUser)setTimeout(syncFull,100);});
})();