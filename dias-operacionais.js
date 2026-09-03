(function diasOperacionais(){
  const DAYS=[['dom','Domingo'],['seg','Segunda-feira'],['ter','Terça-feira'],['qua','Quarta-feira'],['qui','Quinta-feira'],['sex','Sexta-feira'],['sab','Sábado']];
  const labels=Object.fromEntries(DAYS);
  let config={};
  let channel=null;

  window.getOperationalDayToken=i=>config[Number(i)]||null;
  window.getOperationalDayLabel=i=>labels[window.getOperationalDayToken(i)]||'';

  // Compatibilidade com módulos antigos: usa apenas o dia da semana, nunca uma data real.
  window.dateFor=function(i){
    const token=window.getOperationalDayToken(i);
    if(!token)return new Date(NaN);
    const idx=DAYS.findIndex(x=>x[0]===token);
    return new Date(2000,0,2+idx,12,0,0);
  };
  window.dk=function(){return null;};
  window.pt=function(){
    const label=window.getOperationalDayLabel(typeof activeDay!=='undefined'?activeDay:0);
    return 'Dia '+((typeof activeDay!=='undefined'?activeDay:0)+1)+(label?' · '+label:'');
  };

  function hideCalendar(){
    document.querySelectorAll('nav button').forEach(b=>{if(/calend[aá]rio/i.test(b.textContent||''))b.remove();});
    const cal=document.getElementById('cal');if(cal)cal.style.display='none';
    const verify=document.getElementById('verifyDay');
    if(verify){const card=verify.closest('.card');if(card)card.style.display='none';}
  }

  function rewriteSelectors(){
    const mapDay=document.getElementById('mapDay');
    if(mapDay){
      const selected=typeof activeDay!=='undefined'?activeDay:0;
      mapDay.innerHTML=Array.from({length:28},(_,i)=>`<option value="${i}">Dia ${i+1}${window.getOperationalDayLabel(i)?' · '+window.getOperationalDayLabel(i):''}</option>`).join('');
      mapDay.value=String(selected);
    }
    const buttons=[...document.querySelectorAll('#dayButtons button')];
    buttons.forEach((b,i)=>{b.textContent='Dia '+(i+1)+(window.getOperationalDayLabel(i)?' · '+window.getOperationalDayLabel(i):'');});
  }

  function ensureWeekdayPicker(){
    const title=document.getElementById('dayTitle');
    if(!title||document.getElementById('operationalWeekdayWrap'))return;
    const wrap=document.createElement('div');
    wrap.id='operationalWeekdayWrap';
    wrap.style.cssText='margin-top:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap';
    wrap.innerHTML='<b>Dia da semana:</b><select id="operationalWeekday"><option value="">Escolha...</option>'+DAYS.map(([v,l])=>`<option value="${v}">${l}</option>`).join('')+'</select><span class="small muted">Sem data fixa. Isso define quais igrejas têm culto para montar a rota.</span>';
    title.parentElement.appendChild(wrap);
    document.getElementById('operationalWeekday').addEventListener('change',saveCurrentDay);
  }

  function syncPicker(){
    ensureWeekdayPicker();
    const sel=document.getElementById('operationalWeekday');
    if(sel)sel.value=window.getOperationalDayToken(typeof activeDay!=='undefined'?activeDay:0)||'';
    if(!window.getOperationalDayToken(typeof activeDay!=='undefined'?activeDay:0)){
      document.querySelectorAll('.route-compat').forEach(el=>{el.classList.remove('ok','bad');el.classList.add('unknown');el.textContent='? Escolha o dia da semana deste roteiro';});
    }
  }

  async function saveCurrentDay(){
    const sel=document.getElementById('operationalWeekday');
    if(!sel)return;
    if(typeof isAdmin==='function'&&!isAdmin()){
      sel.value=window.getOperationalDayToken(activeDay)||'';
      return alert('Somente o administrador pode definir o dia da semana.');
    }
    const token=sel.value;
    if(!token)return;
    const payload={dia_indice:activeDay,dia_semana:token,atualizado_por:authUser?.id||null,atualizado_em:new Date().toISOString()};
    const {error}=await sb.from('rota_dias').upsert(payload,{onConflict:'dia_indice'});
    if(error)return alert('Não foi possível salvar o dia da semana: '+error.message);
    config[activeDay]=token;
    if(typeof registrarAtividade==='function')registrarAtividade('dia_semana_rota',null,null,'Dia '+(activeDay+1)+' definido como '+labels[token]);
    refresh();
  }

  function refresh(){
    hideCalendar();rewriteSelectors();syncPicker();
    if(typeof renderRoute==='function'&&!refresh.lock){refresh.lock=true;try{renderRoute();}finally{refresh.lock=false;}}
    if(typeof updateMapDay==='function'&&typeof map!=='undefined'&&map)updateMapDay();
  }

  async function load(){
    if(typeof sb==='undefined'||!authUser)return;
    const {data,error}=await sb.from('rota_dias').select('dia_indice,dia_semana');
    if(error){console.warn('dias operacionais',error.message);return;}
    config={};(data||[]).forEach(r=>config[Number(r.dia_indice)]=r.dia_semana);
    refresh();
    if(!channel){channel=sb.channel('rota-dias-realtime').on('postgres_changes',{event:'*',schema:'public',table:'rota_dias'},()=>setTimeout(load,150)).subscribe();}
  }

  const previousRender=window.renderRoute;
  if(typeof previousRender==='function')window.renderRoute=function(){const r=previousRender.apply(this,arguments);hideCalendar();rewriteSelectors();syncPicker();return r;};
  const previousTab=window.tab;
  if(typeof previousTab==='function')window.tab=function(id){if(id==='cal')id='rota';const r=previousTab(id);setTimeout(()=>{hideCalendar();rewriteSelectors();syncPicker();},20);return r;};

  window.loadOperationalDays=load;
  hideCalendar();rewriteSelectors();ensureWeekdayPicker();syncPicker();
  let loginWatch=setInterval(()=>{if(typeof authUser!=='undefined'&&authUser){load();if(channel)clearInterval(loginWatch);}},1000);
})();
