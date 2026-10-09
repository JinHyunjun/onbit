// Experimental photo-based palette rules, not a trained or validated seasonal classifier.
// sRGB -> D65 XYZ -> CIELAB keeps brightness and chromatic features separate.
export function rgbToLab(rgb) {
  if (!Array.isArray(rgb) || rgb.length !== 3 || rgb.some(value => !Number.isFinite(value) || value < 0 || value > 255)) throw new Error('Invalid RGB');
  const [r, g, b] = rgb.map(value => { const channel = value / 255; return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4; });
  const x = (r * .4124564 + g * .3575761 + b * .1804375) / .95047;
  const y = r * .2126729 + g * .7151522 + b * .072175;
  const z = (r * .0193339 + g * .119192 + b * .9503041) / 1.08883;
  const f = value => value > 216 / 24389 ? Math.cbrt(value) : (24389 / 27 * value + 16) / 116;
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}
const median = values => { const sorted = [...values].sort((a, b) => a - b); const mid = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2; };
export function samplePatch(pixels) {
  const channels = [[], [], []]; let clipped = 0;
  for (let i = 0; i + 3 < pixels.length; i += 4) {
    const brightness = .2126 * pixels[i] + .7152 * pixels[i + 1] + .0722 * pixels[i + 2];
    if (pixels[i + 3] < 250 || brightness < 12 || brightness > 242) { clipped++; continue; }
    for (let channel = 0; channel < 3; channel++) channels[channel].push(pixels[i + channel]);
  }
  if (channels[0].length < 60 || clipped / (pixels.length / 4) > .35) throw new Error('피부 영역이 어둡거나 빛에 가려져 있어요. 얼굴 앞쪽에 부드러운 빛이 오는 곳에서 다시 촬영해 주세요.');
  return { rgb: channels.map(median), count: channels[0].length };
}
export function combineSkinPatches(patches) {
  if (!Array.isArray(patches) || patches.length < 2) throw new Error('양쪽 볼 영역을 찾지 못했어요. 얼굴을 정면으로 촬영해 주세요.');
  const samples = patches.map(samplePatch);
  const labs = samples.map(sample => rgbToLab(sample.rgb));
  const difference = Math.hypot(...labs[0].map((value, index) => value - labs[1][index]));
  if (difference > 18) throw new Error('양쪽 볼의 색 차이가 커요. 한쪽에 생긴 그림자·색조명·화장을 확인하고 다시 촬영해 주세요.');
  const rgb = [0, 1, 2].map(channel => median(samples.map(sample => sample.rgb[channel])));
  const lab = rgbToLab(rgb);
  // Blue/green casts and nearly grey sampling are unsuitable for this heuristic.
  if (lab[1] < -2 || lab[2] < 1 || Math.hypot(lab[1], lab[2]) < 6) throw new Error('피부의 색 특징을 안정적으로 읽기 어려워요. 색조명을 끄고 보정하지 않은 사진으로 다시 시도해 주세요.');
  return { rgb, lab, sampleCount: samples.reduce((total, sample) => total + sample.count, 0), unevenLight: difference > 9 };
}
export function cheekRegions(box, width, height) {
  if (!box || ![box.originX, box.originY, box.width, box.height, width, height].every(Number.isFinite) || box.width <= 0 || box.height <= 0) throw new Error('얼굴 영역을 읽지 못했어요.');
  // Small central cheek patches avoid the eyes, mouth, hairline and most face edges.
  return [.22, .64].map(offset => {
    const x = Math.round(box.originX + box.width * offset), y = Math.round(box.originY + box.height * .56);
    const w = Math.max(1, Math.round(box.width * .14)), h = Math.max(1, Math.round(box.height * .14));
    if (x < 0 || y < 0 || x + w > width || y + h > height || w * h < 60) throw new Error('볼 영역이 작거나 화면 밖에 있어요. 얼굴 전체가 보이도록 가까이 촬영해 주세요.');
    return { x, y, width: w, height: h };
  });
}
const clamp = value => Math.max(0, Math.min(1, value));
export const seasonNames = { spring: '봄 웜', summer: '여름 쿨', autumn: '가을 웜', winter: '겨울 쿨' };
export function estimatePersonalColor(skin, contrast = 'medium') {
  if (!skin || !Array.isArray(skin.lab) || skin.lab.length !== 3 || !skin.lab.every(Number.isFinite)) throw new Error('사진의 피부색 특징을 먼저 확인해 주세요.');
  if (!['low', 'medium', 'high'].includes(contrast)) throw new Error('얼굴 대비를 선택해 주세요.');
  const [lightness, a, b] = skin.lab;
  const hue = Math.atan2(b, a) * 180 / Math.PI;
  const chroma = Math.hypot(a, b);
  // These anchors and weights are product heuristics pending labelled-data validation.
  // Brightness alone never determines the palette: hue, chroma, user contrast all contribute.
  const warm = clamp((hue - 42) / 24);
  const bright = clamp((lightness - 35) / 45);
  const vivid = clamp((chroma - 12) / 28);
  const contrastValue = { low: .15, medium: .5, high: .85 }[contrast];
  const raw = {
    spring: .50 * warm + .25 * bright + .15 * vivid + .10 * (1 - contrastValue),
    autumn: .50 * warm + .25 * (1 - bright) + .15 * (1 - vivid) + .10 * (1 - contrastValue),
    summer: .50 * (1 - warm) + .15 * bright + .15 * (1 - vivid) + .20 * (1 - contrastValue),
    winter: .50 * (1 - warm) + .15 * (1 - bright) + .15 * vivid + .20 * contrastValue
  };
  const candidates = Object.entries(raw).map(([season, score]) => ({ season, score })).sort((left, right) => right.score - left.score);
  const ambiguous = candidates[0].score - candidates[1].score < .10;
  const undertone = warm > .65 ? '따뜻한 색상 경향' : warm < .35 ? '시원한 색상 경향' : '웜·쿨 중간의 색상 경향';
  const brightness = lightness > 65 ? '밝은 명도' : lightness < 48 ? '깊은 명도' : '중간 명도';
  const saturation = chroma > 29 ? '비교적 선명한 색감' : '부드러운 색감';
  return { candidates: candidates.slice(0, 2), ambiguous, features: { undertone, brightness, saturation, contrast: { low: '부드러운 대비', medium: '중간 대비', high: '뚜렷한 대비' }[contrast] }, skinHex: '#' + skin.rgb.map(value => Math.round(value).toString(16).padStart(2, '0')).join(''), warnings: skin.unevenLight ? ['양쪽 볼에 약간의 색 차이가 있어요. 같은 빛 아래에서 한 번 더 비교하면 좋아요.'] : [] };
}
