// Adiciona link do Google Maps na aba "Todas as igrejas" para conferência de endereço.
(function(){
  if(typeof renderAll!=='function') return;
  const renderAllAnterior=renderAll;
  renderAll=function(){
    renderAllAnterior();
    const city=document.getElementById('cityFilter')?.value||'ALL';
    const q=(document.getElementById('q')?.value||'').toLowerCase();
    const st=document.getElementById('statusFilter')?.value||'all';
    let arr=city==='ALL'?allChurches():allChurches().filter(x=>x.city===city);
    arr=arr.filter(x=>(x.name+' '+x.addr+' '+x.city).toLowerCase().includes(q));
    if(st!=='all') arr=arr.filter(x=>st==='done'?!!state.visited[x.city+'|'+x.idx]:!state.visited[x.city+'|'+x.idx]);
    const rows=document.querySelectorAll('#allTable tbody tr');
    rows.forEach((r,i)=>{
      const x=arr[i]; if(!x) return;
      if(r.querySelector('.maps-check-cell')) return;
      const td=document.createElement('td');
      td.className='maps-check-cell';
      const query=[x.name,x.addr,x.city,'SP'].filter(Boolean).join(', ');
      td.innerHTML=`<a class="maplink" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}">📍 Confirmar no Maps</a>`;
      r.appendChild(td);
    });
    const h=document.querySelector('#allTable thead tr');
    if(h&&!h.querySelector('.maps-check-head')){
      const th=document.createElement('th');
      th.className='maps-check-head';
      th.textContent='Maps';
      h.appendChild(th);
    }
  };
  renderAll();
})();
