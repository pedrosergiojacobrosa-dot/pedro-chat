// Visitas x Rotas V2 — ao marcar visitada, remove imediatamente da rota atual e de todas as rotas futuras.
// O histórico permanece preservado na tabela `visitas` do Supabase.
(function visitasRotasV2(){
  function bind(){
    if(typeof window.toggleVisit!=='function'||window.toggleVisit.__visitasRotasV2)return;
    const prev=window.toggleVisit;
    const wrapped=async function(city,idx){
      const k=city+'|'+idx;
      const was=!!state?.visited?.[k];
      const church=D?.cities?.[city]?.[idx];
      await prev(city,idx);
      const now=!!state?.visited?.[k];

      // Nova visita confirmada: retira da agenda do dia atual em diante.
      if(church&&!was&&now&&typeof sb!=='undefined'&&authUser){
        let q=sb.from('agenda')
          .delete()
          .eq('status','programada')
          .eq('cidade',city)
          .eq('igreja',church.name)
          .gte('dia_indice',Number(activeDay||0));
        if(church.addr)q=q.eq('endereco',church.addr);
        const {error}=await q;
        if(error)console.warn('limpeza de rotas após visita',error.message);

        if(typeof window.carregarRotaOficial==='function')await window.carregarRotaOficial();
        if(typeof window.carregarRotaFlex==='function')await window.carregarRotaFlex();
        if(typeof window.renderAvisosOperacionais==='function')await window.renderAvisosOperacionais();
        if(typeof window.updateMapDay==='function'&&typeof map!=='undefined'&&map)await window.updateMapDay();
      }
      return now;
    };
    wrapped.__visitasRotasV2=true;
    window.toggleVisit=wrapped;
  }

  bind();
  setTimeout(bind,1200);
  setTimeout(bind,3800);
  setTimeout(bind,6200);
})();
