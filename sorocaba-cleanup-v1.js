// Corrige registros de Sorocaba que vieram concatenados no OCR.
(function sorocabaCleanupV1(){
  if(!window.D?.cities?.Sorocaba || D.__sorocabaCleanV1) return;
  const old=D.cities.Sorocaba;
  const R={
    8:[
      {name:'AD Belem Vila Melges',addr:'Rua Antônio Fausto, 253 — Jardim Brasilândia — Sorocaba/SP — CEP 18075-650'},
      {name:'Assembleia de Deus Ministério do Belém em Sorocaba — Jardim Novo Mundo',addr:'Rua Dezoito, 350 — Jardim Novo Mundo — Sorocaba/SP'}
    ],
    9:[
      {name:'Igreja Assembléia de Deus',addr:'Ministério do Belém - Vila Angélica Endereço: Av. Santos Dumont, 960 — Jardim Ana Maria — Sorocaba/SP — CEP 18065-290'},
      {name:'AD Belém — Jardim Santa Esmeralda',addr:'Av. Monsenhor Mauro Vallini, 51 — Jardim Santa Cecília — Sorocaba/SP — CEP 18079-025'},
      {name:'AD Belém — Jardim das Magnólias',addr:'Av. Sorocaba, 511 — Jardim Magnólia — Sorocaba/SP — CEP 18044-390'},
      {name:'AD Belém — Jardim Santa Bárbara',addr:'Rua Dr. Américo Figueiredo, 4930 — Jardim Ana Maria — Sorocaba/SP — CEP 18065-235'},
      {name:'AD Belém — Wanel Ville II',addr:'Av. Elias Maluf, 2322 — Sorocaba/SP — CEP 18055-215'},
      {name:'AD Belém — Vila Gabriel',addr:'Rua Oscar de Barros, 133 — Vila Gabriel — Sorocaba/SP — CEP 18081-020'},
      {name:'AD Belém — Jardim Zulmira',addr:'Rua Américo Corra, 30 — Jardim Zulmira — Sorocaba/SP — CEP 18061-000'},
      {name:'AD Belém — Trujillo',addr:'Rua Gonçalves Júnior, 315 — Vila Barão — Sorocaba/SP — CEP 18065-610'}
    ],
    11:[{name:'Assembleia de Deus Madureira Nova Sorocaba',addr:'Rua Francisco Bueno de Camargo, 2430 — Vila Nova Sorocaba — Sorocaba/SP — CEP 18070-710'}],
    13:[
      {name:'Igreja Evangélica Assembléia De Deus Em Sorocaba-Sp',addr:'Av. Miguel Patrício de Moraes, 201 — Jardim Itanguá — Sorocaba/SP — CEP 18056-000'},
      {name:'Igreja Evangélica Assembléia de Deus — Vila Barcelona',addr:'Av. Comendador Barbero, 263 — Vila Barcelona — Sorocaba/SP — CEP 18025-410'}
    ],
    16:[
      {name:'Igreja Evangélica Assembleia de Deus',addr:'Rua Joaquim de Carvalho Gil, 1375 — Jardim Abatiá — Sorocaba/SP — CEP 18057-000'},
      {name:'Assembleia de Deus Nova Esperança de Sorocaba',addr:'Rua Itanguá, 647 — Sorocaba/SP — CEP 18061-310'},
      {name:'Assembleia de Deus Ministério Perus',addr:'Rua Heitor Azevedo Hummel, 83 — Parque Manchester — Sorocaba/SP — CEP 18056-360'},
      {name:'AD Brás Sorocaba',addr:'Rua Moacir Nascimento — Vila Carvalho — Sorocaba/SP — CEP 18060-170'},
      {name:'Assembleia de Deus Verdade e Vida',addr:'Rua Comandante Salgado, 746 — Vila Hortência — Sorocaba/SP — CEP 18020-264'},
      {name:'Assembleia de Deus — Vila Hortência',addr:'Rua Fernão Sales, 990 — Vila Hortência — Sorocaba/SP — CEP 18020-266'}
    ],
    19:[{name:'Assembleia de Deus',addr:'Vila Colorau Endereço: Rua Etelvina de Souza Melo, 20 — Vila Colorau — Sorocaba/SP — CEP 18020-623'}],
    21:[
      {name:'Rua Monsieur Oliveira, 274',addr:'Sorocaba/SP'},
      {name:'Rua Florindo de Jesus Mariano Santos, 103',addr:'Sorocaba/SP'},
      {name:'Av. Afonso Vergueiro, 3003',addr:'Sorocaba/SP — CEP 18043-090'}
    ],
    23:[
      {name:'Rua José Garibaldi, 130',addr:'Sorocaba/SP — CEP 18025-570'},
      {name:'Rua Pedro Lombardi, 1098',addr:'Sorocaba/SP — CEP 18076-520'},
      {name:'Av. Dr. Ulysses Guimarães, 1160',addr:'Sorocaba/SP — CEP 18077-391'},
      {name:'Rua Umberto Peres, 109',addr:'Sorocaba/SP — CEP 18074-625'}
    ],
    24:[
      {name:'Alameda Celidônio do Monte, 645',addr:'Sorocaba/SP — CEP 18044-690 — Ministério Bom Retiro'},
      {name:'Alameda Dom Hortências, 456',addr:'Sorocaba/SP — Assembleia de Deus Canaã'},
      {name:'Av. São Paulo, 18666',addr:'Sorocaba/SP — CEP 18013-004 — Assembleia de Deus Missão'}
    ],
    26:[
      {name:'Rua Angelino Peliz Costa, 230',addr:'Sorocaba/SP — CEP 18017-013'},
      {name:'Rua Avelino dos Santos, 874',addr:'Sorocaba/SP — CEP 18072-037'}
    ],
    27:[
      {name:'Rua Antonio Pedro Lucas, 180',addr:'Sorocaba/SP — CEP 18078-368'},
      {name:'Rua Julio Lopes Manzano, 60',addr:'Sorocaba/SP — CEP 18056-550'},
      {name:'Rua Eudmira A. N. Rinaldo, 300',addr:'Sorocaba/SP — CEP 18070-805'}
    ],
    28:[
      {name:'Rua Joaquim Pires, 276',addr:'Sorocaba/SP — CEP 18015-233'},
      {name:'Av. Santa Cruz, 1449',addr:'Sorocaba/SP — CEP 18050-260'},
      {name:'Alameda Augusto Severo, 20',addr:'Sorocaba/SP — CEP 18070-275'}
    ],
    29:[
      {name:'Rua Augusto F. Oliveira, 162',addr:'Sorocaba/SP — CEP 18071-170'},
      {name:'Rua José Luiz Flaquer, 202',addr:'Sorocaba/SP — CEP 18103-060'}
    ],
    31:[
      {name:'Rua Arthur Gonçalves, 187',addr:'Sorocaba/SP — CEP 18071-160'},
      {name:'Rua Prof. Yvonne Tunis Soares, 40',addr:'Sorocaba/SP — CEP 18055-730'},
      {name:'Rua Adelino Fernandes Guimarães, 275',addr:'Sorocaba/SP — CEP a confirmar'}
    ]
  };
  const clean=[], oldToNew={};
  old.forEach((rec,idx)=>{
    oldToNew[idx]=clean.length;
    (R[idx]||[{name:rec.name,addr:rec.addr}]).forEach(x=>clean.push(x));
  });
  D.cities.Sorocaba=clean;
  (D.routes||[]).forEach(route=>route.forEach(x=>{
    if(x.city!=='Sorocaba')return;
    const ni=oldToNew[x.idx];
    const rec=clean[ni];
    if(rec)Object.assign(x,{idx:ni,name:rec.name,addr:rec.addr});
  }));
  if(typeof state!=='undefined'&&state?.visited){
    const nv={};
    Object.entries(state.visited).forEach(([k,v])=>{
      if(!k.startsWith('Sorocaba|')){nv[k]=v;return;}
      const oi=Number(k.split('|')[1]);
      const ni=oldToNew[oi];
      if(Number.isInteger(ni))nv['Sorocaba|'+ni]=v;
    });
    state.visited=nv;
    if(typeof save==='function')save();
  }
  D.__sorocabaCleanV1=true;
  D.__sorocabaOldToNew=oldToNew;
  try{if(typeof renderRoute==='function')renderRoute();if(typeof renderAll==='function')renderAll();if(typeof updateKpis==='function')updateKpis();if(typeof renderCal==='function')renderCal();}catch(e){console.warn('cleanup Sorocaba',e.message)}
})();
