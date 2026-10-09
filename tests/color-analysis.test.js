import test from 'node:test';
import assert from 'node:assert/strict';
import { rgbToLab, samplePatch, combineSkinPatches, cheekRegions, estimatePersonalColor } from '../src/color-analysis.js';
const pixels = (rgb, count = 100) => new Uint8ClampedArray(Array.from({ length: count }, () => [...rgb, 255]).flat());
test('sRGB to Lab preserves white, black and red reference values', () => {
  assert.ok(Math.abs(rgbToLab([255,255,255])[0] - 100) < .001);
  assert.ok(rgbToLab([255,255,255]).slice(1).every(value => Math.abs(value) < .001));
  assert.deepEqual(rgbToLab([0,0,0]),[0,0,0]);
  const red = rgbToLab([255,0,0]); assert.ok(Math.abs(red[0]-53.2408)<.001); assert.ok(Math.abs(red[1]-80.0925)<.001);
  assert.throws(()=>rgbToLab([NaN,0,0])); assert.throws(()=>rgbToLab([256,0,0]));
});
test('median cheek sampling tolerates small shadow and highlight outliers', () => {
  const patch = new Uint8ClampedArray([...pixels([175,128,103],80),...pixels([0,0,0],10),...pixels([255,255,255],10)]);
  assert.deepEqual(samplePatch(patch).rgb,[175,128,103]);
  assert.equal(samplePatch(patch).count,80);
});
test('insufficient clipped and uneven cheek samples withhold recommendation', () => {
  assert.throws(()=>samplePatch(pixels([170,120,100],20)));
  assert.throws(()=>samplePatch(pixels([255,255,255])));
  assert.throws(()=>combineSkinPatches([pixels([220,170,140]),pixels([90,55,40])]),/차이/);
  assert.throws(()=>combineSkinPatches([pixels([100,130,160]),pixels([100,130,160])]),/특징/);
});
test('both lighter and darker cheek samples can produce finite ranked candidates', () => {
  for (const rgb of [[225,185,155],[130,92,65],[80,55,42]]) {
    const skin = combineSkinPatches([pixels(rgb),pixels(rgb)]);
    const result = estimatePersonalColor(skin);
    assert.equal(result.candidates.length,2);
    assert.ok(result.candidates.every(candidate => ['spring','summer','autumn','winter'].includes(candidate.season) && Number.isFinite(candidate.score)));
    assert.ok(result.candidates[0].score >= result.candidates[1].score);
    assert.match(result.skinHex,/^#[a-f0-9]{6}$/);
  }
});
test('contrast affects cool candidate ranking without altering the sampled skin', () => {
  const skin = { lab:[60,20,18],rgb:[170,130,120],unevenLight:false };
  const low = estimatePersonalColor(skin,'low'), high = estimatePersonalColor(skin,'high');
  assert.equal(low.candidates[0].season,'summer'); assert.equal(high.candidates[0].season,'winter');
  assert.deepEqual(skin.lab,[60,20,18]); assert.throws(()=>estimatePersonalColor(skin,'constructor'));
});
test('cheek geometry stays inside image and rejects tiny or cropped faces', () => {
  const regions = cheekRegions({originX:100,originY:60,width:200,height:220},512,512);
  assert.equal(regions.length,2); assert.ok(regions.every(region=>region.width*region.height>=60 && region.x+region.width<=512));
  assert.throws(()=>cheekRegions({originX:-100,originY:0,width:100,height:100},512,512));
  assert.throws(()=>cheekRegions({originX:0,originY:0,width:10,height:10},512,512));
});
