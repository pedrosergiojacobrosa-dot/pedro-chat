// Exibe na rota somente o horário referente ao dia operacional selecionado.
(function horarioDiaRotaV1(){
  const LABEL={dom:'Domingo',seg:'Segunda-feira',ter:'Terça-feira',qua:'Quarta-feira',qui:'Quinta-feira',sex:'Sexta-feira',sab:'Sábado'};
  function decorate(){
    const token=window.getOperationalDayToken?.(typeof activeDay!=='undefined'?activeDay:0);
    document.querySelectorAll('.operational-day-hour').forEach(x=>x.remove());
    if(!token)return;
    const items=D?.routes?.[activeDay]||[];
    [...document.querySelectorAll('#routeCards .stop')].forEach((stop,i)=>{
      const church=items[i];if(!church)return;
      const cfg=typeof cfgDaIgreja==='function'?cfgDaIgreja(church.city,church.name,church.addr):{};
      const hour=typeof window.horarioCultoParaDia==='function'?window.horarioCultoParaDia(cfg,token):((cfg?.culto_horarios||{})[token]||'');
      const el=document.createElement('div');el.className='operational-day-hour small';el.style.cssText='margin-top:5px;font-weight:800;color:#176b3a';
      el.textContent='🕒 '+LABEL[token]+': '+(hour||'horário a confirmar');
      stop.children[1]?.appendChild(el);
    });
  }
  function patch(){
    if(typeof window.renderRoute==='function'&&!window.renderRoute.__hourV1){
      const prev=window.renderRoute;
      const wrapped=function(){const r=prev.apply(this,arguments);setTimeout(decorate,0);return r;};wrapped.__hourV1=true;window.renderRoute=wrapped;
    }
    decorate();
  }
  setTimeout(patch,700);setTimeout(patch,1800);setTimeout(patch,3200);
})();