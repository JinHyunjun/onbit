import test from 'node:test';
import assert from 'node:assert/strict';
import { recommendations, photoQuality } from '../src/core.js';
test('reject empty, dark and clipped photos', () => {
  assert.equal(photoQuality(new Uint8Array()).ok, false);
  assert.equal(photoQuality(new Uint8Array([0,0,0,255])).ok, false);
  assert.equal(photoQuality(new Uint8Array([255,255,255,255])).ok, false);
  assert.equal(photoQuality(new Uint8Array([140,110,90,255])).ok, true);
});
test('cold rain recommends protection and selected palette', () => {
  const looks = recommendations({temperature: 2,rain:true,purpose:'work',palette:'winter'});
  assert.equal(looks.length,3); assert.match(looks[0].layer,/두꺼운/); assert.match(looks[0].extra,/우산/); assert.match(looks[0].reason,/겨울/);
});
test('hot weather excludes warm wardrobe items', () => {
  const looks = recommendations({temperature:30,rain:false,purpose:'daily',palette:'spring',wardrobe:[{name:'두꺼운 니트',category:'top',warmth:'warm',color:'#F1A998'}]});
  assert.ok(looks.every(look=>!look.owned.includes('두꺼운 니트'))); assert.match(looks[0].top,/반팔/);
});
test('use existing suitable wardrobe clothing', () => {
  const looks = recommendations({temperature:18,rain:false,purpose:'daily',palette:'winter',wardrobe:[{name:'네이비 셔츠',category:'top',warmth:'all',color:'#334760'}]});
  assert.equal(looks[0].top,'네이비 셔츠'); assert.deepEqual(looks[0].owned,['네이비 셔츠']);
});
test('invalid temperature and prototype names rejected', () => {
  for (const temperature of [NaN,Infinity,-41,51]) assert.throws(()=>recommendations({temperature,palette:'spring'}));
  assert.throws(()=>recommendations({temperature:18,palette:'constructor'}));
});
