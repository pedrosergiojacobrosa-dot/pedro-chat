// Rotas Flex V7 — pendências passam para o próximo dia e cidades podem ser fechadas com 1 a 5 pessoas por carro.
(function rotasFlexV7(){
  const TAG='[ROTAS-FLEX-V7]';
  const CAR_NAMES=['Carro A','Carro B','Carro C'];
  const DAY_LABEL={dom:'Domingo',seg:'Segunda-feira',ter:'Terça-feira',qua:'Quarta-feira',qui:'Quinta-feira',sex:'Sexta-feira',sab:'Sábado'};
  const CITY_PRIORITY=['Sorocaba','Porto Feliz','Cabreúva','Mairinque','São Roque','Araçariguama','Itupeva','Votorantim','Araçoiaba da Serra','Alumínio','Ibiúna','Santana de Parnaíba','Cajamar','Caieiras'];
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const cityRankMap=new Map(CITY_PRIORITY.map((c,i)=>[norm(c),i]));
  const sig=(city,name,addr)=>[city,name,addr||''].join('|');
  const sigChurch=x=>sig(x.city,x.name,x.addr);
  const cfg=x=>typeof cfgDaIgreja==='function'?cfgDaIgreja(x.city,x.name,x.addr):{};
  const cityRank=c=>cityRankMap.has(norm(c))?cityRankMap.get(norm(c)):1000;
  const dayAliases={dom:['dom','domingo'],seg:['seg','segunda'],ter:['ter','terca'],qua:['qua','quarta'],qui:['qui','quinta'],sex:['sex','sexta'],sab:['sab','sabado']};

  function hasCult(x,token){
    const days=norm(cfg(x).culto_dias);
    return !!token&&dayAliases[token].some(a=>days.includes(a));
  }
  function priorityRank(x){const p=cfg(x).prioridade||'normal';return p==='alta'?0:p==='baixa'?2:1;}
  function itemSort(a,b){
    return Number(!!b._carry)-Number(!!a._carry)||priorityRank(a)-priorityRank(b)||
      Number(cfg(b).culto_status==='confirmado')-Number(cfg(a).culto_status==='confirmado')||
      a.name.localeCompare(b.name,'pt-BR');
  }
  function balanced(total,k){
    if(total<=0||k<=0)return [];
    const base=Math.floor(total/k),rem=total%k;
    return Array.from({length:k},(_,i)=>base+(i<rem?1:0)).filter(Boolean);
  }
  function splitToClose(n,carsLeft,seatsLeft){
    if(n<=0||carsLeft<=0||seatsLeft<=0||n>seatsLeft||n>carsLeft*5)return null;
    const k=Math.max(1,Math.min(carsLeft,Math.ceil(n/5)));
    const sizes=balanced(n,k);
    return sizes.every(s=>s<=5)?sizes:null;
  }

  async function freshVisited(){
    const out=new Set();
    if(typeof sb==='undefined'||!authUser)return out;
    const {data,error}=await sb.from('visitas').select('cidade,igreja,endereco,status').eq('status','visitada');
    if(error)throw error;
    (data||[]).forEach(v=>out.add(sig(v.cidade,v.igreja,v.endereco)));
    return out;
  }

  async function contexto(dayIndex){
    const token=window.getOperationalDayToken?.(dayIndex)||null;
    const [visitedResult,agendaResult]=await Promise.all([
      freshVisited(),
      sb.from('agenda').select('id,igreja,cidade,endereco,carro,dia_indice,posicao,status,observacao').eq('status','programada').not('dia_indice','is',null)
    ]);
    const visited=visitedResult;
    if(agendaResult.error)throw agendaResult.error;
    const agenda=agendaResult.data||[];
    const prior=agenda.filter(r=>Number(r.dia_indice)<dayIndex);
    const future=agenda.filter(r=>Number(r.dia_indice)>dayIndex);
    const carrySet=new Set(prior.filter(r=>!visited.has(sig(r.cidade,r.igreja,r.endereco))).map(r=>sig(r.cidade,r.igreja,r.endereco)));
    const futureSet=new Set(future.map(r=>sig(r.cidade,r.igreja,r.endereco)));

    const all=typeof allChurches==='function'?allChurches():[];
    const remainingAllByCity={};
    all.forEach(x=>{if(!visited.has(sigChurch(x)))remainingAllByCity[x.city]=(remainingAllByCity[x.city]||0)+1;});

    const eligible=all.filter(x=>{
      const k=sigChurch(x);
      if(visited.has(k)||!hasCult(x,token))return false;
      if(carrySet.has(k))return true; // pendência antiga passa na frente, mesmo que já estivesse prevista mais à frente
      return !futureSet.has(k);
    }).map(x=>({...x,_carry:carrySet.has(sigChurch(x))}));

    const grouped={};
    eligible.forEach(x=>{const p=grouped[x.city]||(grouped[x.city]={city:x.city,items:[],carry:0});p.items.push(x);if(x._carry)p.carry++;});
    const pools=Object.values(grouped).map(p=>({...p,items:p.items.sort(itemSort),remainingAll:remainingAllByCity[p.city]||0})).sort((a,b)=>
      Number(b.carry>0)-Number(a.carry>0)||cityRank(a.city)-cityRank(b.city)||a.city.localeCompare(b.city,'pt-BR')
    );

    const unresolvedByCity={};
    prior.filter(r=>!visited.has(sig(r.cidade,r.igreja,r.endereco))).forEach(r=>{
      const k=sig(r.cidade,r.igreja,r.endereco);
      const c=unresolvedByCity[r.cidade]||(unresolvedByCity[r.cidade]={city:r.cidade,keys:new Set(),rows:[]});
      if(!c.keys.has(k)){c.keys.add(k);c.rows.push(r);}
    });
    const unresolved=Object.values(unresolvedByCity).map(x=>({city:x.city,count:x.keys.size,rows:x.rows,eligibleToday:(grouped[x.city]?.items||[]).filter(i=>i._carry).length,remainingAll:remainingAllByCity[x.city]||0})).sort((a,b)=>cityRank(a.city)-cityRank(b.city));

    return {dayIndex,token,agenda,visited,carrySet,futureSet,eligible,pools,unresolved,remainingAllByCity};
  }

  function buildGroups(ctx){
    const pools=ctx.pools.map(p=>({...p,items:p.items.slice()}));
    const groups=[];
    let seatsLeft=12,carsLeft=3;

    for(const pool of pools){
      if(carsLeft<=0||seatsLeft<=0)break;
      const n=pool.items.length;
      if(!n)continue;

      // Quando a quantidade cabe nos carros restantes, fecha o lote/cidade hoje.
      // Isso gera naturalmente 3+3 para 6, 5+5 para 10, 4+4+3 para 11 etc.
      const closeSizes=splitToClose(n,carsLeft,seatsLeft);
      if(closeSizes){
        for(const size of closeSizes){
          if(carsLeft<=0||seatsLeft<=0)break;
          const items=pool.items.splice(0,size);
          groups.push({city:pool.city,items,carry:items.filter(x=>x._carry).length,closure:true,remainingAll:pool.remainingAll});
          seatsLeft-=items.length;carsLeft--;
        }
        continue;
      }

      // Se a cidade ainda tem muitas igrejas, operação normal = 4 por carro.
      // Se já houve um carro especial (<4 ou >4), os carros restantes podem levar até 5 para compensar.
      const special=groups.some(g=>g.items.length!==4);
      const cap=special?5:4;
      const take=Math.min(pool.items.length,seatsLeft,carsLeft*cap);
      if(take<=0)continue;
      const k=Math.min(carsLeft,Math.max(1,Math.ceil(take/cap)));
      const sizes=balanced(take,k);
      for(const size of sizes){
        const items=pool.items.splice(0,size);
        groups.push({city:pool.city,items,carry:items.filter(x=>x._carry).length,closure:false,remainingAll:pool.remainingAll});
        seatsLeft-=items.length;carsLeft--;
      }
    }
    return groups.slice(0,3);
  }

  function resumoGroups(groups){
    return groups.map((g,i)=>{
      const extra=g.items.length===4?'':g.items.length<4?' · fechamento parcial':' · +1 pessoa';
      const pend=g.carry?` · ${g.carry} pendência(s)`:'';
      return `${CAR_NAMES[i]}: ${g.city} (${g.items.length})${extra}${pend}`;
    }).join(' • ');
  }

  async function gerar(){
    if(typeof isAdmin==='function'&&!isAdmin())return alert('Somente o administrador pode gerar as rotas.');
    const token=window.getOperationalDayToken?.(activeDay);
    if(!token)return alert('Escolha primeiro o dia da semana do Dia '+(activeDay+1)+'.');
    let ctx;
    try{ctx=await contexto(activeDay);}catch(e){return alert('Não foi possível calcular a rota: '+(e?.message||e));}
    if(!ctx.eligible.length)return alert('Não há igrejas disponíveis com culto em '+(DAY_LABEL[token]||token)+'. Veja a aba Avisos para conferir pendências sem culto neste dia.');
    const groups=buildGroups(ctx);
    if(!groups.length)return alert('Não foi possível montar a rota deste dia.');
    const total=groups.reduce((n,g)=>n+g.items.length,0);
    const resumo=resumoGroups(groups);
    const carries=groups.reduce((n,g)=>n+g.carry,0);
    const label='Dia '+(activeDay+1)+' · '+(DAY_LABEL[token]||token);
    const aviso=carries?`\n\n⚠ ${carries} igreja(s) pendente(s) de dias anteriores foram colocadas primeiro.`:'';
    if(!confirm(`${label}\n\n${resumo}\n\nTotal: ${total} pessoas.${aviso}\n\nCada carro permanece em uma única cidade. Gerar e sincronizar?`))return;

    const selectedSigs=new Set(groups.flatMap(g=>g.items.map(sigChurch)));
    const futureIds=ctx.agenda.filter(r=>Number(r.dia_indice)>activeDay&&selectedSigs.has(sig(r.cidade,r.igreja,r.endereco))).map(r=>r.id);
    try{
      if(futureIds.length){const {error}=await sb.from('agenda').delete().in('id',futureIds);if(error)throw error;}
      const {error:del}=await sb.from('agenda').delete().eq('dia_indice',activeDay).eq('status','programada');if(del)throw del;
      const payloads=[];let pos=0;
      groups.forEach((g,car)=>g.items.forEach((x,local)=>{
        const c=cfg(x);
        const h=typeof window.horarioCultoParaDia==='function'?window.horarioCultoParaDia(c,token):(c.culto_horario||'');
        payloads.push({
          igreja:x.name,cidade:x.city,endereco:x.addr,data_visita:null,horario:h||null,
          equipe:'Equipe '+String.fromCharCode(65+car),carro:CAR_NAMES[car],status:'programada',
          observacao:`${TAG} ${label} · ${g.closure?'fechamento':'continuidade'} · ${x._carry?'PENDÊNCIA ANTERIOR · ':''}${CAR_NAMES[car]} exclusivo para ${g.city}`,
          criado_por:authUser.id,atualizado_por:authUser.id,dia_indice:activeDay,posicao:pos++
        });
      }));
      const {error:ins}=await sb.from('agenda').insert(payloads);if(ins)throw ins;
      if(typeof registrarAtividade==='function')await registrarAtividade('rota_flex_v7',null,null,label+' · '+resumo);
      if(typeof window.carregarRotaOficial==='function')await window.carregarRotaOficial();
      if(typeof window.carregarRotaFlex==='function')await window.carregarRotaFlex();
      if(typeof window.renderAvisosOperacionais==='function')await window.renderAvisosOperacionais();
      if(typeof window.updateMapDay==='function'&&typeof map!=='undefined'&&map)window.updateMapDay();
      alert('Rota gerada.\n'+resumo);
    }catch(e){alert('Não foi possível salvar a rota: '+(e?.message||e));}
  }

  function bind(){
    window.gerarRotaInteligenteCultos=gerar;
    window.gerarRotaPorPrioridade=gerar;
    window.gerarRotaPrioridadeV6=gerar;
    window.autoAdjustRouteByServices=gerar;
    const b=document.getElementById('generateCultRouteBtn');
    if(b){b.onclick=gerar;b.textContent='🧠 Gerar rota com pendências';b.title='Pendências primeiro; fecha cidades com 1 a 5 pessoas por carro quando necessário';}
  }

  window.calcularContextoRotasFlexV7=contexto;
  window.montarGruposRotasFlexV7=buildGroups;
  window.gerarRotaFlexV7=gerar;
  bind();setTimeout(bind,900);setTimeout(bind,3000);setTimeout(bind,5200);
})();
