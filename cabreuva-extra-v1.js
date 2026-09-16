// Igrejas extras de Cabreúva adicionadas em 16/09/2026
window.D=window.D||{};
window.D.cities=window.D.cities||{};
window.D.cities['Cabreúva']=window.D.cities['Cabreúva']||[];
const extrasCabreuva=[
  {name:'IEADI - Igreja Evangélica Assembleia de Deus de Indaiatuba - Filial Cabreúva',addr:'Estr. dos Romeiros, 66 - Centro, Cabreúva - SP, 13315-000'},
  {name:'IEADI - Igreja Evangélica Assembleia de Deus de Indaiatuba - Distrito Jacaré - Cabreúva',addr:'R. Francisco Nunes, 101 - Jardim da Serra, Cabreúva - SP, 13315-000'},
  {name:'Igreja Catedral Evangélica CES | Jacaré - Cabreúva',addr:'Av. Alberto Peratello, 931 - Jacaré, Cabreúva - SP, 13315-000'},
  {name:'Catedral Evangélica CES - Cabreúva',addr:'R. Benevuto Facioli, 83 - Centro, Cabreúva - SP, 13315-000'}
];
extrasCabreuva.forEach(x=>{
  const jaExiste=window.D.cities['Cabreúva'].some(y=>(y.name||'').trim().toLowerCase()===x.name.toLowerCase()||(y.addr||'').trim().toLowerCase()===x.addr.toLowerCase());
  if(!jaExiste) window.D.cities['Cabreúva'].push(x);
});

// Atualiza o seletor/contador imediatamente após carregar as igrejas extras.
setTimeout(()=>{
  try{
    const citySel=document.getElementById('cityFilter');
    if(citySel&&typeof allChurches==='function'){
      const atual=citySel.value||'ALL';
      const cityNames=Object.keys(window.D.cities).sort((a,b)=>a.localeCompare(b,'pt-BR'));
      const total=allChurches().length;
      citySel.innerHTML=`<option value="ALL">Todas as cidades (${total} igrejas)</option>`+cityNames.map(c=>`<option value="${c}">${c} (${window.D.cities[c].length} ${window.D.cities[c].length===1?'igreja':'igrejas'})</option>`).join('');
      citySel.value=cityNames.includes(atual)||atual==='ALL'?atual:'ALL';
    }
    if(typeof renderAll==='function') renderAll();
    if(typeof updateKpis==='function') updateKpis();
  }catch(e){console.warn('Cabreúva extras:',e);}
},250);
