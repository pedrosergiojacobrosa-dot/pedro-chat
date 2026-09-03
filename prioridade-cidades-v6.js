// Prioridade V6 — carros completos primeiro; no máximo um carro parcial no final.
(function prioridadeCidadesV6(){
  const TAG='[AUTO-PRIORIDADE-CIDADES-V6]';
  const CAR_NAMES=['Carro A','Carro B','Carro C'];
  const DAY_LABEL={dom:'Domingo',seg:'Segunda-feira',ter:'Terça-feira',qua:'Quarta-feira',qui:'Quinta-feira',sex:'Sexta-feira',sab:'Sábado'};
  const CITY_PRIORITY=['Sorocaba','Porto Feliz','Cabreúva','Mairinque','São Roque','Araçariguama','Itupeva','Votorantim','Araçoiaba da Serra','Alumínio','Ibiúna','Santana de Parnaíba','Cajamar','Caieiras'];
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const rankMap=new Map(CITY_PRIORITY.map((c,i)=>[norm(c),i]));
  const key=x=>x.city+'|'+x.idx;
  const cfg=x=>typeof cfgDaIgreja==='function'?cfgDaIgreja(x.city,x.name,x.addr):{};
  const cityRank=c=>rankMap.has(norm(c))?rankMap.get(norm(c)):1000;
  // A regra operacional nova usa os DIAS marcados. O status "conflito" é apenas aviso e não bloqueia uma igreja.
  const hasCult=(x,t)=>{const c=cfg(x);return !!t&&norm(c.culto_dias).includes(t);};
  const hourFor=(c,t)=>typeof window.horarioCultoParaDia==='function'?(window.horarioCultoParaDia(c,t)||null):((c?.culto_horarios&&c.culto_horarios[t])||c?.culto_horario||null);
  const itemSort=(a,b)=>{const pa=cfg(a).prioridade==='alta'?0:cfg(a).prioridade==='baixa'?2:1,pb=cfg(b).prioridade==='alta'?0:cfg(b).prioridade==='baixa'?2:1;return pa-pb||Number(cfg(b).culto_status==='confirmado')-Number(cfg(a).culto_status==='confirmado')||a.name.localeCompare(b.name,'pt-BR');};
  function pools(eligible){const g={};eligible.forEach(x=>(g[x.city]||(g[x.city]=[])).push(x));return Object.entries(g).map(([city,items])=>({city,items:items.sort(itemSort)})).sort((a,b)=>cityRank(a.city)-cityRank(b.city)||a.city.localeCompare(b.city,'pt-BR'));}
  function build(eligible){const ps=pools(eligible),groups=[];for(const p of ps){while(p.items.length>=4&&groups.length<3)groups.push({city:p.city,items:p.items.splice(0,4)});if(groups.length===3)break;}if(groups.length<3){const p=ps.find(x=>x.items.length>0);if(p)groups.push({city:p.city,items:p.items.splice(0,4)});}return groups;}
  async function gerar(){
    if(typeof isAdmin==='function'&&!isAdmin())return alert('Somente o administrador pode gerar as rotas.');
    const token=window.getOperationalDayToken?.(activeDay);if(!token)return alert('Escolha primeiro o dia da semana do Dia '+(activeDay+1)+'.');
    const label='Dia '+(activeDay+1)+' · '+DAY_LABEL[token];
    const {data:planned,error}=await sb.from('agenda').select('cidade,igreja,endereco,dia_indice,status').eq('status','programada').not('dia_indice','is',null);if(error)return alert(error.message);
    const elsewhere=new Set((planned||[]).filter(r=>Number(r.dia_indice)!==activeDay).map(r=>r.cidade+'|'+r.igreja+'|'+(r.endereco||'')));
    const eligible=allChurches().filter(x=>!state.visited[key(x)]&&hasCult(x,token)&&!elsewhere.has(x.city+'|'+x.name+'|'+(x.addr||'')));
    if(!eligible.length)return alert('Não há igrejas disponíveis com culto em '+DAY_LABEL[token]+'.');
    const groups=build(eligible);if(!groups.length)return alert('Não foi possível montar a rota.');
    const resumo=groups.map((g,i)=>CAR_NAMES[i]+': '+g.city+' ('+g.items.length+')').join(' • ');
    if(!confirm(label+'\n\n'+resumo+'\n\nCada carro ficará em uma única cidade. Gerar e sincronizar?'))return;
    const {error:del}=await sb.from('agenda').delete().eq('dia_indice',activeDay).eq('status','programada');if(del)return alert(del.message);
    for(let car=0;car<groups.length;car++)for(let j=0;j<groups[car].items.length;j++){const x=groups[car].items[j],c=cfg(x),pos=car*4+j;const {error:e}=await sb.from('agenda').insert({igreja:x.name,cidade:x.city,endereco:x.addr,data_visita:null,horario:hourFor(c,token),equipe:'Equipe '+String.fromCharCode(65+car),carro:CAR_NAMES[car],status:'programada',observacao:`${TAG} ${label} · ${CAR_NAMES[car]} exclusivo para ${groups[car].city}`,criado_por:authUser.id,atualizado_por:authUser.id,dia_indice:activeDay,posicao:pos});if(e)return alert('Erro ao salvar '+CAR_NAMES[car]+': '+e.message);}
    if(typeof window.carregarRotaOficial==='function')await window.carregarRotaOficial();else if(typeof window.loadRouteOverrides==='function')await window.loadRouteOverrides();
    await registrarAtividade('rota_prioridade_cidades_v6',null,null,label+' · '+resumo);
    alert('Rota gerada sem misturar cidades.\n'+resumo);
  }
  function bind(){window.gerarRotaInteligenteCultos=gerar;window.gerarRotaPorPrioridade=gerar;window.gerarRotaOperacionalV4=gerar;const b=document.getElementById('generateCultRouteBtn');if(b){b.onclick=gerar;b.title='Respeita a ordem das cidades e mantém uma cidade por carro';}}
  window.CITY_PRIORITY=CITY_PRIORITY.slice();window.gerarRotaPrioridadeV6=gerar;setTimeout(bind,500);setTimeout(bind,1500);setTimeout(bind,2800);
})();