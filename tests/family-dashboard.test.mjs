import test from 'node:test';
import assert from 'node:assert/strict';
import {familySummary,hasPosition,locationState,mapLinks,ageLabel,LOCATION_RECENT_MS} from '../lib/family-status.js';
const now=Date.parse('2026-11-05T13:00:00Z');
const person={id:'a',name:'Familiar',linked:true,adult:1,consent:1,lat:38.87,lng:-9.07,updated:new Date(now).toISOString()};
test('dashboard distinguishes missing account, consent, first reading and old positions',()=>{
 assert.equal(locationState({...person,linked:false},now).key,'access');
 assert.equal(locationState({...person,consent:0},now).key,'sharing');
 assert.equal(locationState({...person,updated:null},now).key,'waiting');
 assert.equal(locationState(person,now).key,'recent');
 assert.equal(locationState(person,now+LOCATION_RECENT_MS+1).key,'old');
 assert.equal(locationState({...person,updated:'2026-11-05T13:10:00Z'},now).key,'old');
 assert.equal(ageLabel('invalid',now),'Ainda sem atualização');
});
test('hidden, invalid and unavailable positions never produce external map URLs',()=>{
 for(const patch of [{consent:0},{lat:null},{lng:Infinity},{lat:91},{lng:-181},{updated:'invalid'}]){const p={...person,...patch};assert.equal(hasPosition(p),false);assert.equal(mapLinks(p),null);}
 const polar=mapLinks({...person,lat:90,lng:180});const bbox=new URL(polar.embed).searchParams.get('bbox').split(',').map(Number);assert.ok(bbox[2]<=180&&bbox[3]<=90);
});
test('fresh readings and pending steps count independently of consent or account totals',()=>{
 const result=familySummary([person,{...person,id:'b',linked:false},{...person,id:'c',consent:0},{...person,id:'d',updated:'2026-11-04T13:00:00Z'}],now);
 assert.equal(result.recent,1);assert.equal(result.pending,3);
});
test('real admin dashboard renders setup and SOS without exposing a revoked position or loading third-party maps',async()=>{
 const {transformWithEsbuild}=await import('vite');const {mkdtemp,writeFile,readFile,rm,mkdir}=await import('node:fs/promises');const {pathToFileURL}=await import('node:url');const {resolve}=await import('node:path');
 const React=await import('react');const {renderToStaticMarkup}=await import('react-dom/server');
 await mkdir('outputs',{recursive:true});const dir=await mkdtemp(resolve('outputs/family-ui-'));
 try{
  const source=(await readFile('app/family-dashboard.jsx','utf8')).replace("'../lib/family-status'","'../../lib/family-status.js'").replace("'../lib/device/battery'","'../../lib/device/battery.js'");
  const {code}=await transformWithEsbuild(source,'family-dashboard.jsx',{loader:'jsx',jsx:'automatic'});const path=resolve(dir,'component.mjs');await writeFile(path,code);
  const {default:Dashboard}=await import(pathToFileURL(path).href);
  const revoked={...person,consent:0,lat:12.34567,lng:76.54321};
  const html=renderToStaticMarkup(React.createElement(Dashboard,{family:{name:'Família teste',seats:6},members:[revoked],self:revoked,events:[{id:'sos',name:'Familiar',kind:'sos',status:'open',created:new Date(now).toISOString()}],active:true,busy:false}));
  assert.match(html,/Um familiar pediu ajuda/);assert.match(html,/Autorizar partilha/);assert.match(html,/Ver configuração/);assert.match(html,/Bateria indisponível/);assert.doesNotMatch(html,/12\.34567|76\.54321|<iframe|Demonstração|Vista dos pais/);
  const ready=renderToStaticMarkup(React.createElement(Dashboard,{family:{name:'Família teste',seats:6},members:[person],self:person,events:[],active:true,busy:false}));assert.match(ready,/Carregar mapa OpenStreetMap/);assert.doesNotMatch(ready,/<iframe/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
