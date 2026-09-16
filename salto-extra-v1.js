(function(){
  window.D=window.D||{};
  D.cities=D.cities||{};
  D.cities['Salto']=D.cities['Salto']||[];
  const novos=[
    {name:'Igreja Evangélica Assembleia de Deus ADSA',addr:'Salto - SP — endereço a confirmar'},
    {name:'Igreja AD Salto',addr:'Av. Eugênio Coltro, 1922 - Salto Ville, Salto - SP, 13323-420'},
    {name:'IEADI - Igreja Evangélica Assembleia de Deus de Indaiatuba - Filial Quintino Bocaiúva - Salto',addr:'R. Quintino Bocaiúva, 281 - Centro, Salto - SP, 13320-110'}
  ];
  const existe=(n,a)=>D.cities['Salto'].some(x=>(x.name||'').trim()===n.trim() || ((x.addr||'').trim()===a.trim() && a.indexOf('confirmar')<0));
  novos.forEach(x=>{if(!existe(x.name,x.addr))D.cities['Salto'].push(x);});

  function atualizarSeletorCidades(){
    const s=document.getElementById('cityFilter');
    if(!s)return;
    const atual=s.value||'ALL';
    const nomes=Object.keys(D.cities).sort((a,b)=>a.localeCompare(b,'pt-BR'));
    const total=typeof allChurches==='function'?allChurches().length:Object.values(D.cities).reduce((n,a)=>n+a.length,0);
    s.innerHTML=`<option value="ALL">Todas as cidades (${total} igrejas)</option>`+nomes.map(c=>`<option value="${c}">${c} (${D.cities[c].length} ${D.cities[c].length===1?'igreja':'igrejas'})</option>`).join('');
    if([...s.options].some(o=>o.value===atual))s.value=atual;
    if(typeof renderAll==='function')renderAll();
    if(typeof updateKpis==='function')updateKpis();
  }
  atualizarSeletorCidades();
})();
