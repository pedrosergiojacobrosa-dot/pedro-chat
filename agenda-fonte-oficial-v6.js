// Agenda V6 — remove definitivamente o fallback das rotas antigas.
(function agendaFonteOficialV6(){
  let channel=null;
  let loading=false;
  const findChurch=row=>{const list=D?.cities?.[row.cidade]||[];let idx=list.findIndex(x=>x.name===row.igreja&&(!row.endereco||x.addr===row.endereco));if(idx<0)idx=list.findIndex(x=>x.name===row.igreja);if(idx<0)return null;return {city:row.cidade,idx,...list[idx],_agendaPos:Number(row.posicao),_carro:row.carro||'',_agendaId:row.id};};

  async function load(){
    if(loading||typeof sb==='undefined'||!authUser||typeof D==='undefined')return;
    loading=true;
    try{
      const {data,error}=await sb.from('agenda').select('id,igreja,cidade,endereco,carro,equipe,status,dia_indice,posicao,horario,observacao').eq('status','programada').not('dia_indice','is',null).not('posicao','is',null).order('dia_indice',{ascending:true}).order('posicao',{ascending:true});
      if(error)throw error;
      const days=Array.from({length:28},()=>[]);
      (data||[]).forEach(row=>{const day=Number(row.dia_indice),church=findChurch(row);if(church&&day>=0&&day<28)days[day].push(church);});
      // A partir daqui, não existe mais rota antiga como fallback.
      D.routes.splice(0,D.routes.length,...days);
      if(typeof renderRoute==='function')renderRoute();
      if(typeof updateMapDay==='function'&&typeof map!=='undefined'&&map)updateMapDay();
      const plan=document.getElementById('nPlan');if(plan)plan.textContent=days.reduce((n,r)=>n+r.length,0);
    }catch(e){console.warn('agenda oficial',e?.message||e);}finally{loading=false;}
    subscribe();
  }

  function subscribe(){
    if(channel||typeof sb==='undefined'||!authUser)return;
    channel=sb.channel('agenda-fonte-oficial-v6').on('postgres_changes',{event:'*',schema:'public',table:'agenda'},()=>setTimeout(load,260)).subscribe();
  }

  window.loadRouteOverrides=load;
  window.carregarRotaOficial=load;
  if(typeof window.aplicarSessao==='function'){
    const prev=window.aplicarSessao;
    window.aplicarSessao=async function(session){await prev(session);await load();};
  }
  setTimeout(load,900);setTimeout(load,2000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(load,100);});
})();