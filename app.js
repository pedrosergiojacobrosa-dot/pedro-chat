const cfg=window.APP_CONFIG||{};
let sb=null,currentUser=null,currentProfile=null;
function tab(id){document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));document.getElementById(id)?.classList.add('active');}
function msg(t,err=false){const e=document.getElementById('loginMsg');if(e){e.textContent=t;e.style.color=err?'#a51d1d':'#176b3a';}}
async function iniciar(){
 if(!cfg.supabaseUrl||!cfg.supabaseKey){msg('Configuração do acesso ainda não foi concluída.',true);return;}
 sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
 const {data}=await sb.auth.getSession(); if(data.session) await aplicarSessao(data.session);
 sb.auth.onAuthStateChange(async(_,session)=>{if(session)await aplicarSessao(session);else bloquear();});
 iniciarSite();
}
async function entrar(){
 if(!sb){msg('Acesso ainda não configurado.',true);return;}
 const email=document.getElementById('loginEmail').value.trim();const password=document.getElementById('loginSenha').value;
 if(!email||!password){msg('Informe e-mail e senha.',true);return;}
 msg('Entrando...');const {data,error}=await sb.auth.signInWithPassword({email,password});
 if(error){msg('Não foi possível entrar: '+error.message,true);return;} await aplicarSessao(data.session);await log('login','Usuário entrou no sistema');
}
async function criarPrimeiroAcesso(){
 if(!sb){msg('Acesso ainda não configurado.',true);return;}
 const email=document.getElementById('loginEmail').value.trim();const password=document.getElementById('loginSenha').value;
 if(!email||password.length<6){msg('Informe o e-mail e uma senha com pelo menos 6 caracteres.',true);return;}
 const {error}=await sb.auth.signUp({email,password});if(error){msg(error.message,true);return;}msg('Cadastro solicitado. Se o Supabase pedir confirmação, verifique seu e-mail.');
}
async function aplicarSessao(session){
 currentUser=session.user;document.getElementById('authGate').style.display='none';document.getElementById('usuarioLogado').textContent=currentUser.email;
 try{const {data}=await sb.from('perfis').select('*').eq('id',currentUser.id).maybeSingle();currentProfile=data;}catch(e){}
 const admin=(currentUser.email||'').toLowerCase()==='pedro.rosa@itu.sp.gov.br'||currentProfile?.papel==='admin'||currentProfile?.role==='admin';
 document.getElementById('adminNav').style.display=admin?'inline-block':'none';
}
function bloquear(){currentUser=null;currentProfile=null;document.getElementById('authGate').style.display='flex';document.getElementById('adminNav').style.display='none';}
async function sair(){if(sb&&currentUser){await log('logout','Usuário saiu do sistema');await sb.auth.signOut();}bloquear();}
async function log(tipo,descricao,extra={}){if(!sb||!currentUser)return;try{await sb.from('atividades').insert({usuario_id:currentUser.id,tipo,descricao,dados:extra});}catch(e){console.warn('log',e.message);}}
async function carregarAdmin(){
 if(!sb||!currentUser)return;let users=[],logs=[];try{const r=await sb.from('perfis').select('*').limit(200);users=r.data||[];}catch(e){}try{const r=await sb.from('atividades').select('*').order('created_at',{ascending:false}).limit(100);logs=r.data||[];}catch(e){}
 document.getElementById('admUsuarios').textContent=users.length;document.getElementById('admAtividades').textContent=logs.length;document.getElementById('admVisitas').textContent=logs.filter(x=>x.tipo==='visita').length;
 document.getElementById('adminUsers').innerHTML=users.length?'<table><tr><th>Usuário</th><th>Perfil</th></tr>'+users.map(u=>`<tr><td>${esc(u.nome||u.email||u.id)}</td><td>${esc(u.papel||u.role||'equipe')}</td></tr>`).join('')+'</table>':'<p class="muted">Nenhum perfil encontrado.</p>';
 document.getElementById('adminLogs').innerHTML=logs.length?'<table><tr><th>Data</th><th>Tipo</th><th>Descrição</th></tr>'+logs.map(l=>`<tr><td>${new Date(l.created_at).toLocaleString('pt-BR')}</td><td>${esc(l.tipo)}</td><td>${esc(l.descricao||'')}</td></tr>`).join('')+'</table>':'<p class="muted">Nenhuma atividade registrada.</p>';
}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function iniciarSite(){const igrejas=window.IGREJAS||[];const cidades=[...new Set(igrejas.map(x=>x.cidade).filter(Boolean))].sort();const n=document.getElementById('nchurch');if(n)n.textContent=igrejas.length;const nc=document.getElementById('ncities');if(nc)nc.textContent=cidades.length;['calCity','churchCity'].forEach(id=>{const s=document.getElementById(id);if(s){s.innerHTML='<option value="">Todas as cidades</option>'+cidades.map(c=>`<option>${esc(c)}</option>`).join('');}});drawChurches();}
function drawChurches(){const all=window.IGREJAS||[];const city=document.getElementById('churchCity')?.value||'';const q=(document.getElementById('q')?.value||'').toLowerCase();const a=all.filter(x=>(!city||x.cidade===city)&&(!q||JSON.stringify(x).toLowerCase().includes(q)));const el=document.getElementById('churchTable');if(!el)return;el.innerHTML='<table><tr><th>Igreja</th><th>Cidade</th><th>Endereço/Bairro</th><th>Status</th></tr>'+a.map((x,i)=>`<tr><td>${esc(x.nome||x.igreja||'Igreja')}</td><td>${esc(x.cidade||'')}</td><td>${esc(x.endereco||x.bairro||'')}</td><td><button class="doneBtn ${x.visitada?'on':''}" onclick="marcarVisita(${i})">${x.visitada?'VISITADA':'MARCAR VISITA'}</button></td></tr>`).join('')+'</table>';}
async function marcarVisita(i){const all=window.IGREJAS||[];const x=all[i];if(!x)return;x.visitada=!x.visitada;drawChurches();if(x.visitada)await log('visita','Igreja marcada como visitada',{igreja:x.nome||x.igreja,cidade:x.cidade});}
function drawCalendar(){document.getElementById('cal').innerHTML='<p class="muted">Calendário operacional será carregado com os dados das igrejas.</p>';}function drawPending(){document.getElementById('pending').innerHTML='<p class="muted">Aguardando dados de agenda.</p>';}function mon(){}function goStart(){}function route(){document.getElementById('routes').innerHTML='<div class="card">As rotas serão montadas a partir das igrejas programadas.</div>';}function locate(){navigator.geolocation?.getCurrentPosition(()=>{},()=>alert('Não foi possível obter sua localização.'));}function openGmaps(){window.open('https://www.google.com/maps','_blank');}
document.addEventListener('DOMContentLoaded',iniciar);
