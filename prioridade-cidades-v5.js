// Prioridade operacional V5: respeita a ordem definida para as cidades e nunca mistura cidades no mesmo carro.
(function prioridadeCidadesV5(){
  const TAG='[AUTO-PRIORIDADE-CIDADES-V5]';
  const CAR_NAMES=['Carro A','Carro B','Carro C'];
  const ITU=[-23.264,-47.299];
  const DAY_LABEL={dom:'Domingo',seg:'Segunda-feira',ter:'Terça-feira',qua:'Quarta-feira',qui:'Quinta-feira',sex:'Sexta-feira',sab:'Sábado'};
  const CITY_PRIORITY=[
    'Sorocaba','Porto Feliz','Cabreúva','Mairinque','São Roque','Araçariguama','Itupeva',
    'Votorantim','Araçoiaba da Serra','Alumínio','Ibiúna','Santana de Parnaíba','Cajamar','Caieiras'
  ];
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const priorityMap=new Map(CITY_PRIORITY.map((c,i)=>[norm(c),i]));
  const keyChurch=x=>x.city+'|'+x.idx;
  const cfgFor=x=>typeof cfgDaIgreja==='function'?cfgDaIgreja(x.city,x.name,x.addr):{};
  const coordFor=x=>D.coords?.[x.city]||ITU;
  function dist(a,b){const dy=(a[0]-b[0])*111,dx=(a[1]-b[1])*111*Math.cos(((a[0]+b[0])/2)*Math.PI/180);return Math.hypot(dx,dy);}
  function cityRank(city){const r=priorityMap.get(norm(city));return r==null?1000:r;}
  function hasCult(x,token){const cfg=cfgFor(x);if(cfg.culto_status==='conflito')return false;const days=norm(cfg.culto_dias);return !!token&&!!days&&days.includes(token);}
  function priorityRank(x){const p=cfgFor(x).prioridade||'normal';return p==='alta'?0:p==='baixa'?2:1;}
  function confirmedRank(x){return cfgFor(x).culto_status==='confirmado'?0:1;}
  function orderInsideCity(items){return items.slice().sort((a,b)=>priorityRank(a)-priorityRank(b)||confirmedRank(a)-confirmedRank(b)||a.name.localeCompare(b.name,'pt-BR'));}
  function orderedCityPools(eligible){
    const grouped={};eligible.forEach(x=>(grouped[x.city]||(grouped[x.city]=[])).push(x));
    return Object.entries(grouped).map(([city,items])=>({city,items:orderInsideCity(items)})).sort((a,b)=>{
      const ra=cityRank(a.city),rb=cityRank(b.city);if(ra!==rb)return ra-rb;
      return dist(coordFor(a.items[0]),ITU)-dist(coordFor(b.items[0]),ITU)||a.city.localeCompare(b.city,'pt-BR');
    });
  }
  function buildGroups(eligible){
    const pools=orderedCityPools(eligible),groups=[];
    // Primeiro ocupamos carros completos, sempre respeitando a ordem das cidades.
    for(const pool of pools){
      while(pool.items.length>=4&&groups.length<3)groups.push({city:pool.city,items:pool.items.splice(0,4)});
      if(groups.length>=3)break;
    }
    // Se ainda houver carro, usamos apenas UM grupo parcial, da cidade mais prioritária restante.
    // Assim os blocos Carro A/B/C continuam íntegros no restante do site.
    if(groups.length<3){
      const partial=pools.find(p=>p.items.length>0);
      if(partial)groups.push({city:partial.city,items:partial.items.splice(0,4)});
    }
    return groups;
  }
  function nextPrioritySummary(eligible){
    const pools=orderedCityPools(eligible);
    return pools.slice(0,6).map(p=>p.city+' ('+p.items.length+')').join(' → ');
  }

  async function gerarPorPrioridade(){
    if(typeof isAdmin==='function'&&!isAdmin())return alert('Somente o administrador pode gerar as rotas.');
    const token=window.getOperationalDayToken?.(activeDay);
    if(!token)return alert('Escolha primeiro o dia da semana do Dia '+(activeDay+1)+'.');
    const label='Dia '+(activeDay+1)+' · '+DAY_LABEL[token];
    const {data:planned,error:planErr}=await sb.from('agenda').select('cidade,igreja,endereco,dia_indice,status').eq('status','programada').not('dia_indice','is',null);
    if(planErr)return alert('Não foi possível consultar a agenda: '+planErr.message);
    const plannedElsewhere=new Set((planned||[]).filter(r=>Number(r.dia_indice)!==activeDay).map(r=>r.cidade+'|'+r.igreja+'|'+(r.endereco||'')));
    const eligible=allChurches().filter(x=>!state.visited[keyChurch(x)]&&hasCult(x,token)&&!plannedElsewhere.has(x.city+'|'+x.name+'|'+(x.addr||'')));
    if(!eligible.length)return alert('Não há igrejas disponíveis com culto cadastrado para '+DAY_LABEL[token]+'.');
    const groups=buildGroups(eligible);
    if(!groups.length)return alert('Não encontrei igrejas compatíveis para montar a rota.');
    const total=groups.reduce((n,g)=>n+g.items.length,0);
    const resumo=groups.map((g,i)=>`${CAR_NAMES[i]}: ${g.city} (${g.items.length})`).join(' • ');
    const fila=nextPrioritySummary(eligible);
    if(!confirm(`${label}\n\nFila de cidades: ${fila}\n\n${resumo}\n\nCada carro ficará em uma única cidade. Gerar e sincronizar esta rota?`))return;
    const {error:delErr}=await sb.from('agenda').delete().eq('dia_indice',activeDay).eq('status','programada');
    if(delErr)return alert('Não foi possível limpar a rota anterior: '+delErr.message);
    const ordered=[];let pos=0;
    for(let car=0;car<groups.length;car++){
      const group=groups[car];
      for(const church of group.items){
        const cfg=cfgFor(church);
        const payload={igreja:church.name,cidade:church.city,endereco:church.addr,data_visita:null,horario:cfg.culto_horario||null,equipe:'Equipe '+String.fromCharCode(65+car),carro:CAR_NAMES[car],status:'programada',observacao:`${TAG} ${label} · prioridade ${cityRank(group.city)+1} · ${CAR_NAMES[car]} exclusivo para ${group.city}`,criado_por:authUser.id,atualizado_por:authUser.id,dia_indice:activeDay,posicao:pos};
        const {error}=await sb.from('agenda').insert(payload);if(error)return alert('Erro ao salvar '+CAR_NAMES[car]+': '+error.message);
        ordered.push(church);pos++;
      }
    }
    D.routes[activeDay]=ordered;
    await registrarAtividade('rota_prioridade_cidades_v5',null,null,label+' · '+resumo);
    if(typeof renderRoute==='function')renderRoute();
    if(typeof updateMapDay==='function'&&typeof map!=='undefined'&&map)updateMapDay();
    alert('Rota gerada seguindo a ordem das cidades.\n'+resumo);
  }

  function decorate(){
    window.gerarRotaInteligenteCultos=gerarPorPrioridade;
    window.gerarRotaPorCidadeV3=gerarPorPrioridade;
    window.gerarRotaOperacionalV4=gerarPorPrioridade;
    const btn=document.getElementById('generateCultRouteBtn');
    if(btn){btn.onclick=gerarPorPrioridade;btn.title='Segue a fila de cidades e nunca mistura cidades no mesmo carro';}
    const tools=document.getElementById('routeTools');
    if(tools&&!document.getElementById('cityPriorityQueue')){
      const box=document.createElement('div');box.id='cityPriorityQueue';box.className='small';box.style.cssText='width:100%;margin-top:6px;padding:9px 10px;background:#edf5ef;border-radius:10px';
      box.innerHTML='<b>📍 Ordem das cidades:</b> '+CITY_PRIORITY.map((c,i)=>(i+1)+'. '+c).join(' → ')+' → demais cidades';
      tools.appendChild(box);
    }
  }
  window.CITY_PRIORITY=CITY_PRIORITY.slice();
  window.gerarRotaPorPrioridade=gerarPorPrioridade;
  setTimeout(decorate,500);setTimeout(decorate,1400);setTimeout(decorate,2800);
})();
