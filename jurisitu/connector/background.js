const SEI_MATCH='https://cidades.sei.sp.gov.br/*';
async function sendTask(tabId,payload){try{await chrome.tabs.sendMessage(tabId,{type:'JURISITU_NEW_TASK',payload});return true}catch{return false}}
chrome.runtime.onMessage.addListener((msg,sender,sendResponse)=>{
  if(msg?.type!=='JURISITU_QUEUE'||!msg.payload)return;
  (async()=>{
    const payload=msg.payload;
    await chrome.storage.local.set({jurisituTask:payload,jurisituTaskAt:Date.now()});
    let tabs=await chrome.tabs.query({url:SEI_MATCH});let tab=tabs.find(t=>t.active)||tabs[0];
    if(!tab){tab=await chrome.tabs.create({url:payload.portalUrl||'https://cidades.sei.sp.gov.br/sorocaba/sei/',active:true});setTimeout(()=>sendTask(tab.id,payload),1800)}
    else{await chrome.tabs.update(tab.id,{active:true});if(tab.windowId)await chrome.windows.update(tab.windowId,{focused:true});if(!await sendTask(tab.id,payload))setTimeout(()=>sendTask(tab.id,payload),900)}
    sendResponse({ok:true,message:'Ficha recebida pelo Robô SEI.'});
  })().catch(e=>sendResponse({ok:false,message:e.message}));
  return true;
});