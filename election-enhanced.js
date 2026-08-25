(function(){
const verified={
'Itu':{votes:16493,share_city:19.13},'Cotia':{votes:1999,share_city:1.53},'Itapeva':{votes:1525,share_city:3.3},'São Paulo':{votes:1458,share_city:0.0},'Ferraz de Vasconcelos':{votes:1404,share_city:1.52},
'Sorocaba':{votes:500,share_city:.14},'Mairinque':{votes:1037,share_city:3.94},'Itupeva':{votes:328,share_city:1.07},'Itatiba':{votes:127,share_city:.22},'Indaiatuba':{votes:504,share_city:.37},'Cerquilho':{votes:354,share_city:1.44},'Campinas':{votes:114,share_city:.02},'Hortolândia':{votes:9,share_city:.01},'Elias Fausto':{votes:67,share_city:.70},'Limeira':{votes:140,share_city:.09},"Santa Bárbara d'Oeste":{votes:140,share_city:.13},'Mogi Guaçu':{votes:331,share_city:.41},'Engenheiro Coelho':{votes:0,share_city:0},'Porto Ferreira':{votes:3,share_city:.01},'Mococa':{votes:0,share_city:0},'Brotas':{votes:85,share_city:.71},'Itararé':{votes:12,share_city:.05},'Guarulhos':{votes:691,share_city:.11},'Osasco':{votes:74,share_city:.02},'Taubaté':{votes:7,share_city:0},'Ubatuba':{votes:11,share_city:.02},'Votuporanga':{votes:2,share_city:0},'Botucatu':{votes:276,share_city:.37},'Cravinhos':{votes:105,share_city:.58},'Holambra':{votes:5,share_city:.05},'Fartura':{votes:10,share_city:.11},'Iaras':{votes:49,share_city:1.73},'Cerqueira César':{votes:165,share_city:1.67},'Bofete':{votes:4,share_city:.07},'Chavantes':{votes:3,share_city:.05},'Porangaba':{votes:244,share_city:4.97},'Guaraçaí':{votes:1,share_city:.02},'Palmital':{votes:62,share_city:.54},'Flórida Paulista':{votes:2,share_city:.04},'General Salgado':{votes:0,share_city:0},'Turmalina':{votes:0,share_city:0},'Descalvado':{votes:0,share_city:0},'Orlândia':{votes:1,share_city:0},'Cordeirópolis':{votes:60,share_city:.44},'Avaí':{votes:0,share_city:0},'Herculândia':{votes:0,share_city:0},'Itaí':{votes:5,share_city:.04},'Sumaré':{votes:5,share_city:0}
};
const extraCoords={'Itu':[-23.264,-47.299],'Cotia':[-23.604,-46.919],'Itapeva':[-23.982,-48.876],'Ferraz de Vasconcelos':[-23.541,-46.368]};
for(const [city,v] of Object.entries(verified)){
  let row=(D.election||[]).find(x=>x.city===city);
  if(row){row.votes=v.votes;row.share_city=v.share_city;row.share_campaign=+(v.votes/57800*100).toFixed(2);row.verified=true;}
  else {const c=D.coords?.[city]||extraCoords[city];if(c)(D.election||[]).push({city,lat:c[0],lon:c[1],votes:v.votes,share_city:v.share_city,share_campaign:+(v.votes/57800*100).toFixed(2),verified:true});}
}
if(D.election){
  D.election.forEach(x=>{if(x.city==='Santo Amaro'||x.city==='São Miguel Paulista'){x.scopeNote='Região do município de São Paulo; o resultado municipal consolidado é exibido em São Paulo.';}})
}
function getVoteColor(v){if(v==null)return '#d6dfd8';if(v>=1000)return '#0a4f29';if(v>=500)return '#176b3a';if(v>=200)return '#3f8b5d';if(v>=50)return '#74ad87';if(v>0)return '#a8cdb3';return '#edf3ee';}
function getRadius(v){if(v==null)return 5;if(v<=0)return 5;return Math.max(6,Math.min(28,6+Math.sqrt(v)*0.18));}
renderElectionCities=function(){
  const q=(document.getElementById('eq')?.value||'').toLowerCase();
  const sort=document.getElementById('eSort')?.value||'votes';
  let arr=(D.election||[]).filter(x=>x.city.toLowerCase().includes(q));
  arr.sort((a,b)=>sort==='name'?a.city.localeCompare(b.city,'pt-BR'):sort==='share'?((b.share_city??-1)-(a.share_city??-1)):((b.votes??-1)-(a.votes??-1)));
  const verifiedCount=arr.filter(x=>x.votes!=null).length;
  document.getElementById('eCityTable').innerHTML=`<div style="padding:10px 12px;background:#f3f8f4;border-bottom:1px solid #d6e0d9"><b>${verifiedCount}</b> cidades desta lista já têm votação carregada. As demais ficam identificadas como não validadas, sem estimativa.</div><table><thead><tr><th>Cidade</th><th>Votos</th><th>% no município</th><th>Intensidade</th></tr></thead><tbody>${arr.map(x=>`<tr><td><b>${x.city}</b>${x.scopeNote?`<div class="small muted">${x.scopeNote}</div>`:''}</td><td>${x.votes==null?'<span class="muted">Não validado</span>':x.votes.toLocaleString('pt-BR')}</td><td>${x.share_city==null?'—':x.share_city.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'%'}</td><td>${x.votes==null?'<span class="muted">Sem cor</span>':`<div class="statbar"><span style="width:${Math.max(2,Math.min(100,x.votes/164.93))}%;background:${getVoteColor(x.votes)}"></span></div>`}</td></tr>`).join('')}</tbody></table>`;
};
initElectoral=function(){
  if(eMap){eMap.remove();eMap=null;}
  eMap=L.map('eMap').setView([-23.3,-47.2],7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors'}).addTo(eMap);
  const vals=(D.election||[]).filter(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lon));
  vals.forEach(x=>{
    const color=getVoteColor(x.votes),radius=getRadius(x.votes);
    L.circleMarker([x.lat,x.lon],{radius,fillColor:color,color:x.votes==null?'#9aa79d':'#0c4d2a',weight:x.votes>=500?2:1,fillOpacity:x.votes==null?.35:.82}).addTo(eMap).bindPopup(`<b>${x.city}</b><br>${x.votes==null?'Votação ainda não validada nesta base':`Rita Passos: <b>${x.votes.toLocaleString('pt-BR')} votos</b><br>${x.share_city!=null?x.share_city.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'% dos votos válidos para o cargo no município':''}`}${x.scopeNote?'<br><small>'+x.scopeNote+'</small>':''}`);
  });
  const sec=document.getElementById('eMap')?.parentElement;
  if(sec&&!document.getElementById('electLegend')){const l=document.createElement('div');l.id='electLegend';l.style='display:flex;gap:8px;flex-wrap:wrap;margin:10px 0;font-size:12px';l.innerHTML='<span><b>Intensidade:</b></span><span>🟢 escuro ≥ 1.000</span><span>🟢 500–999</span><span>🟩 200–499</span><span>🟩 50–199</span><span>▫️ 1–49</span><span>⚪ sem voto/0</span><span>◌ não validado</span>';sec.insertBefore(l,document.getElementById('eMap'));}
};
renderElectionBars=function(){
  const a=(D.election||[]).filter(x=>x.votes!=null).sort((a,b)=>b.votes-a.votes).slice(0,12);
  document.getElementById('eBars').innerHTML=a.map(x=>`<div style="margin:9px 0"><div style="display:flex;justify-content:space-between;gap:12px"><b>${x.city}</b><span>${x.votes.toLocaleString('pt-BR')} votos</span></div><div class="statbar"><span style="width:${Math.max(2,Math.min(100,x.votes/164.93))}%;background:${getVoteColor(x.votes)}"></span></div><div class="small muted">${x.share_city!=null?x.share_city.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'% no município · ':''}${(x.votes/57800*100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}% da votação total de Rita</div></div>`).join('');
};
renderElectionCities();renderElectionBars();
})();