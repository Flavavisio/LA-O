import test from 'node:test';
import assert from 'node:assert/strict';
import {canManageSharing} from '../lib/sharing-policy.js';
test('Minor views expose no control over own or other sharing',()=>{
 const child={id:'minor',adult:0,role:'member'};
 assert.equal(canManageSharing(child,child),false);
 assert.equal(canManageSharing(child,{id:'minor2',adult:0,role:'member'}),false);
 assert.equal(canManageSharing(null,child),false);
});
test('Admins can manage minors; adult sharing stays self-managed',()=>{
 const admin={id:'parent',adult:1,role:'admin'},child={id:'child',adult:0,role:'member'},adult={id:'adult',adult:1,role:'member'};
 assert.equal(canManageSharing(admin,child),true);assert.equal(canManageSharing(adult,child),false);
 assert.equal(canManageSharing(admin,adult),false);assert.equal(canManageSharing(adult,adult),true);
});
