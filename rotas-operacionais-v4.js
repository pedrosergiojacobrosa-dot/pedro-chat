// Roteirização operacional: Dia 1, Dia 2... + dia da semana, sem data fixa.
(function rotasOperacionaisV4(){
  const TAG='[AUTO-OPERACIONAL-V4]';
  const CAR_NAMES=['Carro A','Carro B','Carro C'];
  const ITU=[-23.264,-47.299];
  const DAY_LABEL={dom:'Domingo',seg:'Segunda-feira',ter:'Terça-feira',qua:'Quarta-feira',qui:'Quinta-feira',sex:'Sexta-feira',sab:'Sábado'};
  const keyChurch=x=>x.city+'|'+x.idx;
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const cfgFor=x=>typeof cfgDaIgreja==='function'?cfgDaIgreja(x.city,x.name,x.addr):{};
  const coordFor=x=>D.coords?.[x.city]||ITU;
  function dist(a,b){const dy=(a[0]-b[0])*111,dx=(a[1]-b[1])*111*Math.cos(((a[0]+b[0])/2)*Math.PI/180);return Math.hypot(dx,dy);}
  function hasCult(x,token){const cfg=cfgFor(x);if(cfg.culto_status==='conflito')return false;const days=norm(cfg.culto_dias);return !!days&&!!token&&days.includes(token);}
  function priorityRank(x){const p=cfgFor(x).prioridade||'normal';return p==='alta'?0:p==='baixa'?2:1;}
  function confirmedRank(x){return cfgFor(x).culto_status==='confirmado'?0:1;}
  function orderInsideCity(items){const pending=items.slice(),out=[];let here=ITU;while(pending.length){pending.sort((a,b)=>dist(coordFor(a),here)-dist(coordFor(b),here)||priorityRank(a)-priorityRank(b)||confirmedRank(a)-confirmedRank(b)||a.name.localeCompare(b.name,'pt-BR'));const next=pending.shift();out.push(next);here=coordFor(next);}return out;}
  function cityStats(eligible){const map={};eligible.forEach(x=>{const s=map[x.city]||(map[x.city]={city:x.city,items:[],high:0,confirmed:0,coord:coordFor(x)});s.items.push(x);if(priorityRank(x)===0)s.high++;if(confirmedRank(x)===0)s.confirmed++;});return Object.values(map).sort((a,b)=>b.items.length-a.items.length||b.high-a.high||b.confirmed-a.confirmed||dist(a.coord,ITU)-dist(b.coord,ITU)||a.city.localeCompare(b.city,'pt-BR'));}
  function buildCarGroups(eligible){const stats=cityStats(eligible),pools=Object.fromEntries(stats.map(s=>[s.city,orderInsideCity(s.items)])),groups=[];while(groups.length<3){const candidates=stats.filter(s=>(pools[s.city]?.length||0)>=4).sort((a,b)=>(pools[b.city]?.length||0)-(pools[a.city]?.length||0)||b.high-a.high||b.confirmed-a.confirmed||dist(a.coord,ITU)-dist(b.coord,ITU));if(!candidates.length)break;const chosen=candidates[0];groups.push({city:chosen.city,items:pools[chosen.city].splice(0,4)});}if(groups.length<3){const partial=stats.filter(s=>(pools[s.city]?.length||0)>0).sort((a,b)=>(pools[b.city]?.length||0)-(pools[a.city]?.length||0)||b.high-a.high||b.confirmed-a.confirmed||dist(a.coord,ITU)-dist(b.coord,ITU))[0];if(partial)groups.push({city:partial.city,items:pools[partial.city].splice(0,4)});}return groups.slice(0,3);}

  async function gerar(){
    if(typeof isAdmin==='function'&&!isAdmin())return alert('Somente o administrador pode gerar as rotas.');
    const token=window.getOperationalDayToken?.(activeDay);
    if(!token)return alert('Escolha primeiro o dia da semana do Dia '+(activeDay+1)+'.');
    const label='Dia '+(activeDay+1)+' · '+DAY_LABEL[token];
    const {data:planned,error:planErr}=await sb.from('agenda').select('cidade,igreja,endereco,dia_indice,status').eq('status','programada').not('dia_indice','is',null);
    if(planErr)return alert('Não foi possível consultar a agenda: '+planErr.message);
    const plannedElsewhere=new Set((planned||[]).filter(r=>Number(r.dia_indice)!==activeDay).map(r=>r.cidade+'|'+r.igreja+'|'+(r.endereco||'')));
    const eligible=allChurches().filter(x=>!state.visited[keyChurch(x)]&&hasCult(x,token)&&!plannedElsewhere.has(x.city+'|'+x.name+'|'+(x.addr||'')));
    if(!eligible.length)return alert('Não há igrejas disponíveis com culto cadastrado para '+DAY_LABEL[token]+'.');
    const groups=buildCarGroups(eligible);
    if(!groups.length)return alert('Não encontrei uma combinação de igrejas compatível.');
    const total=groups.reduce((n,g)=>n+g.items.length,0),resumo=groups.map((g,i)=>`${CAR_NAMES[i]}: ${g.city} (${g.items.length})`).join(' • ');
    if(!confirm(`${label}\n${total} igreja(s) disponíveis. Cada carro ficará em apenas uma cidade.\n\n${resumo}\n\nGerar e sincronizar esta rota?`))return;
    const {error:delErr}=await sb.from('agenda').delete().eq('dia_indice',activeDay).eq('status','programada');
    if(delErr)return alert('Não foi possível limpar a rota anterior: '+delErr.message);
    const ordered=[];let pos=0;
    for(let car=0;car<groups.length;car++)for(const church of groups[car].items){const cfg=cfgFor(church);const payload={igreja:church.name,cidade:church.city,endereco:church.addr,data_visita:null,horario:cfg.culto_horario||null,equipe:'Equipe '+String.fromCharCode(65+car),carro:CAR_NAMES[car],status:'programada',observacao:`${TAG} ${label} · ${CAR_NAMES[car]} exclusivo para ${groups[car].city}`,criado_por:authUser.id,atualizado_por:authUser.id,dia_indice:activeDay,posicao:pos};const {error}=await sb.from('agenda').insert(payload);if(error)return alert('Erro ao salvar a parada '+(pos+1)+': '+error.message);ordered.push(church);pos++;}
    D.routes[activeDay]=ordered;
    await registrarAtividade('rota_operacional_v4',null,null,label+' · '+resumo);
    if(typeof renderRoute==='function')renderRoute();if(typeof updateMapDay==='function'&&typeof map!=='undefined'&&map)updateMapDay();
    alert('Rota gerada.\n'+resumo);
  }

  async function ajustar(){
    if(typeof isAdmin==='function'&&!isAdmin())return alert('Somente o administrador pode ajustar a rota.');
    const token=window.getOperationalDayToken?.(activeDay);if(!token)return alert('Escolha primeiro o dia da semana deste roteiro.');
    const route=D.routes[activeDay]||[],bad=route.map((x,pos)=>({x,pos})).filter(r=>!hasCult(r.x,token));
    if(!bad.length)return alert('Todas as paradas têm culto cadastrado para '+DAY_LABEL[token]+'.');
    let changed=0;const used=new Set(D.routes.flat().filter(Boolean).map(keyChurch));
    for(const row of bad){const carStart=Math.floor(row.pos/4)*4,carItems=route.slice(carStart,carStart+4).filter(Boolean),carCity=carItems[0]?.city||row.x.city;if(carItems.some(x=>x.city!==carCity))continue;used.delete(keyChurch(row.x));const replacement=allChurches().filter(x=>x.city===carCity&&!used.has(keyChurch(x))&&!state.visited[keyChurch(x)]&&hasCult(x,token)).sort((a,b)=>priorityRank(a)-priorityRank(b)||confirmedRank(a)-confirmedRank(b)||a.name.localeCompare(b.name,'pt-BR'))[0];if(!replacement){used.add(keyChurch(row.x));continue;}const cfg=cfgFor(replacement);const {error}=await sb.from('agenda').upsert({igreja:replacement.name,cidade:replacement.city,endereco:replacement.addr,data_visita:null,horario:cfg.culto_horario||null,equipe:'Equipe '+String.fromCharCode(65+Math.floor(row.pos/4)),carro:CAR_NAMES[Math.floor(row.pos/4)],status:'programada',observacao:TAG+' Ajuste automático mantendo a mesma cidade',criado_por:authUser.id,atualizado_por:authUser.id,dia_indice:activeDay,posicao:row.pos},{onConflict:'dia_indice,posicao'});if(!error){route[row.pos]=replacement;used.add(keyChurch(replacement));changed++;}}
    if(typeof renderRoute==='function')renderRoute();if(typeof updateMapDay==='function'&&typeof map!=='undefined'&&map)updateMapDay();alert(changed?changed+' parada(s) ajustada(s) sem trocar a cidade do carro.':'Não havia substituto com culto na mesma cidade.');
  }

  function rebind(){window.gerarRotaInteligenteCultos=gerar;window.gerarRotaPorCidadeV3=gerar;window.autoAdjustRouteByServices=ajustar;const btn=document.getElementById('generateCultRouteBtn');if(btn){btn.onclick=gerar;btn.textContent='🧠 Gerar rota pelos cultos';btn.title='Usa o dia da semana escolhido e mantém cada carro em uma cidade';}}
  window.gerarRotaOperacionalV4=gerar;
  setTimeout(rebind,400);setTimeout(rebind,1200);setTimeout(rebind,2500);
})();
