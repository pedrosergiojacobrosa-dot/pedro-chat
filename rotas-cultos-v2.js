(function rotasCultosV2(){
  const AUTO_TAG='[AUTO-CULTOS-V2]';
  const DAY_DEFS=[
    ['dom','Domingo'],['seg','Segunda'],['ter','Terça'],['qua','Quarta'],['qui','Quinta'],['sex','Sexta'],['sab','Sábado']
  ];
  const CAR_COLORS=['#176b3a','#2563eb','#d97706'];
  const ITU_COORD=[-23.264,-47.299];
  let v2Channel=null;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const keyChurch=x=>x.city+'|'+x.idx;
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const dayToken=date=>DAY_DEFS[date.getDay()][0];

  function cfgFor(x){return typeof cfgDaIgreja==='function'?cfgDaIgreja(x.city,x.name,x.addr):{};}
  function churchHasCultOn(x,date){
    const cfg=cfgFor(x);
    if(cfg.culto_status==='conflito')return false;
    const days=norm(cfg.culto_dias);
    if(!days)return false;
    return days.includes(dayToken(date));
  }
  function coordFor(x){return D.coords?.[x.city]||ITU_COORD;}
  function dist(a,b){
    const dy=(a[0]-b[0])*111;
    const dx=(a[1]-b[1])*111*Math.cos(((a[0]+b[0])/2)*Math.PI/180);
    return Math.hypot(dx,dy);
  }
  function priorityRank(x){
    const p=cfgFor(x).prioridade||'normal';
    return p==='alta'?0:p==='baixa'?2:1;
  }
  function confirmedRank(x){return cfgFor(x).culto_status==='confirmado'?0:1;}
  function findChurch(city,name,address){
    const list=D.cities?.[city]||[];
    let idx=list.findIndex(x=>x.name===name&&x.addr===address);
    if(idx<0)idx=list.findIndex(x=>x.name===name);
    if(idx<0)return null;
    return {city,idx,...list[idx]};
  }

  function ensureDayPicker(){
    const modal=document.getElementById('cultEditModal');
    const old=document.getElementById('ceDias');
    if(!modal||!old||document.getElementById('ceDiasPicker'))return;
    old.type='hidden';
    const picker=document.createElement('div');
    picker.id='ceDiasPicker';
    picker.style.cssText='display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:7px 0 12px';
    picker.innerHTML=DAY_DEFS.map(([token,label])=>`<label style="border:1px solid var(--line);border-radius:10px;padding:9px;display:flex;align-items:center;gap:7px;cursor:pointer;background:#fff"><input type="checkbox" class="ceDayCheck" value="${token}" data-label="${label}"> <b>${label}</b></label>`).join('');
    old.parentNode.insertBefore(picker,old.nextSibling);
    picker.addEventListener('change',syncDaysInput);
    const style=document.createElement('style');
    style.textContent='@media(max-width:620px){#ceDiasPicker{grid-template-columns:repeat(2,minmax(0,1fr))!important}}';
    document.head.appendChild(style);
  }
  function syncDaysInput(){
    const old=document.getElementById('ceDias');
    if(!old)return;
    old.value=[...document.querySelectorAll('.ceDayCheck:checked')].map(x=>x.dataset.label).join(', ');
  }
  function loadDayChecks(){
    ensureDayPicker();
    const days=norm(document.getElementById('ceDias')?.value||'');
    document.querySelectorAll('.ceDayCheck').forEach(ch=>{ch.checked=days.includes(ch.value);});
  }

  function patchCultEditor(){
    if(typeof window.abrirEditorCulto==='function'&&!window.abrirEditorCulto.__v2){
      const prev=window.abrirEditorCulto;
      const wrapped=function(...args){const r=prev(...args);setTimeout(loadDayChecks,0);return r;};
      wrapped.__v2=true;
      window.abrirEditorCulto=wrapped;
    }
    if(typeof window.salvarEditorCulto==='function'&&!window.salvarEditorCulto.__v2){
      const prev=window.salvarEditorCulto;
      const wrapped=async function(...args){syncDaysInput();return prev(...args);};
      wrapped.__v2=true;
      window.salvarEditorCulto=wrapped;
    }
    ensureDayPicker();
  }

  function chooseAnchor(eligible){
    const stats={};
    eligible.forEach(x=>{
      const s=stats[x.city]||(stats[x.city]={city:x.city,count:0,high:0,confirmed:0,coord:coordFor(x)});
      s.count++;
      if(priorityRank(x)===0)s.high++;
      if(confirmedRank(x)===0)s.confirmed++;
    });
    return Object.values(stats).sort((a,b)=>
      (b.count*10+b.high*3+b.confirmed*2)-(a.count*10+a.high*3+a.confirmed*2)||dist(a.coord,ITU_COORD)-dist(b.coord,ITU_COORD)
    )[0];
  }

  function selectNearby(eligible,max=12){
    if(!eligible.length)return [];
    const anchor=chooseAnchor(eligible);
    const center=anchor?.coord||ITU_COORD;
    return eligible.slice().sort((a,b)=>
      priorityRank(a)-priorityRank(b)||
      confirmedRank(a)-confirmedRank(b)||
      dist(coordFor(a),center)-dist(coordFor(b),center)||
      dist(coordFor(a),ITU_COORD)-dist(coordFor(b),ITU_COORD)||
      a.city.localeCompare(b.city,'pt-BR')
    ).slice(0,max);
  }

  function clusterCars(selected){
    const capacity=[4,4,4];
    const groups=[[],[],[]];
    if(!selected.length)return groups;
    const remaining=selected.slice();
    const seeds=[];
    seeds.push(remaining.shift());
    while(seeds.length<3&&remaining.length){
      let bestIndex=0,bestScore=-1;
      remaining.forEach((x,i)=>{
        const score=Math.min(...seeds.map(s=>dist(coordFor(x),coordFor(s))));
        if(score>bestScore){bestScore=score;bestIndex=i;}
      });
      seeds.push(remaining.splice(bestIndex,1)[0]);
    }
    seeds.forEach((s,i)=>groups[i].push(s));
    remaining.forEach(x=>{
      const options=groups.map((g,i)=>({i,space:capacity[i]-g.length,d:Math.min(...g.map(y=>dist(coordFor(x),coordFor(y))))})).filter(o=>o.space>0).sort((a,b)=>a.d-b.d||b.space-a.space);
      groups[options[0]?.i??0].push(x);
    });
    return groups.map(g=>{
      const out=[];let here=ITU_COORD;const rest=g.slice();
      while(rest.length){
        rest.sort((a,b)=>dist(coordFor(a),here)-dist(coordFor(b),here)||priorityRank(a)-priorityRank(b));
        const next=rest.shift();out.push(next);here=coordFor(next);
      }
      return out;
    });
  }

  async function syncAutoRoutesV2(){
    if(typeof sb==='undefined'||!authUser)return;
    const {data,error}=await sb.from('agenda').select('igreja,cidade,endereco,dia_indice,posicao,observacao,status').eq('status','programada').not('dia_indice','is',null).not('posicao','is',null);
    if(error){console.warn('rota v2',error.message);return;}
    const byDay={};
    (data||[]).forEach(r=>{(byDay[r.dia_indice]||(byDay[r.dia_indice]=[])).push(r);});
    Object.entries(byDay).forEach(([day,rows])=>{
      if(!rows.some(r=>String(r.observacao||'').includes(AUTO_TAG)))return;
      const built=rows.sort((a,b)=>a.posicao-b.posicao).map(r=>findChurch(r.cidade,r.igreja,r.endereco)).filter(Boolean);
      if(D.routes[+day])D.routes[+day]=built;
    });
    if(typeof renderRoute==='function')renderRoute();
    if(typeof renderCal==='function')renderCal();
    if(typeof updateMapDay==='function'&&typeof map!=='undefined'&&map)updateMapDay();
  }

  async function gerarRotaInteligenteCultos(){
    if(typeof isAdmin==='function'&&!isAdmin())return alert('Somente o administrador pode gerar as rotas.');
    const date=dateFor(activeDay);
    const label=date.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit'});
    const {data:planned,error:planErr}=await sb.from('agenda').select('cidade,igreja,endereco,dia_indice,status').eq('status','programada').not('dia_indice','is',null);
    if(planErr)return alert('Não foi possível consultar a agenda: '+planErr.message);
    const plannedElsewhere=new Set((planned||[]).filter(r=>Number(r.dia_indice)!==activeDay).map(r=>r.cidade+'|'+r.igreja+'|'+(r.endereco||'')));
    const eligible=allChurches().filter(x=>
      !state.visited[keyChurch(x)]&&
      churchHasCultOn(x,date)&&
      !plannedElsewhere.has(x.city+'|'+x.name+'|'+(x.addr||''))
    );
    if(!eligible.length)return alert('Não há igrejas disponíveis com culto cadastrado para '+label+'. Cadastre os dias de culto primeiro.');
    const selected=selectNearby(eligible,12);
    const groups=clusterCars(selected);
    const ordered=[...groups[0],...groups[1],...groups[2]];
    const msg=`${ordered.length} igreja(s) com culto em ${label} foram encontradas e agrupadas por proximidade em até 3 carros. Gerar e sincronizar esta rota?`;
    if(!confirm(msg))return;
    const {error:delErr}=await sb.from('agenda').delete().eq('dia_indice',activeDay).eq('status','programada');
    if(delErr)return alert('Não foi possível limpar a rota anterior: '+delErr.message);
    for(let pos=0;pos<ordered.length;pos++){
      const church=ordered[pos],cfg=cfgFor(church);
      const payload={
        igreja:church.name,cidade:church.city,endereco:church.addr,
        data_visita:dk(date),horario:cfg.culto_horario||null,
        equipe:'Equipe '+(pos<4?'A':pos<8?'B':'C'),carro:pos<4?'Carro A':pos<8?'Carro B':'Carro C',
        status:'programada',observacao:AUTO_TAG+' Gerada por dias de culto e proximidade geográfica',
        criado_por:authUser.id,atualizado_por:authUser.id,dia_indice:activeDay,posicao:pos
      };
      const {error}=await sb.from('agenda').insert(payload);
      if(error)return alert('Erro ao salvar a parada '+(pos+1)+': '+error.message);
    }
    D.routes[activeDay]=ordered;
    await registrarAtividade('rota_cultos_v2',null,null,ordered.length+' paradas geradas no dia '+(activeDay+1));
    if(typeof renderRoute==='function')renderRoute();
    if(typeof renderCal==='function')renderCal();
    if(typeof updateMapDay==='function'&&typeof map!=='undefined'&&map)updateMapDay();
    alert('Rota gerada e sincronizada: '+groups.map((g,i)=>'Carro '+String.fromCharCode(65+i)+': '+g.length).join(' • '));
  }

  function openCarPickupRoute(carIndex){
    const items=(D.routes[activeDay]||[]).slice(carIndex*4,carIndex*4+4);
    if(!items.length)return alert('Este carro ainda não tem paradas.');
    const reverse=items.slice().reverse();
    const origin=reverse[0].addr;
    const waypoints=reverse.slice(1).map(x=>encodeURIComponent(x.addr)).join('|');
    const url='https://www.google.com/maps/dir/?api=1&origin='+encodeURIComponent(origin)+
      '&destination='+encodeURIComponent('Itu, SP')+(waypoints?'&waypoints='+waypoints:'');
    window.open(url,'_blank');
  }

  function decorateRouteV2(){
    const tools=document.getElementById('routeTools');
    if(tools&&!document.getElementById('generateCultRouteBtn')){
      const b=document.createElement('button');b.id='generateCultRouteBtn';b.className='btn';b.innerHTML='🧠 Gerar rota pelos cultos';b.onclick=gerarRotaInteligenteCultos;tools.insertBefore(b,tools.firstChild);
    }
    const cards=[...document.querySelectorAll('#routeCards .cargrid > .card')];
    cards.forEach((card,i)=>{
      card.style.borderTop='5px solid '+CAR_COLORS[i];
      const header=card.querySelector('.car-title');
      if(header&&!header.querySelector('.pickup-route')){
        const b=document.createElement('button');b.className='btn secondary pickup-route';b.style.padding='6px 9px';b.textContent='↩ Buscar equipe';b.onclick=()=>openCarPickupRoute(i);header.appendChild(b);
      }
    });
  }

  function patchRenderRoute(){
    if(typeof window.renderRoute!=='function'||window.renderRoute.__cultV2)return;
    const prev=window.renderRoute;
    const wrapped=function(){const r=prev();decorateRouteV2();return r;};
    wrapped.__cultV2=true;window.renderRoute=wrapped;
  }

  function patchMap(){
    window.updateMapDay=function(){
      if(!map)return;
      markers.forEach(m=>map.removeLayer(m));markers=[];
      let items=D.routes[activeDay]||[];
      const legend='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">'+CAR_COLORS.map((c,i)=>`<span class="small" style="border-left:8px solid ${c};padding-left:6px"><b>Carro ${String.fromCharCode(65+i)}</b></span>`).join('')+'</div>';
      document.getElementById('mapStops').innerHTML=legend+items.map((x,i)=>`<div class="pill" style="border-left:6px solid ${CAR_COLORS[Math.floor(i/4)]}">${i+1}. ${x.city} — ${esc(x.name)} ${state.visited[x.city+'|'+x.idx]?'🟢':''}</div>`).join('');
      const byCar=[[],[],[]];
      items.forEach((x,i)=>{
        let c=D.coords[x.city];if(!c)return;
        const car=Math.min(2,Math.floor(i/4));
        let m=L.circleMarker(c,{radius:9,fillColor:CAR_COLORS[car],color:CAR_COLORS[car],weight:3,fillOpacity:.82}).addTo(map)
          .bindPopup(`<b>Carro ${String.fromCharCode(65+car)} · ${i%4+1}ª parada</b><br><b>${esc(x.name)}</b><br>${esc(x.addr)}<br>${state.visited[x.city+'|'+x.idx]?'✓ visitada':'pendente'}`);
        markers.push(m);byCar[car].push(c);
      });
      byCar.forEach((pts,i)=>{if(pts.length>1){const line=L.polyline([ITU_COORD,...pts],{color:CAR_COLORS[i],weight:3,opacity:.6}).addTo(map);markers.push(line);}});
      if(items.length){const coords=items.map(x=>D.coords[x.city]).filter(Boolean);if(coords.length)map.fitBounds(L.latLngBounds(coords).pad(.2));}
    };
  }

  function subscribe(){
    if(v2Channel||typeof sb==='undefined')return;
    v2Channel=sb.channel('agenda-auto-cultos-v2').on('postgres_changes',{event:'*',schema:'public',table:'agenda'},()=>setTimeout(syncAutoRoutesV2,300)).subscribe();
  }

  window.gerarRotaInteligenteCultos=gerarRotaInteligenteCultos;
  window.openCarPickupRoute=openCarPickupRoute;
  window.syncAutoRoutesV2=syncAutoRoutesV2;

  const boot=()=>{patchCultEditor();patchRenderRoute();patchMap();decorateRouteV2();subscribe();if(typeof authUser!=='undefined'&&authUser)setTimeout(syncAutoRoutesV2,400);};
  setTimeout(boot,250);
  setTimeout(boot,1000);
  setTimeout(boot,2200);
})();
