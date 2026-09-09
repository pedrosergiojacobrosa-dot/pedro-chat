// Status dos dias V1 — permite concluir um dia operacional e avançar para o próximo.
(function statusDiasV1(){
  const KEY='roteiro_dias_concluidos_v1';
  let done={};
  function load(){try{done=JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(e){done={};}}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(done));}catch(e){}}
  function isDone(i){return !!done[String(i)];}
  function label(i){return typeof window.getOperationalDayLabel==='function'?(window.getOperationalDayLabel(i)||('Dia '+(i+1))):('Dia '+(i+1));}
  function currentSuggested(){for(let i=0;i<28;i++)if(!isDone(i))return i;return 27;}
  function mark(i,value){done[String(i)]=!!value;save();renderStatus();renderButtons();}
  function concludeCurrent(){const i=Number(typeof activeDay!=='undefined'?activeDay:0);if(!confirm('Marcar '+label(i)+' como concluído?'))return;mark(i,true);const next=Math.min(27,i+1);if(typeof activeDay!=='undefined')activeDay=next;const m=document.getElementById('mapDay');if(m)m.value=String(next);if(typeof renderRoute==='function')renderRoute();if(typeof updateMapDay==='function')try{updateMapDay();}catch(e){}setTimeout(()=>{renderStatus();renderButtons();},100);}
  function reopenCurrent(){const i=Number(typeof activeDay!=='undefined'?activeDay:0);mark(i,false);if(typeof renderRoute==='function')renderRoute();}
  function goDay(i){if(typeof activeDay!=='undefined')activeDay=Number(i);const m=document.getElementById('mapDay');if(m)m.value=String(i);if(typeof renderRoute==='function')renderRoute();if(typeof updateMapDay==='function')try{updateMapDay();}catch(e){}setTimeout(()=>{renderStatus();renderButtons();},80);}
  function ensure(){
    const rota=document.getElementById('rota');if(!rota)return;
    if(!document.getElementById('dayStatusCard')){
      const box=document.createElement('div');box.id='dayStatusCard';box.className='card';box.style.margin='12px 0';
      const cards=document.getElementById('routeCards');if(cards)rota.insertBefore(box,cards);else rota.appendChild(box);
    }
  }
  function renderStatus(){
    ensure();const box=document.getElementById('dayStatusCard');if(!box)return;
    const i=Number(typeof activeDay!=='undefined'?activeDay:0),ok=isDone(i);
    box.innerHTML=`<div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><div><div class="small muted">STATUS DO DIA</div><h3 style="margin:4px 0">${ok?'✅ '+label(i)+' concluído':'🟡 '+label(i)+' em andamento'}</h3><div class="small muted">Dias concluídos: ${Object.values(done).filter(Boolean).length} de 28</div></div><div>${ok?'<button class="btn secondary" onclick="reabrirDiaAtual()">↩ Reabrir dia</button>':'<button class="btn" onclick="concluirDiaAtual()">✅ CONCLUIR DIA E AVANÇAR</button>'}</div></div>`;
  }
  function renderButtons(){
    const wrap=document.getElementById('dayButtons');if(!wrap)return;
    const current=Number(typeof activeDay!=='undefined'?activeDay:0);
    wrap.innerHTML=Array.from({length:28},(_,i)=>`<button class="btn ${i===current?'':'secondary'}" style="${isDone(i)?'outline:2px solid #22c55e;':''}" onclick="irParaDiaOperacional(${i})">${isDone(i)?'✅ ':''}${i+1}</button>`).join('');
  }
  function patchRender(){
    if(typeof window.renderRoute==='function'&&!window.renderRoute.__statusDiasV1){
      const old=window.renderRoute;const w=async function(){const r=await old.apply(this,arguments);setTimeout(()=>{renderStatus();renderButtons();},40);return r;};w.__statusDiasV1=true;window.renderRoute=w;
    }
  }
  window.concluirDiaAtual=concludeCurrent;window.reabrirDiaAtual=reopenCurrent;window.irParaDiaOperacional=goDay;window.diaOperacionalConcluido=isDone;
  load();patchRender();setTimeout(()=>{patchRender();ensure();const suggested=currentSuggested();if(typeof activeDay!=='undefined'&&Number(activeDay)===0&&isDone(0)){activeDay=suggested;}if(typeof renderRoute==='function')renderRoute();renderStatus();renderButtons();},1300);setTimeout(()=>{patchRender();renderStatus();renderButtons();},3800);
})();