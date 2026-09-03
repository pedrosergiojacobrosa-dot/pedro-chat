// Cultos V4 — cada dia de culto possui seu próprio horário.
(function cultosHorariosV4(){
  const DAYS=[
    ['dom','Domingo'],['seg','Segunda-feira'],['ter','Terça-feira'],['qua','Quarta-feira'],
    ['qui','Quinta-feira'],['sex','Sexta-feira'],['sab','Sábado']
  ];
  const SHORT={dom:'Dom',seg:'Seg',ter:'Ter',qua:'Qua',qui:'Qui',sex:'Sex',sab:'Sáb'};
  const ALIASES={dom:['domingo','dom'],seg:['segunda','seg'],ter:['terca','ter'],qua:['quarta','qua'],qui:['quinta','qui'],sex:['sexta','sex'],sab:['sabado','sab']};
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

  function tokenPresent(text,token){const s=norm(text);return ALIASES[token].some(a=>s.includes(a));}
  function normalizeTime(raw){const s=String(raw||'').trim();const m=s.match(/(?:^|\D)([0-2]?\d)\s*(?::|h)\s*([0-5]\d)?/i);if(!m)return '';const h=Math.min(23,Number(m[1])),min=m[2]?Number(m[2]):0;return String(h).padStart(2,'0')+':'+String(min).padStart(2,'0');}

  function deriveLegacyHours(cfg){
    const out={},combined=norm([cfg?.culto_dias||'',cfg?.culto_horario||''].filter(Boolean).join(' ; '));
    for(const [token] of DAYS){for(const alias of ALIASES[token]){const idx=combined.indexOf(alias);if(idx<0)continue;const nearby=combined.slice(idx+alias.length,idx+alias.length+38),t=normalizeTime(nearby);if(t){out[token]=t;break;}}}
    const selected=DAYS.filter(([t])=>tokenPresent(cfg?.culto_dias,t));if(selected.length===1&&!out[selected[0][0]]){const t=normalizeTime(cfg?.culto_horario);if(t)out[selected[0][0]]=t;}
    return out;
  }

  function scheduleFor(cfg){const saved=(cfg&&typeof cfg.culto_horarios==='object'&&cfg.culto_horarios)||{};return {...deriveLegacyHours(cfg),...saved};}
  window.horarioCultoParaDia=(cfg,token)=>scheduleFor(cfg||{})[token]||'';
  window.resumoHorariosCulto=function(cfg){const schedule=scheduleFor(cfg||{});return DAYS.filter(([t])=>tokenPresent(cfg?.culto_dias,t)).map(([t])=>SHORT[t]+' '+(schedule[t]||'a confirmar')).join(' · ');};

  function ensureScheduleGrid(){
    const modal=document.getElementById('cultEditModal');if(!modal||document.getElementById('ceScheduleGrid'))return;
    const oldDays=document.getElementById('ceDias'),oldHour=document.getElementById('ceHora');
    if(oldDays){oldDays.style.display='none';const lab=oldDays.previousElementSibling;if(lab)lab.style.display='none';}
    if(oldHour){oldHour.style.display='none';const lab=oldHour.previousElementSibling;if(lab)lab.style.display='none';}
    const source=document.getElementById('ceFonte'),grid=document.createElement('div');grid.id='ceScheduleGrid';
    grid.innerHTML=`<div style="margin:2px 0 8px"><b>Dias e horários dos cultos</b><div class="small muted">Marque os dias corretos e informe o horário de início de cada culto.</div></div><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:14px" id="ceScheduleRows">${DAYS.map(([t,l])=>`<label style="display:flex;align-items:center;gap:8px;border:1px solid var(--line);border-radius:10px;padding:9px;background:#fff"><input type="checkbox" data-cult-day="${t}" style="width:auto;margin:0"><span style="min-width:105px"><b>${l}</b></span><input type="time" data-cult-time="${t}" style="flex:1;min-width:100px" disabled></label>`).join('')}</div>`;
    if(source?.previousElementSibling)source.previousElementSibling.parentNode.insertBefore(grid,source.previousElementSibling);else modal.querySelector('.card')?.appendChild(grid);
    grid.querySelectorAll('[data-cult-day]').forEach(cb=>cb.addEventListener('change',()=>{const input=grid.querySelector(`[data-cult-time="${cb.dataset.cultDay}"]`);if(input){input.disabled=!cb.checked;if(!cb.checked)input.value='';}}));
  }

  function fillSchedule(cfg){ensureScheduleGrid();const schedule=scheduleFor(cfg||{});for(const [token] of DAYS){const cb=document.querySelector(`[data-cult-day="${token}"]`),time=document.querySelector(`[data-cult-time="${token}"]`),checked=tokenPresent(cfg?.culto_dias,token);if(cb)cb.checked=checked;if(time){time.disabled=!checked;time.value=checked?(schedule[token]||''):'';}}}
  function collectSchedule(){const hours={},labels=[];for(const [token,label] of DAYS){const cb=document.querySelector(`[data-cult-day="${token}"]`),time=document.querySelector(`[data-cult-time="${token}"]`);if(cb?.checked){labels.push(label);if(time?.value)hours[token]=time.value;}}const summary=DAYS.filter(([t])=>hours[t]).map(([t])=>SHORT[t]+' '+hours[t]).join('; ');return {labels,hours,summary};}

  async function syncAgendaHours(city,name,addr,hours){
    if(typeof sb==='undefined'||!authUser)return;
    let q=sb.from('agenda').select('id,dia_indice').eq('status','programada').eq('cidade',city).eq('igreja',name);
    if(addr)q=q.eq('endereco',addr);
    const {data,error}=await q;if(error){console.warn('sincronizar horários da rota',error.message);return;}
    for(const row of data||[]){const token=window.getOperationalDayToken?.(Number(row.dia_indice));const hour=token?(hours[token]||null):null;const {error:e}=await sb.from('agenda').update({horario:hour,atualizado_por:authUser.id}).eq('id',row.id);if(e)console.warn('horário da rota',e.message);}
    if(typeof window.carregarRotaOficial==='function')await window.carregarRotaOficial();
  }

  function patch(){
    ensureScheduleGrid();
    if(typeof window.abrirEditorCulto==='function'&&!window.abrirEditorCulto.__hoursV4){const prev=window.abrirEditorCulto;const wrapped=function(c,n,a){const r=prev(c,n,a),cfg=typeof cfgDaIgreja==='function'?cfgDaIgreja(c,n,a):{};setTimeout(()=>fillSchedule(cfg),0);return r;};wrapped.__hoursV4=true;window.abrirEditorCulto=wrapped;}
    if(typeof window.salvarEditorCulto==='function'&&!window.salvarEditorCulto.__hoursV4){const wrapped=async function(){const b=document.getElementById('ceSave'),c=document.getElementById('ceCity').value,n=document.getElementById('ceName').value,a=document.getElementById('ceAddr').value,sch=collectSchedule();if(!sch.labels.length)return alert('Marque pelo menos um dia de culto.');const patch={prioridade:document.getElementById('cePrior').value,culto_status:document.getElementById('ceStatus').value,culto_dias:sch.labels.join(', '),culto_horarios:sch.hours,culto_horario:sch.summary,culto_fonte:document.getElementById('ceFonte').value.trim(),observacao:document.getElementById('ceObs').value.trim()};try{b.disabled=true;b.textContent='Salvando...';await salvarCfgIgreja(c,n,a,patch);await syncAgendaHours(c,n,a,sch.hours);if(typeof fecharEditorCulto==='function')fecharEditorCulto();if(typeof renderPainelCultos==='function')renderPainelCultos();}catch(e){alert('Não foi possível salvar: '+(e?.message||e));}finally{b.disabled=false;b.textContent='Salvar alterações';}};wrapped.__hoursV4=true;window.salvarEditorCulto=wrapped;}
  }
  setTimeout(patch,300);setTimeout(patch,1000);setTimeout(patch,2200);
})();