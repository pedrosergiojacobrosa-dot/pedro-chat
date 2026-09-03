// Roteirização V3: cada carro atende somente uma cidade por dia.
(function rotasCidadeV3(){
  const TAG='[AUTO-CIDADE-V3]';
  const CAR_NAMES=['Carro A','Carro B','Carro C'];
  const ITU=[-23.264,-47.299];

  const keyChurch=x=>x.city+'|'+x.idx;
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const dayToken=date=>['dom','seg','ter','qua','qui','sex','sab'][date.getDay()];
  const cfgFor=x=>typeof cfgDaIgreja==='function'?cfgDaIgreja(x.city,x.name,x.addr):{};
  const coordFor=x=>D.coords?.[x.city]||ITU;

  function dist(a,b){
    const dy=(a[0]-b[0])*111;
    const dx=(a[1]-b[1])*111*Math.cos(((a[0]+b[0])/2)*Math.PI/180);
    return Math.hypot(dx,dy);
  }
  function hasCult(x,date){
    const cfg=cfgFor(x);
    if(cfg.culto_status==='conflito')return false;
    const days=norm(cfg.culto_dias);
    return !!days&&days.includes(dayToken(date));
  }
  function priorityRank(x){
    const p=cfgFor(x).prioridade||'normal';
    return p==='alta'?0:p==='baixa'?2:1;
  }
  function confirmedRank(x){return cfgFor(x).culto_status==='confirmado'?0:1;}

  function orderInsideCity(items){
    // Quando houver coordenadas individuais no futuro, esta ordem passa a aproveitar isso automaticamente.
    const pending=items.slice();
    const out=[];
    let here=ITU;
    while(pending.length){
      pending.sort((a,b)=>
        dist(coordFor(a),here)-dist(coordFor(b),here)||
        priorityRank(a)-priorityRank(b)||
        confirmedRank(a)-confirmedRank(b)||
        a.name.localeCompare(b.name,'pt-BR')
      );
      const next=pending.shift();
      out.push(next);
      here=coordFor(next);
    }
    return out;
  }

  function cityStats(eligible){
    const map={};
    eligible.forEach(x=>{
      const s=map[x.city]||(map[x.city]={city:x.city,items:[],high:0,confirmed:0,coord:coordFor(x)});
      s.items.push(x);
      if(priorityRank(x)===0)s.high++;
      if(confirmedRank(x)===0)s.confirmed++;
    });
    return Object.values(map).sort((a,b)=>
      b.items.length-a.items.length||
      b.high-a.high||
      b.confirmed-a.confirmed||
      dist(a.coord,ITU)-dist(b.coord,ITU)||
      a.city.localeCompare(b.city,'pt-BR')
    );
  }

  function buildCarGroups(eligible){
    const stats=cityStats(eligible);
    const pools=Object.fromEntries(stats.map(s=>[s.city,orderInsideCity(s.items)]));
    const groups=[];

    // Primeiro preenche carros completos. A mesma cidade pode ocupar mais de um carro.
    while(groups.length<3){
      const candidates=stats
        .filter(s=>(pools[s.city]?.length||0)>=4)
        .sort((a,b)=>
          (pools[b.city]?.length||0)-(pools[a.city]?.length||0)||
          b.high-a.high||b.confirmed-a.confirmed||
          dist(a.coord,ITU)-dist(b.coord,ITU)
        );
      if(!candidates.length)break;
      const chosen=candidates[0];
      groups.push({city:chosen.city,items:pools[chosen.city].splice(0,4)});
    }

    // Se ainda houver carro disponível, aceita UMA cidade parcial como último carro.
    // Assim nunca há uma cidade começando no meio de um carro e outra completando as vagas.
    if(groups.length<3){
      const partial=stats
        .filter(s=>(pools[s.city]?.length||0)>0)
        .sort((a,b)=>
          (pools[b.city]?.length||0)-(pools[a.city]?.length||0)||
          b.high-a.high||b.confirmed-a.confirmed||
          dist(a.coord,ITU)-dist(b.coord,ITU)
        )[0];
      if(partial)groups.push({city:partial.city,items:pools[partial.city].splice(0,4)});
    }
    return groups.slice(0,3);
  }

  function validateGroups(groups){
    return groups.every(g=>g.items.every(x=>x.city===g.city));
  }

  async function gerarRotaPorCidadeV3(){
    if(typeof isAdmin==='function'&&!isAdmin())return alert('Somente o administrador pode gerar as rotas.');
    const date=dateFor(activeDay);
    const label=date.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit'});

    const {data:planned,error:planErr}=await sb.from('agenda')
      .select('cidade,igreja,endereco,dia_indice,status')
      .eq('status','programada')
      .not('dia_indice','is',null);
    if(planErr)return alert('Não foi possível consultar a agenda: '+planErr.message);

    const plannedElsewhere=new Set((planned||[])
      .filter(r=>Number(r.dia_indice)!==activeDay)
      .map(r=>r.cidade+'|'+r.igreja+'|'+(r.endereco||'')));

    const eligible=allChurches().filter(x=>
      !state.visited[keyChurch(x)]&&
      hasCult(x,date)&&
      !plannedElsewhere.has(x.city+'|'+x.name+'|'+(x.addr||''))
    );
    if(!eligible.length)return alert('Não há igrejas disponíveis com culto cadastrado para '+label+'. Cadastre os dias de culto primeiro.');

    const groups=buildCarGroups(eligible);
    if(!groups.length)return alert('Não encontrei uma combinação de igrejas compatível para este dia.');
    if(!validateGroups(groups))return alert('A rota não passou na validação de cidade por carro. Nada foi alterado.');

    const total=groups.reduce((n,g)=>n+g.items.length,0);
    const resumo=groups.map((g,i)=>`${CAR_NAMES[i]}: ${g.city} (${g.items.length})`).join(' • ');
    if(!confirm(`${total} igreja(s) com culto em ${label}. Cada carro ficará em apenas uma cidade.\n\n${resumo}\n\nGerar e sincronizar esta rota?`))return;

    const {error:delErr}=await sb.from('agenda').delete().eq('dia_indice',activeDay).eq('status','programada');
    if(delErr)return alert('Não foi possível limpar a rota anterior: '+delErr.message);

    const ordered=[];
    let pos=0;
    for(let car=0;car<groups.length;car++){
      const g=groups[car];
      // Os grupos anteriores ao último sempre têm 4 itens. Isso preserva os blocos 0-3, 4-7 e 8-11.
      for(const church of g.items){
        const cfg=cfgFor(church);
        const payload={
          igreja:church.name,cidade:church.city,endereco:church.addr,
          data_visita:dk(date),horario:cfg.culto_horario||null,
          equipe:'Equipe '+String.fromCharCode(65+car),carro:CAR_NAMES[car],
          status:'programada',observacao:`${TAG} ${CAR_NAMES[car]} exclusivo para ${g.city}`,
          criado_por:authUser.id,atualizado_por:authUser.id,dia_indice:activeDay,posicao:pos
        };
        const {error}=await sb.from('agenda').insert(payload);
        if(error)return alert('Erro ao salvar a parada '+(pos+1)+': '+error.message);
        ordered.push(church);
        pos++;
      }
    }

    D.routes[activeDay]=ordered;
    await registrarAtividade('rota_cidade_v3',null,null,resumo+' · dia '+(activeDay+1));
    if(typeof renderRoute==='function')renderRoute();
    if(typeof renderCal==='function')renderCal();
    if(typeof updateMapDay==='function'&&typeof map!=='undefined'&&map)updateMapDay();
    alert('Rota gerada sem misturar cidades por carro.\n'+resumo);
  }

  // Ajuste automático de uma parada: só substitui por igreja da MESMA cidade do carro.
  async function autoAdjustSameCity(){
    if(typeof isAdmin==='function'&&!isAdmin())return alert('Somente o administrador pode ajustar a rota.');
    const date=dateFor(activeDay);
    const route=D.routes[activeDay]||[];
    const bad=route.map((x,pos)=>({x,pos})).filter(r=>!hasCult(r.x,date));
    if(!bad.length)return alert('Todas as paradas têm culto cadastrado neste dia.');

    let changed=0;
    const used=new Set(D.routes.flat().filter(Boolean).map(keyChurch));
    for(const row of bad){
      const carStart=Math.floor(row.pos/4)*4;
      const carItems=route.slice(carStart,carStart+4).filter(Boolean);
      const carCity=carItems[0]?.city||row.x.city;
      if(carItems.some(x=>x.city!==carCity))continue; // não tenta remendar rota já misturada
      used.delete(keyChurch(row.x));
      const replacement=allChurches()
        .filter(x=>x.city===carCity&&!used.has(keyChurch(x))&&!state.visited[keyChurch(x)]&&hasCult(x,date))
        .sort((a,b)=>priorityRank(a)-priorityRank(b)||confirmedRank(a)-confirmedRank(b)||a.name.localeCompare(b.name,'pt-BR'))[0];
      if(!replacement){used.add(keyChurch(row.x));continue;}
      if(typeof saveAssignment==='function'){
        await saveAssignment(activeDay,row.pos,replacement,'Ajuste automático mantendo a mesma cidade',true);
      }else{
        const cfg=cfgFor(replacement);
        await sb.from('agenda').upsert({
          igreja:replacement.name,cidade:replacement.city,endereco:replacement.addr,
          data_visita:dk(date),horario:cfg.culto_horario||null,
          equipe:'Equipe '+String.fromCharCode(65+Math.floor(row.pos/4)),carro:CAR_NAMES[Math.floor(row.pos/4)],
          status:'programada',observacao:TAG+' Ajuste automático na mesma cidade',
          criado_por:authUser.id,atualizado_por:authUser.id,dia_indice:activeDay,posicao:row.pos
        },{onConflict:'dia_indice,posicao'});
      }
      used.add(keyChurch(replacement));
      changed++;
    }
    if(typeof loadRouteOverrides==='function')await loadRouteOverrides();
    alert(changed?changed+' parada(s) ajustada(s) sem trocar a cidade do carro.':'Não havia substituto com culto na mesma cidade.');
  }

  function rebind(){
    window.gerarRotaInteligenteCultos=gerarRotaPorCidadeV3;
    window.autoAdjustRouteByServices=autoAdjustSameCity;
    const btn=document.getElementById('generateCultRouteBtn');
    if(btn){btn.onclick=gerarRotaPorCidadeV3;btn.title='Cada carro permanece em uma única cidade';}
    const tools=document.getElementById('routeTools');
    if(tools&&!document.getElementById('cityRuleBadge')){
      const badge=document.createElement('span');
      badge.id='cityRuleBadge';badge.className='small';badge.style.cssText='align-self:center;font-weight:800;color:#176b3a';
      badge.textContent='📍 Regra: cada carro fica em uma única cidade';
      tools.appendChild(badge);
    }
  }

  window.gerarRotaPorCidadeV3=gerarRotaPorCidadeV3;
  setTimeout(rebind,700);
  setTimeout(rebind,1800);
})();