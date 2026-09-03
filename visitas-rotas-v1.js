// Visitas x Rotas V1 — mantém a parada no dia atual para recolhimento, mas remove a igreja das rotas futuras.
(function visitasRotasV1(){
  function bind(){
    if(typeof window.toggleVisit!=='function'||window.toggleVisit.__visitasRotasV1)return;
    const prev=window.toggleVisit;
    const wrapped=async function(city,idx){
      const k=city+'|'+idx,was=!!state?.visited?.[k],church=D?.cities?.[city]?.[idx];
      await prev(city,idx);
      const now=!!state?.visited?.[k];
      if(church&&!was&&now&&typeof sb!=='undefined'&&authUser){
        let q=sb.from('agenda').delete().eq('status','programada').eq('cidade',city).eq('igreja',church.name).gt('dia_indice',Number(activeDay||0));
        if(church.addr)q=q.eq('endereco',church.addr);
        const {error}=await q;
        if(error)console.warn('limpeza de rotas futuras',error.message);
        if(typeof window.carregarRotaOficial==='function')await window.carregarRotaOficial();
        if(typeof window.renderAvisosOperacionais==='function')await window.renderAvisosOperacionais();
      }
      return now;
    };
    wrapped.__visitasRotasV1=true;window.toggleVisit=wrapped;
  }
  bind();setTimeout(bind,1200);setTimeout(bind,3800);
})();
