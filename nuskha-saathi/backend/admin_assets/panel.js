'use strict';
const $ = id => document.getElementById(id);
const node = (tag, text, cls) => {const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;return n;};
let paused=false, busy=false, lastSuccess=null;
function render(data, latency) {
  $('cards').replaceChildren();
  const health=data.health.status==='ok';
  const values=[['Application',health?'Healthy':'Degraded',health?'good':'bad'],['Build commit',data.commit.slice(0,12),''],['Process uptime',`${Math.floor(data.uptime_seconds/3600)}h ${Math.floor(data.uptime_seconds/60)%60}m`,''],['Status round trip',`${Math.round(latency)} ms`,'']];
  for(const [label,value,cls] of values){const c=node('div','','card');c.append(node('div',label,'label'),node('div',value,`value ${cls}`));$('cards').append(c);}
  $('cards').append(node('div',`API v${data.version} · Started ${new Date(data.started_at).toLocaleString()}`,'card muted'));
  $('capabilities').replaceChildren();
  const names={vision_configured:'Vision OCR',openrouter_configured:'OpenRouter',medster_live:'MedSter API',freeapi_transcribe_enabled:'FreeAPI STT',freeapi_imgchat_enabled:'FreeAPI ImgChat',tts_configured:'Urdu TTS',stt_configured:'Urdu STT',openfda_live:'openFDA live',whatsapp_configured:'WhatsApp',admin_monitor_configured:'Admin auth'};
  for(const [key,label] of Object.entries(names)) $('capabilities').append(node('span',`${label}: ${data.health.capabilities?.[key]?'yes':'no'}`,'badge'));
  $('active').replaceChildren();
  if(!data.active.length)$('active').append(node('p','No active API requests.','muted'));
  for(const r of data.active)$('active').append(node('p',`${r.id.slice(0,12)} · ${r.active_stage||'Processing request'}`));
  $('counts').textContent=`${data.requests} requests · ${data.http_failures} HTTP errors since restart`;
  const opened=new Set([...$('requests').querySelectorAll('details[open]')].map(d=>d.dataset.id));
  $('requests').replaceChildren();
  if(!data.recent.length)$('requests').append(node('p','No API requests observed since this process started. Health checks and this panel are excluded.','empty'));
  for(const r of data.recent){
    const d=document.createElement('details');d.dataset.id=r.id;d.open=opened.has(r.id);
    const summary=document.createElement('summary');
    const failed=r.status>=400||r.stages.some(s=>s.status==='failed');
    summary.append(node('strong',String(r.status),failed?'bad':'good'),node('code',`${r.method} ${r.route}`),node('span',`${r.ms} ms`),node('span',new Date(r.at).toLocaleTimeString(),'muted'));
    d.append(summary,node('div',`Request ID: ${r.id}`,'trace'));
    if(r.stages.length){const table=document.createElement('table');const head=document.createElement('tr');for(const h of ['Stage','Result','Time','Category'])head.append(node('th',h));table.append(head);for(const s of r.stages){const row=document.createElement('tr');row.append(node('td',s.name),node('td',s.status,s.status==='failed'?'bad':''),node('td',`${s.ms} ms`),node('td',s.error||'—'));table.append(row);}d.append(table);}else d.append(node('p','No pipeline stages recorded for this route.','muted'));
    $('requests').append(d);
  }
}
async function refresh(){
  if(busy)return;busy=true;$('refresh').disabled=true;const start=performance.now();
  try{const response=await fetch('/admin/api/status',{cache:'no-store',signal:AbortSignal.timeout(15000)});if(response.status===401){location.replace('/admin');return;}if(!response.ok)throw new Error('Status unavailable');const data=await response.json();render(data,performance.now()-start);lastSuccess=new Date();$('connection').textContent='Connected';$('connection').className='good';$('checked').textContent=`Last checked ${lastSuccess.toLocaleTimeString()}`;}
  catch{$('connection').textContent='Unreachable / stale data';$('connection').className='bad';$('checked').textContent=lastSuccess?`Last success ${lastSuccess.toLocaleTimeString()}`:'No successful response yet';}
  finally{busy=false;$('refresh').disabled=false;}
}
$('refresh').addEventListener('click',refresh);
$('pause').addEventListener('click',()=>{paused=!paused;$('pause').textContent=paused?'Resume updates':'Pause updates';$('pause').setAttribute('aria-pressed',String(paused));if(!paused)refresh();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!paused)refresh();});
setInterval(()=>{if(!paused&&!document.hidden)refresh();},10000);
refresh();
