import test from 'node:test';
import assert from 'node:assert/strict';
import {mapMembers,renderFamilyMap} from '../mobile/map.js';
import {readFileSync} from 'node:fs';
const member={id:'member',name:'Pessoa <teste>',linked:1,adult:0,consent:1,lat:38.87654,lng:-9.01234,accuracy:10,updated:'2026-11-05T14:00:00Z'};
const data=(patch={})=>({role:'admin',family:{name:'Família'},members:[member],...patch});
test('native family map requires family administrator and a valid authorized position',()=>{
 assert.equal(mapMembers(data({role:'member'})).length,0);assert.equal(mapMembers(data({family:null})).length,0);
 for(const patch of [{consent:0},{lat:null},{updated:null}]){const d=data({members:[{...member,...patch}]});assert.equal(mapMembers(d).length,0);const html=renderFamilyMap(d,{loaded:true});assert.doesNotMatch(html,/38\.87654|-9\.01234|marker=/);assert.match(html,/sem posições de familiares/);}
 const denied=renderFamilyMap(data({role:'member'}),{loaded:true});assert.doesNotMatch(denied,/<iframe|38\.87654/);
});
test('native map sends positions to map provider only after an explicit map action and escapes names',()=>{
 const initial=renderFamilyMap(data());assert.match(initial,/Carregar mapa OpenStreetMap/);assert.doesNotMatch(initial,/<iframe/);assert.match(initial,/Pessoa &lt;teste&gt;/);
 const loaded=renderFamilyMap(data(),{loaded:true,selectedId:member.id});assert.match(loaded,/<iframe/);assert.match(loaded,/marker=38\.87654%2C-9\.01234/);assert.match(loaded,/referrerpolicy="no-referrer"/);
});
test('missing positions have a clear empty state and only the exact map origin is allowed in native frames',()=>{
 const html=renderFamilyMap(data({members:[]}));assert.match(html,/Sem localizações recebidas/);assert.match(html,/Ver mapa sem localizações/);assert.doesNotMatch(html,/<iframe/);
 const csp=readFileSync('mobile/index.html','utf8');assert.match(csp,/frame-src https:\/\/www\.openstreetmap\.org;/);assert.doesNotMatch(csp,/frame-src \*/);
});
