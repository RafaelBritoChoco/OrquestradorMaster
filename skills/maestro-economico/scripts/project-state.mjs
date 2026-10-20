#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';

const statuses=['planejado','observado','inferido','verificado','desatualizado','pendente'];
const groups=['components','connections','tasks','chats','decisions','issues','evidence','criteria','changes'];
const fail=m=>{throw new Error(m)};
const str=(v,n)=>{if(typeof v!=='string'||!v.trim()||v.length>4000)fail(n+': texto obrigatório (até 4000 caracteres)')};
const arr=(v,n)=>{if(!Array.isArray(v)||v.length>300)fail(n+': lista até 300 itens')};
export function validate(s){
 if(!s||s.schemaVersion!==1)fail('schemaVersion deve ser 1');
 if(!Number.isSafeInteger(s.revision)||s.revision<1)fail('revision positiva');
 for(const k of ['projectId','title','objective','stateOwner','nextStep'])str(s[k],k);
 const all=new Set();
 for(const g of groups){arr(s[g],g);for(const o of s[g]){if(!o||typeof o!=='object')fail(g+': objeto obrigatório');if(!/^[a-z][a-z0-9-]{0,63}$/.test(o.id)||all.has(o.id))fail('ID inválido/duplicado: '+o.id);all.add(o.id);str(o.title,o.id);if(!statuses.includes(o.status))fail('status inválido: '+o.id);}}
 const ids=g=>new Set(s[g].map(x=>x.id)); const ev=ids('evidence'),cp=ids('components'),ch=ids('chats');
 const refs=(v,set,n)=>{arr(v,n);for(const x of v)if(!set.has(x))fail(n+': referência inexistente '+x)};
 for(const g of groups)for(const o of s[g]){refs(o.evidenceIds,ev,o.id+'.evidenceIds');if(o.status==='verificado'&&g!=='evidence'&&!o.evidenceIds.length)fail(o.id+': verificado exige evidência');}
 const cells=new Set();
 for(const c of s.components){for(const k of ['responsibility','flow','layer'])str(c[k],c.id+'.'+k);for(const k of ['inputs','outputs']){arr(c[k],k);c[k].forEach(x=>str(x,k));}if(!['process','decision','start','end'].includes(c.kind))fail(c.id+': kind inválido');for(const k of ['row','col'])if(!Number.isInteger(c[k])||c[k]<0||c[k]>30)fail(c.id+': posição inválida');const cell=c.row+':'+c.col;if(cells.has(cell))fail('nós sobrepostos');cells.add(cell);}
 for(const c of s.connections){if(!cp.has(c.from)||!cp.has(c.to)||c.from===c.to)fail(c.id+': conexão inválida');str(c.label,c.id+'.label');}
 for(const t of s.tasks){str(t.owner,t.id+'.owner');if(t.chatId!==null&&!ch.has(t.chatId))fail(t.id+': chat inexistente');refs(t.componentIds,cp,t.id+'.componentIds');refs(t.blockedBy,ids('issues'),t.id+'.blockedBy');}
 for(const c of s.chats)for(const k of ['owner','recommendedModel','recommendedEffort','effectiveModel','effectiveEffort'])str(c[k],c.id+'.'+k);
 for(const e of s.evidence){for(const k of ['source','result'])str(e[k],e.id+'.'+k);refs(e.supports,all,e.id+'.supports');if(!['source','runtime','review'].includes(e.kind))fail(e.id+': evidence kind');if(!Number.isInteger(e.revision)||e.revision<1||e.revision>s.revision)fail(e.id+': revisão inválida');}
 for(const g of groups.filter(g=>g!=='evidence'))for(const o of s[g])if(o.status==='verificado'&&!o.evidenceIds.some(id=>{const e=s.evidence.find(e=>e.id===id);return e.status==='verificado'&&e.supports.includes(o.id)}))fail(o.id+': verificado exige evidência verificada correspondente; reabra o item se a prova foi invalidada');
 for(const d of [...s.decisions,...s.issues,...s.changes])str(d.detail,d.id+'.detail');
 return s;
}
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const digest=s=>crypto.createHash('sha256').update(JSON.stringify(s)).digest('hex');
// Row gaps and column gutters are free even when neighbouring cells are occupied.
// Labels reserve boxes in those gaps; an exterior gutter is added only when needed.
export function layoutFlow(nodes,edges){
 const boxes=nodes.map(n=>({id:n.id,x:n.col*340+(n.kind==='decision'?20:30),y:n.row*200+(n.kind==='decision'?25:30),width:n.kind==='decision'?280:260,height:n.kind==='decision'?120:110}));
 const byId=new Map(boxes.map(b=>[b.id,b])),reserved=[];
 const overlap=(a,b,pad=0)=>a.x<b.x+b.width+pad&&a.x+a.width+pad>b.x&&a.y<b.y+b.height+pad&&a.y+a.height+pad>b.y;
 const compress=points=>{const out=[];for(const p of points){if(out.length&&out.at(-1)[0]===p[0]&&out.at(-1)[1]===p[1])continue;while(out.length>1){const a=out.at(-2),b=out.at(-1);if((a[0]===b[0]&&b[0]===p[0])||(a[1]===b[1]&&b[1]===p[1]))out.pop();else break;}out.push(p);}return out;};
 const linesFor=value=>{const chars=Array.from(value),lines=[];while(chars.length&&lines.length<3){let take=Math.min(11,chars.length);if(chars.length>11){const space=chars.slice(0,12).lastIndexOf(' ');if(space>2)take=space;}let line=chars.splice(0,take).join('').trim();while(chars[0]===' ')chars.shift();if(lines.length===2&&chars.length)line=Array.from(line).slice(0,10).join('')+'…';lines.push(line);}return lines;};
 let width=Math.max(600,...boxes.map(b=>b.x+b.width+30)),height=Math.max(240,...nodes.map(n=>n.row*200+220));
 const routed=[];
 for(const e of edges){
  const a=nodes.find(n=>n.id===e.from),b=nodes.find(n=>n.id===e.to),ab=byId.get(e.from),bb=byId.get(e.to),ax=a.col*340+160,bx=b.col*340+160,ay=ab.y+ab.height,by=bb.y,sourceGap=a.row*200+205,targetGap=b.row*200+5;
  const lines=linesFor(e.label),labelWidth=154;
  function placeLabel(x,y){const box={x,y:y-55,width:labelWidth,height:52};if(box.x<8||box.y<8||boxes.some(b=>overlap(box,b,4))||reserved.some(b=>overlap(box,b,8)))return null;return {...box,lines,baseline:y-8-(lines.length-1)*16};}
  let points,label;
  // A forward vertical path is safe only if no intermediate node blocks it.
  const vertical={x:ax-2,y:ay+1,width:4,height:Math.max(0,by-ay-2)};
  if(ax===bx&&by>ay&&!boxes.filter(b=>b.id!==a.id&&b.id!==e.to).some(b=>overlap(vertical,b,5))){
   for(const y of [sourceGap,targetGap]){for(const x of [ax+10,ax-labelWidth-10]){label=placeLabel(x,y);if(label)break;}if(label)break;}
   if(label)points=[[ax,ay],[bx,by]];
  }
  if(!points){
   const gutters=[10,...new Set(nodes.map(n=>n.col*340+330))].sort((x,y)=>(Math.abs(ax-x)+Math.abs(bx-x))-(Math.abs(ax-y)+Math.abs(bx-y)));
   // There is always a free label slot further outside the occupied columns.
   const exterior=Math.max(600,...boxes.map(b=>b.x+b.width))+190;
   for(let i=0;i<=edges.length;i++)gutters.push(exterior+i*180);
   for(const gutter of gutters){
    for(const [left,right,y]of [[ax,gutter,sourceGap],[gutter,bx,targetGap]]){
     const lo=Math.min(left,right)+8,hi=Math.max(left,right)-labelWidth-8;
     if(lo>hi)continue;
     const positions=[(lo+hi)/2,lo,hi];for(let x=lo;x<hi;x+=180)positions.push(x);
     for(const x of positions){label=placeLabel(x,y);if(label)break;}if(label)break;
    }
    if(label){points=compress([[ax,ay],[ax,sourceGap],[gutter,sourceGap],[gutter,targetGap],[bx,targetGap],[bx,by]]);break;}
   }
  }
  if(!points||!label)throw Error('Não foi possível rotear '+e.id+'; separe fluxos/camadas.');
  reserved.push(label);width=Math.max(width,label.x+label.width+20,...points.map(p=>p[0]+20));height=Math.max(height,label.y+label.height+20,...points.map(p=>p[1]+20));
  routed.push({id:e.id,points,label});
 }
 return {width,height,boxes,edges:routed};
}
export function summary(s){return `# ${s.title}\n\nRevisão ${s.revision} • ${s.projectId} • SHA256 ${digest(s)}\n\n${s.objective}\n\nDono do estado: ${s.stateOwner}. Custo total: desconhecido (sem telemetria).\n\nPróximo passo: ${s.nextStep}\n\n`+['tasks','criteria','issues'].map(g=>`## ${g}\n\n`+s[g].map(x=>`- ${x.id} [${x.status}] ${x.title}${x.owner?' — '+x.owner:''}; evidências: ${x.evidenceIds.join(', ')||'pendentes'}`).join('\n')).join('\n\n')+'\n\nMapa e detalhes: HTML derivado desta mesma revisão.\n';}
export function html(s){
 layoutFlow(s.components,s.connections);
 const data=JSON.stringify(s).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
 return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'"><title>${esc(s.title)}</title><style>
*{box-sizing:border-box}body{margin:0;background:#101827;color:#edf3ff;font:16px/1.5 system-ui}main{max-width:1250px;margin:auto;padding:24px;overflow:clip}h1{font-size:clamp(24px,4vw,38px);line-height:1.2}h2{font-size:22px}p{overflow-wrap:anywhere}button,select{font:inherit;color:inherit;background:#20334e;border:1px solid #8297b6;border-radius:6px;padding:8px}label{display:inline-block;margin:5px 10px 10px 0}a{color:#abdfff}section,aside{margin:20px 0;padding:18px;border:1px solid #4a5e7c;border-radius:12px}.map{overflow:auto;background:#142137;border:1px solid #617592;border-radius:8px;max-height:70vh}svg{display:block}.node{cursor:pointer}.node rect,.node polygon{fill:#243b59;stroke:#a8c7ec;stroke-width:2}.node:focus{outline:none}.node:focus rect,.node:focus polygon,.selected rect,.selected polygon{stroke:#ffdc85;stroke-width:4}svg text{fill:#f5f8ff;font:14px system-ui}.edge{stroke:#a9c6e9;stroke-width:2;fill:none}.edge-label{paint-order:stroke;stroke:#142137;stroke-width:5px;stroke-linejoin:round}li{margin:8px 0;overflow-wrap:anywhere}.muted{color:#c0cde0}.detail-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px}summary{cursor:pointer}small{overflow-wrap:anywhere}@media(max-width:600px){main{padding:12px}.detail-grid{display:block}section,aside{padding:12px}.map{max-height:60vh}}
</style></head><body><main><h1>${esc(s.title)}</h1><p>${esc(s.objective)}</p><p class="muted">Revisão ${s.revision} • ${esc(s.projectId)} • dono: ${esc(s.stateOwner)}</p><p><strong>Próximo marco:</strong> ${esc(s.nextStep)}</p><p>Atualização por marcos. Custo total desconhecido; sem métricas de consumo.</p><section><h2>Visão geral · fluxograma</h2><p>Selecione um bloco por clique ou teclado. Setas indicam direção e rótulo da relação. Arraste a barra para percorrer mapas largos.</p><label>Fluxo <select id="flow"><option value="">Todos</option></select></label><label>Camada <select id="layer"><option value="">Todas</option></select></label><p class="muted">Estados: planejado · observado · inferido · verificado · desatualizado · pendente. O texto identifica o estado, além da cor.</p><div class="map" tabindex="0" aria-label="Fluxograma navegável"><svg id="graph" role="img" aria-label="Fluxograma do projeto"></svg></div></section><aside id="detail" aria-live="polite"><h2>Detalhes do componente</h2><p>Selecione um bloco no fluxograma.</p></aside><div class="detail-grid"><section><h2>Prioridades e tarefas</h2><div id="tasks"></div></section><section><h2>Critérios e validações</h2><div id="criteria"></div></section></div><details><summary>Decisões, bloqueios, chats, evidências e mudanças</summary><div id="records"></div></details><footer><small>Derivado de project-state.json • SHA256 ${digest(s)} • sem rede ou dependências externas</small></footer></main><script>
const state=${data};
const layoutFlow=${layoutFlow.toString()};
const $=id=>document.getElementById(id), ns='http://www.w3.org/2000/svg';
function el(tag,text,parent){const x=document.createElement(tag);if(text!==undefined)x.textContent=text;if(parent)parent.append(x);return x;}
function svg(tag,attrs,parent){const x=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))x.setAttribute(k,v);if(parent)parent.append(x);return x;}
function evidence(parent,ids){for(const id of ids){const e=state.evidence.find(x=>x.id===id);el('p',e.id+' ['+e.status+'] '+e.kind+' · r'+e.revision+' · '+e.source+' → '+e.result,parent);}if(!ids.length)el('p','Evidência pendente.',parent);}
function select(c){$('detail').replaceChildren();el('h2',c.title,$('detail'));el('p',c.id+' ['+c.status+'] · '+c.flow+' / '+c.layer,$('detail'));el('p','Responsabilidade: '+c.responsibility,$('detail'));el('p','Entradas: '+c.inputs.join('; '),$('detail'));el('p','Saídas: '+c.outputs.join('; '),$('detail'));el('h3','Relações',$('detail'));for(const e of state.connections.filter(e=>e.from===c.id||e.to===c.id)){el('p',e.id+' ['+e.status+'] '+e.from+' → '+e.to+': '+e.label,$('detail'));evidence($('detail'),e.evidenceIds);}el('h3','Evidências do componente',$('detail'));evidence($('detail'),c.evidenceIds);document.querySelectorAll('.node').forEach(n=>n.classList.toggle('selected',n.dataset.id===c.id));}
function draw(){const g=$('graph');g.replaceChildren();const nodes=state.components.filter(c=>(!$('flow').value||c.flow===$('flow').value)&&(!$('layer').value||c.layer===$('layer').value));const visible=new Set(nodes.map(n=>n.id));const edges=state.connections.filter(e=>visible.has(e.from)&&visible.has(e.to));const layout=layoutFlow(nodes,edges);g.setAttribute('width',layout.width);g.setAttribute('height',layout.height);g.setAttribute('viewBox','0 0 '+layout.width+' '+layout.height);const defs=svg('defs',{},g),marker=svg('marker',{id:'arrow',viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:7,markerHeight:7,orient:'auto-start-reverse'},defs);svg('path',{d:'M 0 0 L 10 5 L 0 10 z',fill:'#a9c6e9'},marker);
layout.edges.forEach(route=>{const e=edges.find(e=>e.id===route.id),d=route.points.map((p,i)=>(i?'L ':'M ')+p[0]+' '+p[1]).join(' ');const edge=svg('path',{d,class:'edge','data-edge-id':e.id,'marker-end':'url(#arrow)'},g);svg('title',{},edge).textContent=e.id+' ['+e.status+'] '+e.from+' → '+e.to+': '+e.label;});
layout.edges.forEach(route=>{const e=edges.find(e=>e.id===route.id),l=route.label;const group=svg('g',{'data-label-id':e.id},g);svg('rect',{x:l.x-3,y:l.y,width:l.width+6,height:l.height,rx:4,fill:'#142137'},group);const t=svg('text',{x:l.x+l.width/2,y:l.baseline,class:'edge-label','text-anchor':'middle'},group);l.lines.forEach((line,i)=>{svg('tspan',{x:l.x+l.width/2,dy:i?16:0},t).textContent=line;});svg('title',{},group).textContent=e.id+': '+e.label;});
nodes.forEach(c=>{const x=c.col*340+30,y=c.row*200+30,n=svg('g',{class:'node',tabindex:0,role:'button','aria-label':c.title+' ['+c.status+']','data-id':c.id},g);if(c.kind==='decision')svg('polygon',{points:(x+130)+','+(y-5)+' '+(x+270)+','+(y+55)+' '+(x+130)+','+(y+115)+' '+(x-10)+','+(y+55)},n);else svg('rect',{x,y,width:260,height:110,rx:c.kind==='start'||c.kind==='end'?45:10},n);const lines=[c.title,c.status,c.id];lines.forEach((t,i)=>{const tt=svg('text',{x:x+130,y:y+35+i*25,'text-anchor':'middle'},n);tt.textContent=t.length>30?t.slice(0,27)+'…':t;});svg('title',{},n).textContent=c.title+' — '+c.responsibility;n.addEventListener('click',()=>select(c));n.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(c);}});});}
for(const k of ['flow','layer']){for(const value of [...new Set(state.components.map(x=>x[k]))]){const o=el('option',value,$(k));o.value=value;}$(k).addEventListener('change',draw);}
for(const group of ['tasks','criteria','decisions','issues','chats','evidence','changes']){const parent=group==='tasks'||group==='criteria'?$(group):el('section',undefined,$('records'));if(parent.id!=='tasks'&&parent.id!=='criteria')el('h2',({decisions:'Decisões',issues:'Bloqueios e problemas',chats:'Chats e responsáveis',evidence:'Evidências',changes:'Mudanças'})[group],parent);for(const r of state[group]){el('h3',r.title+' ['+r.status+']',parent);el('p',r.id+(r.detail?' · '+r.detail:'')+(r.owner?' · dono: '+r.owner:'')+(r.chatId?' · chat: '+r.chatId:''),parent);if(r.blockedBy?.length)el('p','Bloqueios: '+r.blockedBy.join(', '),parent);if(group==='chats')el('p','Recomendado: '+r.recommendedModel+'/'+r.recommendedEffort+'; efetivo: '+r.effectiveModel+'/'+r.effectiveEffort,parent);if(group==='evidence')el('p',r.kind+' · '+r.source+' → '+r.result,parent);else evidence(parent,r.evidenceIds);}}
draw();
</script></body></html>`;
}

export function generate(input,outDir,htmlName='project-map.html'){
 const s=validate(JSON.parse(fs.readFileSync(input,'utf8').replace(/^\uFEFF/,'')));
 if(path.basename(htmlName)!==htmlName||!htmlName.endsWith('.html'))fail('html-name deve ser nome simples .html');
 const receipt=path.join(outDir,'.project-state-receipt.json');
 const entityTypes=Object.fromEntries(groups.flatMap(g=>s[g].map(x=>[x.id,g]))),warnings=[];
 let identityBaselineRevision=s.revision,identityHistoryBeforeBaseline='not-recorded';
 if(fs.existsSync(receipt)){
  const old=JSON.parse(fs.readFileSync(receipt,'utf8'));
  if(!Array.isArray(old.ids)||old.ids.some(id=>typeof id!=='string')||new Set(old.ids).size!==old.ids.length||!Array.isArray(old.changes)||!Number.isSafeInteger(old.revision)||old.revision<1||typeof old.hash!=='string'||!/^[a-f0-9]{64}$/.test(old.hash))fail('Recibo de continuidade inválido');
  if(old.projectId!==s.projectId)fail('projeto diferente no destino');
  if(s.revision<old.revision||(s.revision===old.revision&&digest(s)!==old.hash))fail('incremente revisão para alterar estado');
  if(old.receiptVersion===undefined){
   if(s.revision!==old.revision||digest(s)!==old.hash)fail('Recibo legado sem tipos: regenere primeiro o JSON original da revisão '+old.revision+' no mesmo destino; não é possível garantir continuidade de tipos retroativa.');
   warnings.push('Recibo legado migrado: associação ID→coleção estabelecida nesta revisão; identidade anterior não comprovada.');
   identityHistoryBeforeBaseline='unverified';
  }else if(old.receiptVersion===2&&old.entityTypes&&typeof old.entityTypes==='object'&&!Array.isArray(old.entityTypes)){
   if(Object.keys(old.entityTypes).length!==old.ids.length||!Number.isSafeInteger(old.identityBaselineRevision)||old.identityBaselineRevision<1||old.identityBaselineRevision>old.revision||!['not-recorded','unverified'].includes(old.identityHistoryBeforeBaseline))fail('Recibo v2 incompleto/inválido');
   for(const [id,type]of Object.entries(old.entityTypes)){if(!groups.includes(type))fail('Tipo inválido no recibo: '+id);if(entityTypes[id]&&entityTypes[id]!==type)fail('Tipo/coleção de ID alterado: '+id+' ('+type+' → '+entityTypes[id]+'); mantenha entidade antiga desatualizada e use novo ID.');}
   if(old.ids.some(id=>!Object.hasOwn(old.entityTypes,id)))fail('Recibo incompleto: ID sem tipo');
   identityBaselineRevision=old.identityBaselineRevision;identityHistoryBeforeBaseline=old.identityHistoryBeforeBaseline;
  }else fail('Versão/formato de recibo não suportado');
  for(const id of old.ids)if(!Object.hasOwn(entityTypes,id))fail('ID removido: '+id+'; marque desatualizado');
  for(const c of old.changes)if(!s.changes.some(x=>JSON.stringify(x)===JSON.stringify(c)))fail('histórico alterado: '+c.id);
 }
 // All validation and rendering occur before writes. Validation errors preserve previous outputs.
 const files=[[htmlName,html(s)],['PROJECT_STATE.md',summary(s)],['.project-state-receipt.json',JSON.stringify({receiptVersion:2,projectId:s.projectId,revision:s.revision,hash:digest(s),ids:Object.keys(entityTypes),entityTypes,identityBaselineRevision,identityHistoryBeforeBaseline,changes:s.changes},null,2)]];
 fs.mkdirSync(outDir,{recursive:true}); const previous=files.map(([n])=>{const f=path.join(outDir,n);return fs.existsSync(f)?fs.readFileSync(f):null});
 try{for(const [n,data]of files)fs.writeFileSync(path.join(outDir,n+'.tmp'),data);for(const [n]of files)fs.renameSync(path.join(outDir,n+'.tmp'),path.join(outDir,n));}
 catch(e){for(let i=0;i<files.length;i++){const f=path.join(outDir,files[i][0]);if(previous[i]===null)fs.rmSync(f,{force:true});else fs.writeFileSync(f,previous[i]);fs.rmSync(f+'.tmp',{force:true});}throw e;}
 return {revision:s.revision,hash:digest(s),html:path.resolve(outDir,htmlName),warnings,identityBaselineRevision,identityHistoryBeforeBaseline};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){try{const [cmd,input,outDir,...rest]=process.argv.slice(2);if(cmd==='validate'&&input&&!outDir){validate(JSON.parse(fs.readFileSync(input,'utf8').replace(/^\uFEFF/,'')));console.log('Estado válido');}else if(cmd==='render'&&input&&outDir&&(rest.length===0||(rest.length===2&&rest[0]==='--html-name'))){console.log(JSON.stringify(generate(input,outDir,rest[1]),null,2));}else fail('Uso: node project-state.mjs validate <estado.json> | render <estado.json> <diretório> [--html-name mapa.html]');}catch(e){console.error(e.message);process.exitCode=1;}}
