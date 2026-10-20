import fs from 'node:fs';

export function presentationRows(p){const rows=[];for(const id of p.mainPath){rows.push({id,main:true});for(const b of p.branches.filter(b=>b.after===id))for(const id of b.componentIds)rows.push({id,main:false});}return rows;}
export function planPresentationRoutes(s,p){
 const rows=presentationRows(p),index=new Map(rows.map((r,i)=>[r.id,i]));
 const routes=s.connections.filter(e=>index.has(e.from)&&index.has(e.to)).map(e=>{const from=index.get(e.from),to=index.get(e.to);return {id:e.id,from:e.from,to:e.to,fromIndex:from,toIndex:to,direct:to===from+1,preferred:to<=from?1:0,low:Math.min(from+.5,to-.5),high:Math.max(from+.5,to-.5)};});
 const detours=routes.filter(r=>!r.direct),adj=new Map(detours.map(r=>[r.id,[]]));
 const sharedRole=(a,b)=>a.from===b.from||a.to===b.to;
 for(let i=0;i<detours.length;i++)for(let j=i+1;j<detours.length;j++){
  const a=detours[i],b=detours[j],cross=a.low<b.low&&b.low<a.high&&a.high<b.high||b.low<a.low&&a.low<b.high&&b.high<a.high;
  const touch=a.high===b.low||b.high===a.low,equal=a.low===b.low&&a.high===b.high;
  if(cross||!sharedRole(a,b)&&(touch||equal)){adj.get(a.id).push(b.id);adj.get(b.id).push(a.id);}
 }
 const byId=new Map(detours.map(r=>[r.id,r])),colors=new Map();
 for(const r of detours){if(colors.has(r.id))continue;const group=[],queue=[r.id];colors.set(r.id,0);
  while(queue.length){const id=queue.shift();group.push(id);for(const next of adj.get(id)){const want=1-colors.get(id);if(colors.has(next)){if(colors.get(next)!==want)throw Error('O resumo tem retornos que não podem ser separados neste fluxo vertical. Escolha um caminho principal menor e mantenha as demais relações no mapa completo.');}else{colors.set(next,want);queue.push(next);}}}
  const cost=flip=>group.filter(id=>(colors.get(id)^flip)!==byId.get(id).preferred).length,flip=cost(1)<cost(0)?1:0;for(const id of group)byId.get(id).side=(colors.get(id)^flip)?'right':'left';
 }
 for(const side of ['left','right']){
  const group=detours.filter(r=>r.side===side).sort((a,b)=>(b.high-b.low)-(a.high-a.low)||a.low-b.low||a.id.localeCompare(b.id));
  group.forEach((r,i)=>{const containers=group.slice(0,i).filter(a=>a.low<=r.low&&a.high>=r.high);r.track=containers.length?Math.max(...containers.map(a=>a.track))+1:0;const port=group.length===1?.75:.62+.16*(group.length-i)/group.length;r.portFraction=side==='right'?port:1-port;r.laneInset=7+r.track*10;});
 }
 const extra=Math.max(0,...detours.map(r=>r.track))*10;
 if(292-2*(25+extra)-8<170)throw Error('O resumo tem retornos demais para uma leitura clara no celular. Escolha um caminho menor; preserve os demais percursos no mapa completo.');
 const topPadding=detours.some(r=>r.toIndex===0)?52:0,bottomPadding=detours.some(r=>r.fromIndex===rows.length-1)?52:0;
 const hit=(a,b,c,d)=>{if(a[0]===b[0]&&c[1]===d[1])return a[0]>=Math.min(c[0],d[0])&&a[0]<=Math.max(c[0],d[0])&&c[1]>=Math.min(a[1],b[1])&&c[1]<=Math.max(a[1],b[1]);if(a[1]===b[1]&&c[0]===d[0])return hit(c,d,a,b);if(a[0]===b[0]&&c[0]===d[0])return a[0]===c[0]&&Math.max(Math.min(a[1],b[1]),Math.min(c[1],d[1]))<=Math.min(Math.max(a[1],b[1]),Math.max(c[1],d[1]));return a[1]===c[1]&&Math.max(Math.min(a[0],b[0]),Math.min(c[0],d[0]))<=Math.min(Math.max(a[0],b[0]),Math.max(c[0],d[0]));};
 // Topology is checked before any output write. The client projects the same plan
 // onto measured boxes; variable text height preserves the ordering of row gaps.
 for(const width of [292,740]){
  const pad=(width===292?25:40)+extra,branch=width===292?4:12;
  const boxes=rows.map((r,i)=>({x:pad+(r.main?0:branch),y:topPadding+i*152,w:width-2*(pad+(r.main?0:branch)),h:100}));
  const paths=routes.map(r=>{const a=boxes[r.fromIndex],b=boxes[r.toIndex],ay=a.y+a.h,by=b.y;if(r.direct)return [[a.x+a.w/2,ay],[b.x+b.w/2,by]];const sx=a.x+a.w*r.portFraction,tx=b.x+b.w*r.portFraction,lane=r.side==='right'?width-r.laneInset:r.laneInset;return [[sx,ay],[sx,ay+26],[lane,ay+26],[lane,by-13],[tx,by-13],[tx,by]];});
  for(let i=0;i<routes.length;i++)for(let j=i+1;j<routes.length;j++){if(sharedRole(routes[i],routes[j]))continue;for(let a=1;a<paths[i].length;a++)for(let b=1;b<paths[j].length;b++)if(hit(paths[i][a-1],paths[i][a],paths[j][b-1],paths[j][b]))throw Error('Os percursos '+routes[i].id+' e '+routes[j].id+' se cruzam no resumo. Escolha um caminho menor ou separe o fluxo; o mapa completo preserva as relações.');}
 }
 return {rows,routes,extra,topPadding,bottomPadding};
}

export function pendingItems(s){return [...s.criteria,...s.tasks,...s.issues].filter(item=>item.status!=='verificado');}

const text=(v,name,max=400)=>{if(typeof v!=='string'||!v.trim()||v.length>max)throw Error(name+': escreva texto não vazio até '+max+' caracteres');};
export function validatePresentation(s){
 const p=s.presentation;
 // Older projects may carry unrelated presentation metadata; preserve it verbatim.
 if(!p||typeof p!=='object'||p.schemaVersion===undefined)return;
 if(p.schemaVersion!==1)throw Error('presentation.schemaVersion não suportado');
 for(const k of ['title','intro','nextStep'])text(p[k],'presentation.'+k,k==='title'?100:400);
 const ids=new Set(s.components.map(c=>c.id)),visible=new Set();
 const path=(value,name)=>{if(!Array.isArray(value)||!value.length||value.length>300)throw Error(name+': lista não vazia de componentes');for(const id of value){if(!ids.has(id)||visible.has(id))throw Error(name+': componente inexistente/repetido '+id);visible.add(id);}for(let i=1;i<value.length;i++)if(!s.connections.some(e=>e.from===value[i-1]&&e.to===value[i]))throw Error(name+': sequência sem conexão dirigida correspondente');};
 path(p.mainPath,'presentation.mainPath');
 if(!Array.isArray(p.branches)||p.branches.length>300)throw Error('presentation.branches: lista obrigatória');
 for(const branch of p.branches){if(!p.mainPath.includes(branch.after))throw Error('Ramo precisa sair de uma etapa principal');path(branch.componentIds,'presentation.branches.componentIds');if(!s.connections.some(e=>e.from===branch.after&&e.to===branch.componentIds[0]))throw Error('Ramo sem conexão dirigida com sua origem');}
 if(!p.componentText||typeof p.componentText!=='object'||Array.isArray(p.componentText))throw Error('presentation.componentText: objeto obrigatório');
 for(const [id,copy]of Object.entries(p.componentText)){if(!ids.has(id))throw Error('Texto para componente inexistente');for(const k of ['title','description'])text(copy?.[k],id+'.'+k,k==='title'?90:220);for(const k of ['input','output'])if(copy[k]!==undefined)text(copy[k],id+'.'+k,220);}
 for(const id of visible)if(!p.componentText[id])throw Error('Falta explicação amigável para '+id);
 if(p.itemText!==undefined){if(!p.itemText||typeof p.itemText!=='object'||Array.isArray(p.itemText))throw Error('presentation.itemText inválido');const items=new Set([...s.tasks,...s.issues,...s.criteria].map(x=>x.id));for(const [id,copy]of Object.entries(p.itemText)){if(!items.has(id))throw Error('Texto para item inexistente');text(copy?.title,id+'.title',90);text(copy?.description,id+'.description',220);}}
 planPresentationRoutes(s,p);
}
export function presentationFor(s){
 validatePresentation(s);
 if(s.presentation?.schemaVersion===1)return {...s.presentation,fallback:false};
 const sorted=[...s.components].sort((a,b)=>a.row-b.row||a.col-b.col),start=sorted.find(c=>!s.connections.some(e=>e.to===c.id))||sorted[0];
 const mainPath=start?[start.id]:[];
 // An explicit warning, not a claim that the legacy topology/text was understood.
 while(mainPath.length&&mainPath.length<5){const next=s.connections.filter(e=>e.from===mainPath.at(-1));if(next.length!==1||mainPath.includes(next[0].to))break;mainPath.push(next[0].to);}
 const componentText=Object.fromEntries(s.components.map((c,i)=>[c.id,{title:'Parte '+(i+1)+' do projeto',description:'Selecione para ver o que foi encontrado. O responsável ainda precisa escrever uma explicação curta desta parte.'}]));
 return {schemaVersion:1,title:'Como o projeto está organizado',intro:'Este resumo ainda precisa de nomes e explicações escritos para quem vai usá-lo. Ele não substitui o mapa completo.',nextStep:'Peça ao responsável para escolher o caminho principal e escrever as explicações em linguagem comum.',mainPath,branches:[],componentText,itemText:{},fallback:true};
}
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderPresentation(s,{hash,layoutFlowSource}){
 const p=presentationFor(s);
 const plan=planPresentationRoutes(s,p),rows=plan.rows;
 const buttons=rows.map(({id,main})=>{const c=s.components.find(c=>c.id===id),copy=p.componentText[id];return `<button type="button" class="stage ${c.kind==='decision'?'choice':''} ${main?'':'branch'}" data-component="${esc(id)}" aria-pressed="false"><span class="step-tag">${main?'Etapa '+(p.mainPath.indexOf(id)+1):'Outro caminho'}</span><strong>${esc(copy.title)}</strong><span>${esc(copy.description)}</span></button>`;}).join('');
 const data=JSON.stringify(s).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
 const values={TITLE:esc(p.title),INTRO:esc(p.intro),NEXT:esc(p.nextStep),NOTICE:p.fallback?'<p class="notice">A apresentação ainda não foi preparada. O caminho abaixo é apenas um trecho sem ramificações escolhido pela ordem do arquivo; pode não representar o uso principal. Os dados originais continuam no mapa completo.</p>':'',STEPS:buttons,DATA:data,LAYOUT:layoutFlowSource,PRESENTATION:JSON.stringify(p).replace(/</g,'\\u003c'),PLAN:JSON.stringify(plan),PENDING:JSON.stringify(pendingItems(s).map(item=>item.id)),EXTRA:String(plan.extra),TOP:String(plan.topPadding),BOTTOM:String(plan.bottomPadding),HASH:hash,REVISION:String(s.revision)};
 return fs.readFileSync(new URL('../assets/project-map.html',import.meta.url),'utf8').replace(/%%([A-Z]+)%%/g,(_,key)=>values[key]);
}
