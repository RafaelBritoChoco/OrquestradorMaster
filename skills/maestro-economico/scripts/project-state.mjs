#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {validatePresentation,renderPresentation} from './project-presentation.mjs';

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
 validatePresentation(s);
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
 return renderPresentation(s,{hash:digest(s),layoutFlowSource:layoutFlow.toString()});
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
