// Pesquisa inicial de cultos — 50 primeiras igrejas do roteiro.
// Regra: horários específicos do endereço = confirmado; programação de sede/campo aplicada a congregações = a confirmar.
(function(){
 const fontes={
  sorocabaGeral:'https://addeus-sorocaba.webnode.page/horarios-dos-cultos/',
  sorocabaSede:'https://www.cylex.com.br/sorocaba/assembl%C3%A9ia-de-deus---sorocaba--bel%C3%A9m--12838263.html',
  itupeva:'https://wanderlog.com/place/details/13631524/assembleia-de-deus-minist%C3%A9rio-bel%C3%A9m-itupeva',
  adbelem:'https://ad.org.br/'
 };
 function texto(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
 function regra(x){
   const t=texto(x.name+' '+x.addr), c=x.city;
   // Endereços com horário específico encontrado.
   if(c==='Sorocaba'&&t.includes('aristides de campos')) return ['confirmado','Ter 19h30–21h; Qui 19h30–21h; Dom 18h–20h',fontes.sorocabaSede,'Horário específico do endereço'];
   if(c==='Sorocaba'&&t.includes('nestor silva de oliveira')) return ['confirmado','Qua 19h30–22h; Sex 19h30–22h; Sáb 19h30–22h; Dom 9h–11h','https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(x.name+' '+x.addr),'Horário público específico do endereço'];
   if(c==='Sorocaba'&&t.includes('michel chicri maluf')) return ['confirmado','Ter 14h30–16h; Qua 19h30–21h; Sex 19h30–21h; Sáb 18h30–21h; Dom 18h30–21h','https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(x.name+' '+x.addr),'Horário público específico do endereço'];
   if(c==='Sorocaba'&&t.includes('delcio ferreira de azevedo')) return ['confirmado','Qui 19h30–21h30; Dom 9h–10h30','https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(x.name+' '+x.addr),'Horário público específico do endereço'];
   if(c==='Sorocaba'&&t.includes('santos dumont')&&t.includes('960')) return ['confirmado','Qua 19h30–21h; Sex 19h30–21h; Dom 18h–20h','https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(x.name+' '+x.addr),'Horário público específico do endereço'];
   if(c==='Sorocaba'&&t.includes('elias maluf')) return ['confirmado','Qua 19h30–21h; Sex 19h30–0h; Dom 9h–10h30','https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(x.name+' '+x.addr),'Horário público específico da subsede Wanel Ville'];
   if(c==='Sorocaba'&&t.includes('goncalves junior')) return ['confirmado','Qua 19h30–21h; Sex 19h30–21h; Sáb 19h–21h; Dom 9h–12h','https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(x.name+' '+x.addr),'Horário público específico do endereço'];
   if(c==='Sorocaba'&&t.includes('francisco bueno de camargo')) return ['confirmado','Qua 19h30–21h; Dom 9h–11h','https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(x.name+' '+x.addr),'Horário público específico do endereço'];
   if(c==='Itupeva'&&t.includes('hermenegildo tonoli')&&t.includes('880')) return ['confirmado','Ter 19h–21h; Dom 8h–10h','https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(x.name+' '+x.addr),'Horário público específico do endereço'];
   if(c==='Itatiba'&&t.includes('luiz scavone')) return ['confirmado','Ter 18h30–21h30; Qui 18h30–21h30; Dom 18h30–21h30','https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(x.name+' '+x.addr),'Horário público específico do endereço'];
   if(c==='Cerquilho'&&t.includes('mario pilon')) return ['confirmado','Qua 19h–21h; Dom 9h–10h30','https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(x.name+' '+x.addr),'Horário público específico do endereço'];
   if(c==='Cerquilho'&&t.includes('rua sorocaba')&&t.includes('323')) return ['confirmado','Seg 19h30–20h30; Ter 19h30–20h30; Qui 19h30–21h; Sex 19h30–20h30; Sáb 19h30–21h; Dom 19h–21h','https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(x.name+' '+x.addr),'Horário público específico do endereço'];
   // Programação de referência do mesmo ministério/campo: útil para planejamento, mas exige confirmação local.
   if(c==='Sorocaba'&&(t.includes('belem')||t.includes('belém')||t.includes('assembleia')||t.includes('assembleia de deus')||t.includes('cead'))) return ['nao_confirmado','Seg 19h–20h; Qua 19h30–21h; Sex 19h30–21h; Dom 19h–21h',fontes.sorocabaGeral,'Programação geral AD Sorocaba; confirmar congregação'];
   if(c==='Mairinque'&&t.includes('belem')) return ['nao_confirmado','Qua 19h30–21h; Sex 19h30–21h; Dom 19h–21h',fontes.adbelem,'Referência do Ministério do Belém; confirmar congregação'];
   if(c==='Mairinque'&&t.includes('assembleia')) return ['nao_confirmado','Qua/Qui à noite; Dom à noite — confirmar horário', 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(x.name+' '+x.addr),'Dias encontrados em igrejas locais do mesmo campo; confirmar endereço'];
   if(c==='Itupeva'&&t.includes('belem')) return ['nao_confirmado','Ter 19h–21h; Dom 8h–10h',fontes.itupeva,'Programação da sede Belém Itupeva; confirmar congregação'];
   if(c==='Itupeva') return ['nao_confirmado','Domingo e culto semanal — confirmar dia/horário','https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(x.name+' '+x.addr),'Endereço localizado; agenda ainda não confirmada'];
   if(c==='Itatiba'&&t.includes('belem')) return ['nao_confirmado','Ter 18h30; Qui 18h30; Dom 18h30 — confirmar congregação','https://www.google.com/maps/search/?api=1&query=Assembleia+de+Deus+Belem+Itatiba','Referência de congregação Belém em Itatiba'];
   if(c==='Itatiba') return ['nao_confirmado','Domingo e culto semanal — confirmar dia/horário','https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(x.name+' '+x.addr),'Igreja localizada; agenda individual em confirmação'];
   if(c==='Indaiatuba'&&t.includes('ieadi')) return ['nao_confirmado','Ter 20h–21h; Qui 20h–21h; Dom 9h–11h — confirmar congregação','https://www.google.com/maps/search/?api=1&query=IEADI+Indaiatuba','Referência IEADI local; confirmar congregação'];
   if(c==='Indaiatuba'&&t.includes('belem')) return ['nao_confirmado','Ter 19h30–21h; Qui 19h30–21h; Dom 19h–21h — confirmar congregação','https://www.google.com/maps/search/?api=1&query=Assembleia+de+Deus+Ministerio+do+Belem+Indaiatuba','Referência de congregação Belém em Indaiatuba'];
   if(c==='Indaiatuba') return ['nao_confirmado','Domingo e culto semanal — confirmar dia/horário','https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(x.name+' '+x.addr),'Igreja localizada; agenda individual em confirmação'];
   if(c==='Cerquilho'&&t.includes('belem')) return ['nao_confirmado','Qua 19h–21h; Dom 9h–10h30 — confirmar congregação','https://www.google.com/maps/search/?api=1&query=Assembleia+de+Deus+Belem+Cerquilho','Referência local do mesmo ministério'];
   if(c==='Cerquilho') return ['nao_confirmado','Domingo e culto semanal — confirmar dia/horário','https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(x.name+' '+x.addr),'Igreja localizada; agenda individual em confirmação'];
   return ['nao_confirmado','Dia/horário em confirmação','https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(x.name+' '+x.addr),'Pesquisa iniciada'];
 }
 async function semear(){
   if(typeof sb==='undefined'||!authUser||typeof isAdmin!=='function'||!isAdmin()||!window.D?.routes)return;
   const vistos=new Set(), lista=[];
   for(const dia of D.routes){for(const x of dia){const k=[x.city,x.name,x.addr||''].join('|');if(!vistos.has(k)){vistos.add(k);lista.push(x);}if(lista.length>=50)break;}if(lista.length>=50)break;}
   const payload=lista.map(x=>{const [status,dias,fonte,obs]=regra(x);return {cidade:x.city,igreja:x.name,endereco:x.addr||'',prioridade:'normal',culto_status:status,culto_dias:dias,culto_horario:'',culto_fonte:fonte,observacao:obs,atualizado_por:authUser.id};});
   // Não substitui dados já confirmados/editados manualmente; insere/atualiza apenas pesquisa automática pendente.
   const {data:atuais}=await sb.from('igrejas_config').select('cidade,igreja,endereco,culto_status,observacao');
   const map=new Map((atuais||[]).map(a=>[[a.cidade,a.igreja,a.endereco||''].join('|'),a]));
   const gravar=payload.filter(p=>{const a=map.get([p.cidade,p.igreja,p.endereco].join('|'));return !a || a.observacao?.includes('Programação geral') || a.observacao?.includes('Referência') || a.observacao?.includes('Pesquisa iniciada') || a.observacao?.includes('agenda individual') || a.observacao?.includes('Dias encontrados');});
   if(gravar.length){const {error}=await sb.from('igrejas_config').upsert(gravar,{onConflict:'cidade,igreja,endereco'});if(error)console.warn('cultos50',error.message);}
   if(typeof carregarIgrejaCfg==='function')await carregarIgrejaCfg();
 }
 setTimeout(semear,2200);
})();
