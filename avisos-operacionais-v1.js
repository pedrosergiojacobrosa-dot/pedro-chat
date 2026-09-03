// Avisos Operacionais V1 — pendências, fechamento de cidade e sugestões de lotação dos carros.
(function avisosOperacionaisV1(){
  const CITY_PRIORITY=['Sorocaba','Porto Feliz','Cabreúva','Mairinque','São Roque','Araçariguama','Itupeva','Votorantim','Araçoiaba da Serra','Alumínio','Ibiúna','Santana de Parnaíba','Cajamar','Caieiras'];
  let channel=null;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function suggestion(n){
    if(n<=0)return '';
    if(n<=5)return `1 carro com ${n} pessoa${n===1?'':'s'}`;
    if(n===6)return '2 carros com 3 + 3 pessoas';
    if(n===7)return '2 carros com 4 + 3 pessoas';
    if(n===8)return '2 carros com 4 + 4 pessoas';
    if(n===9)return '2 carros com 5 + 4 pessoas';
    if(n===10)return '2 carros com 5 + 5 pessoas';
    if(n===11)return '3 carros com 4 + 4 + 3 pessoas';
    if(n===12)return '3 carros com 4 + 4 + 4 pessoas';
    return '3 carros com 4 pessoas; a cidade continua no próximo dia';
  }

  function ensureUI(){
    const nav=document.querySelector('header nav');
    if(nav&&!document.getElementById('avisosNav')){
      const b=document.createElement('button');b.id='avisosNav';b.innerHTML='🔔 Avisos <span id="avisosBadge"></span>';
      b.onclick=()=>{tab('avisos');renderAvisosOperacionais();};
      nav.insertBefore(b,document.getElementById('adminNav')||null);
    }
    const main=document.querySelector('main');
    if(main&&!document.getElementById('avisos')){
      const s=document.createElement('section');s.className='tab';s.id='avisos';
      s.innerHTML=`<div class="notice"><b>🔔 Avisos operacionais.</b> Aqui aparecem igrejas que ficaram pendentes, cidades próximas de serem concluídas e sugestões especiais de 1 a 5 pessoas por carro.</div><div class="toolbar"><button class="btn" onclick="renderAvisosOperacionais()">🔄 Atualizar avisos</button><button class="btn" onclick="gerarRotaFlexV7()">🧠 Gerar rota com pendências</button></div><div id="avisosResumo" class="grid" style="margin-bottom:13px"></div><div id="avisosLista"></div>`;
      main.appendChild(s);
    }
  }

  async function render(){
    ensureUI();
    const list=document.getElementById('avisosLista'),sum=document.getElementById('avisosResumo');
    if(!list||!sum)return;
    if(typeof window.calcularContextoRotasFlexV7!=='function')return;
    list.innerHTML='<div class="card">Calculando pendências...</div>';
    let ctx;
    try{ctx=await window.calcularContextoRotasFlexV7(Number(activeDay||0));}catch(e){list.innerHTML='<div class="notice">Não foi possível calcular os avisos: '+esc(e?.message||e)+'</div>';return;}

    const currentRows=(ctx.agenda||[]).filter(r=>Number(r.dia_indice)===Number(activeDay||0));
    const currentPending=currentRows.filter(r=>!ctx.visited.has([r.cidade,r.igreja,r.endereco||''].join('|')));
    const pendingPrior=ctx.unresolved.reduce((n,x)=>n+x.count,0);
    const currentPriority=CITY_PRIORITY.find(c=>(ctx.remainingAllByCity[c]||0)>0)||Object.keys(ctx.remainingAllByCity).find(c=>ctx.remainingAllByCity[c]>0)||'';
    const currentRemain=currentPriority?(ctx.remainingAllByCity[currentPriority]||0):0;
    const alerts=[];

    ctx.unresolved.forEach(u=>{
      const can=u.eligibleToday;
      let text=`${u.count} igreja${u.count===1?'':'s'} de rota(s) anterior(es) ainda não ${u.count===1?'foi visitada':'foram visitadas'} em ${u.city}.`;
      if(can===u.count&&can>0)text+=` Todas podem entrar no roteiro de ${window.getOperationalDayLabel?.(activeDay)||'hoje'}. Sugestão: ${suggestion(can)} para priorizar o fechamento.`;
      else if(can>0)text+=` ${can} ${can===1?'tem':'têm'} culto no dia selecionado e ${u.count-can} ${u.count-can===1?'fica':'ficam'} aguardando um dia compatível.`;
      else text+=` Nenhuma dessas pendências tem culto cadastrado no dia selecionado; a cidade continua em aberto e o sistema deve avisar, mas não forçar uma visita sem culto.`;
      alerts.push({type:'danger',title:'⚠ Pendência de rota — '+u.city,text});
    });

    if(currentPriority&&currentRemain<=12){
      const todayPool=(ctx.pools||[]).find(p=>p.city===currentPriority);
      const today=todayPool?.items?.length||0;
      let text=`Restam ${currentRemain} igreja${currentRemain===1?'':'s'} não visitada${currentRemain===1?'':'s'} em ${currentPriority}.`;
      if(today===currentRemain&&today>0)text+=` É possível tentar fechar a cidade no dia selecionado: ${suggestion(currentRemain)}.`;
      else if(today>0)text+=` ${today} têm culto no dia selecionado; as demais precisam de outro dia de culto.`;
      else text+=' Nenhuma delas tem culto cadastrado para o dia selecionado.';
      alerts.push({type:'finish',title:'🏁 Fechamento de cidade — '+currentPriority,text});
    }

    if(currentRows.length&&currentPending.length){
      alerts.push({type:'info',title:'📌 Rota atual ainda não concluída',text:`No ${'Dia '+(Number(activeDay||0)+1)} há ${currentPending.length} parada${currentPending.length===1?'':'s'} ainda sem marcação de visita. Se terminarem o dia assim, essas igrejas entram como prioridade no próximo roteiro compatível.`});
    }

    if(!alerts.length)alerts.push({type:'ok',title:'✅ Sem pendências críticas',text:'Não há pendências de dias anteriores nem fechamento especial identificado para o dia selecionado.'});

    const badge=document.getElementById('avisosBadge');const critical=alerts.filter(a=>a.type!=='ok').length;if(badge)badge.textContent=critical?'('+critical+')':'';
    sum.innerHTML=`<div class="card kpi"><span class="muted">Pendências anteriores</span><b>${pendingPrior}</b></div><div class="card kpi"><span class="muted">Pendentes na rota atual</span><b>${currentPending.length}</b></div><div class="card kpi"><span class="muted">Próxima cidade prioritária</span><b style="font-size:18px">${esc(currentPriority||'—')}</b></div><div class="card kpi"><span class="muted">Restantes nessa cidade</span><b>${currentRemain||0}</b></div>`;
    list.innerHTML=alerts.map(a=>`<div class="card" style="margin:10px 0;border-left:6px solid ${a.type==='danger'?'#dc2626':a.type==='finish'?'#d97706':a.type==='info'?'#2563eb':'#176b3a'}"><h3 style="margin:0 0 7px">${esc(a.title)}</h3><div>${esc(a.text)}</div></div>`).join('');
  }

  function subscribe(){
    if(channel||typeof sb==='undefined'||!authUser)return;
    channel=sb.channel('avisos-operacionais-v1')
      .on('postgres_changes',{event:'*',schema:'public',table:'visitas'},()=>setTimeout(render,180))
      .on('postgres_changes',{event:'*',schema:'public',table:'agenda'},()=>setTimeout(render,220))
      .on('postgres_changes',{event:'*',schema:'public',table:'rota_dias'},()=>setTimeout(render,220))
      .subscribe();
  }

  window.renderAvisosOperacionais=render;
  ensureUI();setTimeout(()=>{ensureUI();subscribe();render();},1300);setTimeout(()=>{subscribe();render();},3500);
})();
