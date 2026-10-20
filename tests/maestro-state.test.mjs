import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {generate,validate,layoutFlow} from '../skills/maestro-economico/scripts/project-state.mjs';
import {evaluate} from '../skills/maestro-economico/scripts/jev-evaluate.mjs';

const skill=new URL('../skills/maestro-economico/',import.meta.url);
const read=relative=>JSON.parse(fs.readFileSync(new URL(relative,skill),'utf8'));
const base=read('examples/new-project.json');
const names=['project-map.html','PROJECT_STATE.md','.project-state-receipt.json'];
function fixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'maestro-state-'));
 t.after(()=>{const resolved=path.resolve(dir);assert.equal(path.dirname(resolved),path.resolve(os.tmpdir()));assert(path.basename(resolved).startsWith('maestro-state-'));fs.rmSync(resolved,{recursive:true,force:true});});
 const input=path.join(dir,'state.json'),out=path.join(dir,'out');
 return {dir,input,out,save(s){fs.writeFileSync(input,JSON.stringify(s));},render(s){this.save(s);return generate(input,out);},bytes(){return names.map(n=>fs.readFileSync(path.join(out,n)));},unchanged(before){names.forEach((n,i)=>assert.deepEqual(fs.readFileSync(path.join(out,n)),before[i]));}};
}

test('both synthetic templates validate and the actual CLI creates/updates outputs',t=>{
 validate(base);validate(read('examples/existing-project.json'));
 const f=fixture(t),helper=fileURLToPath(new URL('scripts/project-state.mjs',skill));f.save(base);
 const command=()=>spawnSync(process.execPath,[helper,'render',f.input,f.out],{encoding:'utf8'});
 const first=command();assert.equal(first.status,0,first.stderr);const result=JSON.parse(first.stdout);
 assert(f.bytes().slice(0,2).every(b=>b.toString().includes(result.hash)));
 const next=structuredClone(base);next.revision=2;next.title='Synthetic second revision';f.save(next);assert.equal(command().status,0);
 const before=f.bytes();next.criteria[0].status='verificado';f.save(next);assert.notEqual(command().status,0);f.unchanged(before);
});

test('verified consumers reject invalidated proofs without losing outputs',t=>{
 const f=fixture(t);f.render(base);const before=f.bytes(),stale=structuredClone(base);
 stale.evidence.push({id:'proof-old',title:'Synthetic superseded test',status:'desatualizado',evidenceIds:[],source:'fixture:previous',result:'Invalidated after change',kind:'runtime',revision:1,supports:['c-build','t-build']});
 for(const c of [stale.components[1],stale.tasks[0]]){c.status='verificado';c.evidenceIds=['proof-old'];}
 assert.throws(()=>f.render(stale),/correspondente/);f.unchanged(before);
 stale.evidence.push({...stale.evidence[0],id:'proof-current',status:'verificado'});
 for(const c of [stale.components[1],stale.tasks[0]])c.evidenceIds.push('proof-current');validate(stale);
 stale.evidence[1].supports=[];assert.throws(()=>validate(stale),/correspondente/);
});

test('ID identity and history survive revisions; legacy migration is explicit',t=>{
 const f=fixture(t);f.render(base);const before=f.bytes(),moved=structuredClone(base);moved.revision=2;moved.issues.push(moved.decisions.shift());
 assert.throws(()=>f.render(moved),/Tipo\/coleção/);f.unchanged(before);
 const receiptPath=path.join(f.out,names[2]),receipt=JSON.parse(fs.readFileSync(receiptPath));
 fs.writeFileSync(receiptPath,JSON.stringify({projectId:receipt.projectId,revision:receipt.revision,hash:receipt.hash,ids:receipt.ids,changes:receipt.changes}));
 const legacyBytes=f.bytes();assert.throws(()=>f.render(moved),/Recibo legado/);f.unchanged(legacyBytes);
 const migration=f.render(base);assert.equal(migration.warnings.length,1);assert.equal(migration.identityHistoryBeforeBaseline,'unverified');
 assert.equal(JSON.parse(fs.readFileSync(receiptPath)).entityTypes['d-scope'],'decisions');
 assert.throws(()=>f.render(moved),/Tipo\/coleção/);
 const rewrite=structuredClone(base);rewrite.revision=2;rewrite.changes[0].detail='Overwritten history';assert.throws(()=>f.render(rewrite),/histórico alterado/);
});

test('recoverable write failure restores HTML, summary and receipt together',t=>{
 const f=fixture(t);f.render(base);const before=f.bytes(),next=structuredClone(base);next.revision=2;next.title='Synthetic update';
 const rename=fs.renameSync;let count=0;fs.renameSync=(...args)=>{if(++count===2)throw Error('synthetic write failure');return rename(...args);};
 try{assert.throws(()=>f.render(next),/synthetic write failure/);}finally{fs.renameSync=rename;}
 f.unchanged(before);
});

test('return and same-row branch avoid neighbouring blocks and label collisions',()=>{
 const s=structuredClone(base);s.components[3].row=2;s.components[4].row=3;
 s.connections=[{id:'edge-back',from:'c-review',to:'c-build',label:'retry'},{id:'edge-go',from:'c-review',to:'c-fix',label:'other work'}];
 const layout=layoutFlow(s.components,s.connections);
 const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
 for(const route of layout.edges){
  for(let i=1;i<route.points.length;i++){const a=route.points[i-1],b=route.points[i];assert(a[0]===b[0]||a[1]===b[1]);for(const box of layout.boxes){const hit=a[0]===b[0]?a[0]>box.x&&a[0]<box.x+box.width&&Math.max(Math.min(a[1],b[1]),box.y)<Math.min(Math.max(a[1],b[1]),box.y+box.height):a[1]>box.y&&a[1]<box.y+box.height&&Math.max(Math.min(a[0],b[0]),box.x)<Math.min(Math.max(a[0],b[0]),box.x+box.width);assert(!hit,route.id+' crosses '+box.id);}}
  for(const box of layout.boxes)assert(!overlap(route.label,box));
  const target=layout.boxes.find(n=>n.id===s.connections.find(e=>e.id===route.id).to);assert.deepEqual(route.points.at(-1),[target.x+target.width/2,target.y]);
 }
 assert(!overlap(layout.edges[0].label,layout.edges[1].label));
});

test('untrusted strings round-trip as inert JSON, not markup',t=>{
 const f=fixture(t),s=structuredClone(base);s.title='Synthetic </script><img src=x onerror=alert(1)>';s.components[0].title='<script>synthetic</script>';
 f.render(s);const html=fs.readFileSync(path.join(f.out,names[0]),'utf8');
 const embedded=JSON.parse(html.match(/const state=(.*);\nconst layoutFlow=/)[1]);assert.deepEqual(embedded,s);assert(!html.includes('<img src=x'));assert(html.includes("connect-src 'none'"));
});

test('optional Jev dry run never sends a request or needs a key',async()=>{
 let calls=0;const result=await evaluate(read('examples/jev-batch.json'),{env:{},fetchImpl:async()=>{calls++;throw Error('Network forbidden in synthetic test');}});
 assert.equal(calls,0);assert.equal(result.dryRun,true);assert.equal(result.telemetry.apiCalls,0);assert.equal(result.telemetry.reportedUsage,null);
});
