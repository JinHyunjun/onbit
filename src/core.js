export const palettes = {
  spring: { name: '맑고 따뜻한 색', season: '봄 팔레트', colors: ['#F1A998', '#F4CC79', '#AED1AD', '#E9D5B7'], labels: ['코랄', '버터 옐로', '세이지', '크림'] },
  summer: { name: '부드럽고 시원한 색', season: '여름 팔레트', colors: ['#BBAEC9', '#99B8CC', '#D5A6B5', '#B5C9C2'], labels: ['라벤더', '스카이 블루', '로즈', '민트'] },
  autumn: { name: '깊고 따뜻한 색', season: '가을 팔레트', colors: ['#AC6449', '#B69551', '#797E54', '#A48B73'], labels: ['테라코타', '머스타드', '올리브', '카멜'] },
  winter: { name: '선명하고 시원한 색', season: '겨울 팔레트', colors: ['#334760', '#823F5C', '#36796C', '#D8DCE4'], labels: ['네이비', '베리', '에메랄드', '아이스 그레이'] }
};
export function photoQuality(pixels) {
  let luminance = 0, clipped = 0;
  const count = pixels.length / 4;
  if (!count) return { ok: false, reason: '사진을 다시 선택해 주세요.' };
  for (let i = 0; i < pixels.length; i += 4) {
    const y = .2126 * pixels[i] + .7152 * pixels[i + 1] + .0722 * pixels[i + 2];
    luminance += y;
    if (y > 245 || y < 8) clipped++;
  }
  const mean = luminance / count;
  if (mean < 45) return { ok: false, reason: '사진이 어둡습니다. 얼굴 앞쪽에 빛이 오는 곳에서 다시 촬영해 주세요.' };
  if (mean > 225 || clipped / count > .55) return { ok: false, reason: '밝거나 어두운 영역이 너무 많습니다. 강한 역광을 피해 다시 촬영해 주세요.' };
  return { ok: true, reason: '밝기 확인을 통과했습니다. 색조명·화장·카메라 보정은 결과에 영향을 줄 수 있습니다.' };
}
export function recommendations({ temperature, rain, purpose, palette, wardrobe = [] }) {
  if (!Number.isFinite(temperature) || temperature < -40 || temperature > 50) throw new Error('기온을 -40~50℃ 사이로 입력해 주세요.');
  if (!Object.hasOwn(palettes, palette)) throw new Error('팔레트를 선택해 주세요.');
  const p = palettes[palette];
  const top = temperature < 10 ? '니트' : temperature < 20 ? '긴팔 셔츠' : temperature < 28 ? '얇은 상의' : '반팔 상의';
  const layer = temperature < 5 ? '두꺼운 외투' : temperature < 12 ? '코트 또는 재킷' : temperature < 20 ? '가벼운 가디건' : '필요하면 얇은 겉옷';
  const bottom = purpose === 'work' ? '슬랙스' : purpose === 'walk' ? '편안한 바지' : '데님 또는 면바지';
  const titles = ['편안한 기본 조합', '색으로 주는 작은 포인트', '차분하게 정돈한 조합'];
  return titles.map((title, index) => {
    const color = p.colors[index];
    const choose = category => wardrobe.filter(item => item.category === category && (item.warmth === 'all' || (temperature < 15 ? item.warmth === 'warm' : item.warmth === 'light'))).sort((a, b) => Number(b.color === color) - Number(a.color === color))[index % Math.max(1, wardrobe.filter(item => item.category === category && (item.warmth === 'all' || (temperature < 15 ? item.warmth === 'warm' : item.warmth === 'light'))).length)];
    const ownedTop = choose('top'), ownedBottom = choose('bottom'), ownedLayer = choose('outer');
    return { title, color, colorName: p.labels[index], top: ownedTop?.name ?? `${p.labels[index]} ${top}`, bottom: ownedBottom?.name ?? bottom, layer: ownedLayer?.name ?? layer,
      owned: [ownedTop, ownedBottom, ownedLayer].filter(Boolean).map(item => item.name),
      reason: `${temperature}℃에 맞춰 ${top}와 ${layer} 조합을 제안합니다. ${purpose === 'work' ? '출근·약속에 맞게 단정한 실루엣' : purpose === 'walk' ? '걷기 편한 움직임' : '편안한 일상'}을 고려했고, 직접 고른 ${p.season}를 반영했습니다.`,
      extra: rain ? '강수가 있는 조건입니다. 우산과 물에 강한 신발을 함께 챙겨 주세요.' : '실내외 온도 차이에 맞춰 겉옷을 조절해 주세요.' };
  });
}
