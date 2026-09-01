(() => {
  const post=(type,extra={})=>window.postMessage({type,...extra},location.origin);
  post('JURISITU_CONNECTOR_READY');
  window.addEventListener('message',e=>{
    if(e.source!==window||!e.data)return;
    const d=e.data;
    if(d.type==='JURISITU_CONNECTOR_PING')post('JURISITU_CONNECTOR_PONG');
    if(d.type==='JURISITU_SEI_QUEUE'&&d.payload){
      chrome.runtime.sendMessage({type:'JURISITU_QUEUE',payload:d.payload},resp=>post('JURISITU_SEI_QUEUE_ACK',{ok:!!resp?.ok,message:resp?.message||''}));
    }
  });
  chrome.runtime.onMessage.addListener(msg=>{if(msg?.type==='JURISITU_CONNECTOR_STATUS')post('JURISITU_CONNECTOR_PONG',msg)});
})();