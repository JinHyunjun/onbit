import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';
import { palettes, photoQuality, recommendations } from './core.js';
import './style.css';

const $ = id => document.getElementById(id);
let stream, detectorPromise, cameraAttempt = 0, imageReady = false, photoVersion = 0;
const storageKey = 'onbit-v1';
let state = { palette: 'autumn', wardrobe: [], history: [] };
try { const saved = JSON.parse(localStorage.getItem(storageKey) || 'null'); if (saved && Object.hasOwn(palettes, saved.palette) && Array.isArray(saved.wardrobe) && Array.isArray(saved.history)) state = saved; } catch { /* A new browser session can still be used. */ }
const notify = message => { $('status').textContent = message; };
function save() { try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { notify('이 브라우저에 기록을 저장할 수 없습니다. 저장 공간이나 브라우저 설정을 확인해 주세요.'); } }
const app = $('app');
app.innerHTML = `
<header><a class="brand" href="#"><span class="brand-symbol">◐</span> 온빛<span class="brand-en">ONBIT</span></a><nav aria-label="주요 메뉴"><a href="#color">나의 컬러</a><a href="#today">오늘의 코디</a><a href="#closet">내 옷장</a></nav><span class="beta">EARLY PREVIEW</span></header>
<main>
<section class="hero"><div><p class="eyebrow">A LITTLE COLOR, A BETTER DAY</p><h1>오늘의 나를,<br>조금 더 나답게.</h1><p class="lead">나에게 어울리는 색을 비교하고,<br>날씨와 하루의 계획에 맞는 코디를 찾아보세요.</p><a class="button" href="#color">내 컬러 찾아보기 <span>↗</span></a><p class="privacy-line">사진은 내 기기 안에서만 처리합니다.</p></div><div class="hero-art" aria-hidden="true"><div class="art-ring"></div><div class="art-card"><span>YOUR DAILY PALETTE</span><div class="swatch-stack"><i></i><i></i><i></i><i></i></div><p>색에서 시작하는<br>나만의 하루</p><b>01 — 04</b></div><div class="art-caption">warm / soft / deep / clear</div></div></section>
<div class="journey"><span><b>01</b> 내 얼굴과 색 비교</span><span><b>02</b> 오늘의 조건 선택</span><span><b>03</b> 나만의 코디 완성</span></div>
<section id="color" class="section"><div class="section-heading"><div><p class="eyebrow">01 / COLOR EXPLORATION</p><h2>나의 컬러를 탐색해요</h2></div><p>계절 유형을 확정하는 진단 대신,<br>사진과 팔레트를 함께 비교해 보세요.</p></div>
<div class="color-grid"><div class="card capture-card"><div class="card-head"><h3>내 사진 준비하기</h3><span class="small-tag">기기 내 처리</span></div><p class="muted">밝은 곳에서 얼굴을 정면으로 촬영해 주세요. 색조명과 강한 역광은 피해주세요.</p><div id="preview" class="preview"><video id="video" autoplay muted playsinline hidden></video><canvas id="photo" hidden></canvas><div id="placeholder"><span class="face-icon">◌</span><p>얼굴 사진을 준비해 주세요</p><small>웹캠 · 스마트폰 카메라 · 사진 업로드</small></div><div id="guide" class="face-guide" hidden></div></div><div class="actions"><button id="camera">카메라 켜기</button><button id="capture" hidden>사진 촬영</button><button id="stop" class="secondary" hidden>카메라 끄기</button><label class="button secondary file-button">사진 선택<input id="upload" type="file" accept="image/jpeg,image/png,image/webp"></label><label class="button secondary file-button">스마트폰으로 촬영<input id="mobile-upload" type="file" accept="image/*" capture="user"></label></div><p id="quality" class="helper" role="status">카메라 권한은 ‘카메라 켜기’를 누른 뒤 요청합니다.</p><details class="camera-help"><summary>카메라 권한·연결 확인</summary><p id="camera-diagnostics" class="helper"></p><p class="helper">내장 미리보기에서 실패하면 아래 링크를 일반 Chrome·Edge·Safari에서 열어보세요. 주소창의 사이트 설정에서 카메라를 허용한 뒤 다시 시도하세요. Windows에서는 설정 → 개인정보 및 보안 → 카메라의 브라우저 접근도 확인해 주세요.</p><a id="open-camera-page" class="text-button" target="_blank" rel="noopener">현재 페이지 새 창에서 열기 ↗</a><p class="helper">휴대폰에서는 ‘스마트폰으로 촬영’으로 기본 카메라 앱을 이용할 수도 있어요. 촬영·선택한 사진은 서버에 전송하지 않습니다.</p></details><button id="discard" class="text-button" hidden>사진 지우기</button></div>
<div class="card palette-card"><div class="card-head"><h3>사진 옆에서 색을 비교해요</h3><span class="small-tag">직접 선택</span></div><p class="muted">얼굴 주변이 편안하고 자연스럽게 보이는 팔레트를 골라보세요. 사진 없이도 선택할 수 있어요.</p><div id="palettes" class="palette-list"></div><div class="chosen"><span>선택한 팔레트</span><strong id="selected-name"></strong><p>조명·화장·카메라 보정에 따라 다르게 보일 수 있어요.<br>이 선택은 전문 퍼스널컬러 진단 결과가 아닙니다.</p></div></div></div></section>
<section id="today" class="section"><div class="section-heading"><div><p class="eyebrow">02 / DAILY STYLING</p><h2>오늘은 무엇을 입을까요?</h2></div><p>오늘의 날씨와 계획에 맞춰<br>추천 이유까지 함께 살펴보세요.</p></div><div class="card"><form id="recommend-form"><div class="fields"><label>지역<select id="city"><option value="seoul">서울</option><option value="siheung">시흥</option><option value="busan">부산</option><option value="jeju">제주</option></select></label><label>기온 (℃)<input id="temperature" type="number" value="18" min="-40" max="50" step="0.1" required></label><label>날씨<select id="rain"><option value="false">비 없음</option><option value="true">비 또는 눈</option></select></label><label>오늘의 계획<select id="purpose"><option value="daily">편안한 일상</option><option value="work">출근 · 단정한 약속</option><option value="walk">산책 · 가벼운 활동</option></select></label></div><div class="form-bottom"><div><button id="weather" type="button" class="text-button">지역 날씨 불러오기 ↗</button><p id="weather-note" class="helper">현재 기온과 강수 여부는 직접 입력한 조건입니다.</p></div><button type="submit">코디 3개 추천받기 →</button></div></form></div><div id="results" class="results" aria-live="polite"></div></section>
<section id="closet" class="section"><div class="section-heading"><div><p class="eyebrow">03 / MY WARDROBE</p><h2>이미 가진 옷으로 시작해요</h2></div><p>옷을 등록하면 추천에 반영합니다.<br>옷장과 기록은 이 브라우저에 저장됩니다.</p></div><div class="card"><form id="closet-form"><div class="fields closet-fields"><label>옷 이름<input id="item-name" maxlength="40" placeholder="예: 자주 입는 네이비 니트" required></label><label>종류<select id="category"><option value="top">상의</option><option value="bottom">하의</option><option value="outer">겉옷</option></select></label><label>두께<select id="warmth"><option value="all">사계절</option><option value="warm">도톰한 옷</option><option value="light">얇은 옷</option></select></label><label>대표 색상<input id="item-color" type="color" value="#334760"></label><button type="submit">옷 등록 +</button></div></form><div id="wardrobe" class="wardrobe"></div></div></section>
<section class="section history-section"><div class="section-heading"><div><p class="eyebrow">YOUR CHOICES</p><h2>내가 고른 코디</h2></div><button id="clear-data" class="text-button">옷장·기록 모두 삭제</button></div><div id="history"></div></section>
<div id="status" class="status" role="status" aria-live="polite"></div>
</main><footer><a class="brand" href="#">◐ 온빛</a><p>색을 비교하고, 나에게 맞는 선택을 쌓아가요.<br>얼굴 사진은 전송·저장하지 않습니다. 옷장·선택 기록은 이 기기의 브라우저에 저장됩니다.<br>날씨 데이터: <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a> · 지역별 현재 기온·강수량을 사용합니다.</p><span>ONBIT · 2026</span></footer>`;

function renderPalettes() {
  $('palettes').replaceChildren();
  for (const [key, palette] of Object.entries(palettes)) {
    const button = document.createElement('button'); button.className = 'palette-option'; button.type = 'button'; button.setAttribute('aria-pressed', String(key === state.palette));
    const row = document.createElement('span'); row.className = 'mini-swatches';
    palette.colors.forEach(color => { const swatch = document.createElement('i'); swatch.style.backgroundColor = color; row.append(swatch); });
    const caption = document.createElement('span'); caption.className = 'palette-caption'; caption.textContent = palette.name;
    const season = document.createElement('small'); season.textContent = palette.season; caption.append(season);
    const mark = document.createElement('span'); mark.className = 'check'; mark.textContent = key === state.palette ? '✓' : '○';
    button.append(row, caption, mark); button.addEventListener('click', () => { state.palette = key; save(); renderPalettes(); if (imageReady) drawPhoto(); $('results').replaceChildren(); }); $('palettes').append(button);
  }
  $('selected-name').textContent = `${palettes[state.palette].name} · ${palettes[state.palette].season}`;
}
const sourceCanvas = document.createElement('canvas');
function drawPhoto() {
  const canvas = $('photo'); canvas.width = sourceCanvas.width; canvas.height = sourceCanvas.height;
  const ctx = canvas.getContext('2d'); ctx.drawImage(sourceCanvas, 0, 0);
  // Palette strips allow comparison without altering the face or skin pixels.
  const strip = canvas.width * .1;
  palettes[state.palette].colors.forEach((color, index) => { ctx.fillStyle = color; ctx.fillRect(0, canvas.height / 4 * index, strip, canvas.height / 4); ctx.fillRect(canvas.width - strip, canvas.height / 4 * index, strip, canvas.height / 4); });
  canvas.hidden = false; $('placeholder').hidden = true; $('discard').hidden = false;
}
function stopCamera() {
  cameraAttempt++; stream?.getTracks().forEach(track => track.stop()); stream = undefined;
  $('video').srcObject = null; $('video').hidden = true; $('capture').hidden = true; $('stop').hidden = true; $('guide').hidden = true; $('camera').disabled = false;
  $('placeholder').hidden = imageReady;
  if (imageReady) drawPhoto();
}
function cameraEnvironment() {
  const policy = document.permissionsPolicy ?? document.featurePolicy;
  return { secure: window.isSecureContext, supported: Boolean(navigator.mediaDevices?.getUserMedia), embedded: window.self !== window.top, policyAllowed: policy?.allowsFeature ? policy.allowsFeature('camera') : null };
}
async function cameraDiagnostics(errorName = '') {
  const info = cameraEnvironment(); let permission = '조회 불가';
  try { permission = (await navigator.permissions.query({ name: 'camera' })).state; } catch { /* Safari may not support querying camera permission. */ }
  $('camera-diagnostics').textContent = `보안 연결: ${info.secure ? '정상' : 'HTTPS 필요'} / 카메라 API: ${info.supported ? '지원' : '미지원'} / 화면: ${info.embedded ? '내장 프레임' : '독립 페이지'} / 페이지 카메라 정책: ${info.policyAllowed === null ? '조회 불가' : info.policyAllowed ? '허용' : '차단'} / 브라우저 권한: ${{ granted: '허용', prompt: '승인 대기', denied: '차단' }[permission] ?? permission}${errorName ? ` / 오류: ${errorName}` : ''}`;
}
$('open-camera-page').href = window.location.href.split('#')[0] + '#color';
void cameraDiagnostics();
async function getDetector() {
  if (!detectorPromise) detectorPromise = (async () => { const files = await FilesetResolver.forVisionTasks('/vision/wasm'); return FaceDetector.createFromOptions(files, { baseOptions: { modelAssetPath: '/vision/face_detector.tflite' }, runningMode: 'IMAGE', minDetectionConfidence: .6 }); })().catch(error => { detectorPromise = undefined; throw error; });
  return detectorPromise;
}
async function processPhoto(source, width, height) {
  const version = ++photoVersion;
  const scale = Math.min(1, 900 / Math.max(width, height));
  sourceCanvas.width = Math.round(width * scale); sourceCanvas.height = Math.round(height * scale);
  const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true }); ctx.drawImage(source, 0, 0, sourceCanvas.width, sourceCanvas.height);
  imageReady = true; drawPhoto(); $('quality').textContent = '사진의 얼굴과 밝기를 확인하고 있어요…';
  try {
    const model = await getDetector(); if (version !== photoVersion) return; const detections = model.detect(sourceCanvas).detections;
    if (detections.length !== 1) { $('quality').textContent = detections.length ? '얼굴이 여러 개입니다. 한 사람만 나온 사진으로 다시 촬영해 주세요.' : '얼굴을 찾지 못했습니다. 얼굴이 정면으로 크게 보이게 다시 촬영해 주세요.'; return; }
    const box = detections[0].boundingBox;
    if (!box || box.width / sourceCanvas.width < .16) { $('quality').textContent = '얼굴이 너무 작습니다. 카메라에 조금 가까이 와주세요.'; return; }
    const x = Math.max(0, Math.floor(box.originX)), y = Math.max(0, Math.floor(box.originY));
    const w = Math.max(1, Math.min(sourceCanvas.width - x, Math.floor(box.width))), h = Math.max(1, Math.min(sourceCanvas.height - y, Math.floor(box.height)));
    const quality = photoQuality(ctx.getImageData(x, y, w, h).data); $('quality').textContent = quality.reason;
  } catch { if (version === photoVersion) $('quality').textContent = '자동 얼굴 확인을 사용할 수 없습니다. 정면 사진인지 직접 확인하며 색을 비교해 주세요.'; }
}
$('camera').addEventListener('click', async () => {
  stopCamera(); const attempt = cameraAttempt; $('camera').disabled = true;
  try {
    const environment = cameraEnvironment();
    if (!environment.secure) throw new DOMException('HTTPS required', 'InsecureContextError');
    if (environment.policyAllowed === false) throw new DOMException('Blocked by parent policy', 'PermissionsPolicyError');
    if (!environment.supported) throw new DOMException('Camera API unavailable', 'UnsupportedError');
    let requested;
    try { requested = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false }); }
    catch (error) { if (error.name !== 'OverconstrainedError') throw error; requested = await navigator.mediaDevices.getUserMedia({ video: true, audio: false }); }
    if (attempt !== cameraAttempt) { requested.getTracks().forEach(track => track.stop()); return; }
    stream = requested; $('video').srcObject = stream; await $('video').play();
    if (attempt !== cameraAttempt) return;
    $('video').hidden = false; $('photo').hidden = true; $('placeholder').hidden = true; $('capture').hidden = false; $('stop').hidden = false; $('guide').hidden = false; $('quality').textContent = '얼굴을 안내선 안에 맞추고 촬영해 주세요.';
  } catch (error) {
    if (attempt !== cameraAttempt) return; stopCamera();
    const messages = {
      InsecureContextError: '현재 주소는 카메라를 사용할 수 없는 연결입니다. 공개 HTTPS 주소를 일반 브라우저에서 열어 주세요.',
      PermissionsPolicyError: '현재 미리보기의 카메라 정책이 접근을 차단했습니다. 일반 브라우저에서 페이지를 직접 열거나 스마트폰 촬영·사진 선택을 이용해 주세요.',
      UnsupportedError: '이 브라우저에서 카메라 API를 사용할 수 없습니다. Chrome·Edge·Safari에서 직접 열거나 사진을 선택해 주세요.',
      NotAllowedError: '카메라 접근이 차단되었습니다. 브라우저 권한 거절·운영체제 설정·내장 브라우저 제한이 원인일 수 있어요. 아래 권한·연결 확인을 열어 안내대로 확인해 주세요.',
      NotFoundError: '연결된 카메라를 찾지 못했습니다. 웹캠 연결을 확인하거나 스마트폰 촬영·사진 선택을 이용해 주세요.',
      NotReadableError: '카메라를 열 수 없습니다. 다른 앱의 카메라 사용과 운영체제 카메라 설정을 확인한 뒤 다시 시도해 주세요.'
    };
    $('quality').textContent = messages[error.name] ?? '카메라를 시작하지 못했습니다. 아래 권한·연결 확인을 확인하거나 사진을 선택해 주세요.';
    document.querySelector('.camera-help').open = true; await cameraDiagnostics(error.name);
  }
});
$('stop').addEventListener('click', () => { stopCamera(); if (imageReady) drawPhoto(); });
$('capture').addEventListener('click', async () => { const video = $('video'); if (!video.videoWidth) return; const snapshot = document.createElement('canvas'); snapshot.width = video.videoWidth; snapshot.height = video.videoHeight; snapshot.getContext('2d').drawImage(video, 0, 0); stopCamera(); await processPhoto(snapshot, snapshot.width, snapshot.height); snapshot.width = snapshot.height = 0; });
async function uploadPhoto(event) {
  const file = event.target.files?.[0]; if (!file) return; stopCamera();
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 12 * 1024 * 1024) { $('quality').textContent = '12MB 이하의 JPG·PNG·WebP 사진을 선택해 주세요.'; event.target.value = ''; return; }
  try { const bitmap = await createImageBitmap(file); if (bitmap.width * bitmap.height > 40_000_000) { bitmap.close(); throw new Error('size'); } await processPhoto(bitmap, bitmap.width, bitmap.height); bitmap.close(); } catch { $('quality').textContent = '사진을 읽을 수 없습니다. 다른 JPG·PNG·WebP 사진을 선택해 주세요.'; }
  event.target.value = '';
}
$('upload').addEventListener('change', uploadPhoto);
$('mobile-upload').addEventListener('change', uploadPhoto);
$('discard').addEventListener('click', () => { stopCamera(); photoVersion++; imageReady = false; sourceCanvas.width = sourceCanvas.height = 0; $('photo').width = $('photo').height = 0; $('photo').hidden = true; $('placeholder').hidden = false; $('discard').hidden = true; $('quality').textContent = '사진을 지웠습니다. 새 사진이나 직접 선택으로 계속할 수 있어요.'; });
window.addEventListener('pagehide', stopCamera);
document.addEventListener('visibilitychange', () => { if (document.hidden) stopCamera(); });

let weatherSource = '직접 입력';
$('weather').addEventListener('click', async () => {
  const button = $('weather'); button.disabled = true; $('weather-note').textContent = '지역 날씨를 불러오고 있어요…'; const city = $('city').value;
  try { const response = await fetch(`/api/weather?city=${encodeURIComponent(city)}`); const data = await response.json(); if (!response.ok) throw new Error(data.error); if (city !== $('city').value) return; $('temperature').value = data.temperature; $('rain').value = String(data.rain); weatherSource = `Open-Meteo · ${data.observedAt}`; $('weather-note').textContent = `${weatherSource} (한국 시간) · 지역 선택값 기준`; }
  catch (error) { weatherSource = '직접 입력'; $('weather-note').textContent = error.message || '날씨를 불러오지 못했습니다. 직접 입력해 주세요.'; }
  finally { button.disabled = false; }
});
for (const id of ['temperature', 'rain', 'city']) $(id).addEventListener('change', () => { weatherSource = '직접 입력'; $('weather-note').textContent = '조건이 변경되었습니다. 직접 입력한 값으로 추천합니다.'; $('results').replaceChildren(); });
$('purpose').addEventListener('change', () => $('results').replaceChildren());
$('recommend-form').addEventListener('submit', event => {
  event.preventDefault(); const temperature = Number($('temperature').value), purpose = $('purpose').value, rain = $('rain').value === 'true';
  try {
    const looks = recommendations({ temperature, purpose, rain, palette: state.palette, wardrobe: state.wardrobe }); $('results').replaceChildren();
    looks.forEach((look, index) => {
      const card = document.createElement('article'); card.className = 'look card';
      const visual = document.createElement('div'); visual.className = 'look-visual'; visual.style.setProperty('--look-color', look.color); visual.innerHTML = `<span class="look-number">LOOK 0${index + 1}</span><div class="shirt"></div><div class="pants"></div><span class="look-swatch"></span>`;
      const title = document.createElement('h3'); title.textContent = look.title;
      const clothes = document.createElement('p'); clothes.className = 'clothes'; clothes.textContent = `${look.top} · ${look.bottom} · ${look.layer}`;
      const reason = document.createElement('p'); reason.className = 'muted'; reason.textContent = look.reason;
      const extra = document.createElement('p'); extra.className = 'helper'; extra.textContent = look.extra;
      const owned = document.createElement('p'); owned.className = 'helper'; owned.textContent = look.owned.length ? `내 옷장 반영: ${look.owned.join(', ')} · 나머지는 의류 종류 제안` : '의류 종류와 색 조합 제안 · 옷장 등록 시 보유 의류 반영';
      const choose = document.createElement('button'); choose.className = 'secondary'; choose.textContent = '이 코디 저장';
      choose.addEventListener('click', () => { state.history.unshift({ id: crypto.randomUUID(), title: look.title, clothes: clothes.textContent, color: look.color, date: new Date().toISOString(), weatherSource, feedback: '' }); state.history = state.history.slice(0, 30); save(); renderHistory(); notify('선택한 코디를 이 브라우저에 저장했어요.'); choose.disabled = true; choose.textContent = '저장했어요 ✓'; });
      card.append(visual, title, clothes, reason, extra, owned, choose); $('results').append(card);
    });
    notify('선택한 팔레트와 오늘의 조건을 반영한 코디 3개를 준비했어요.');
  } catch (error) { notify(error.message); }
});
function renderWardrobe() {
  $('wardrobe').replaceChildren();
  if (!state.wardrobe.length) { const empty = document.createElement('p'); empty.className = 'empty'; empty.textContent = '아직 등록한 옷이 없어요. 자주 입는 상의 하나부터 등록해 보세요.'; $('wardrobe').append(empty); }
  for (const item of state.wardrobe) {
    const row = document.createElement('div'); row.className = 'wardrobe-item'; const swatch = document.createElement('i'); swatch.style.background = item.color;
    const name = document.createElement('span'); name.textContent = item.name; const tag = document.createElement('small'); tag.textContent = `${{ top: '상의', bottom: '하의', outer: '겉옷' }[item.category]} · ${{ all: '사계절', warm: '도톰함', light: '얇음' }[item.warmth]}`;
    const remove = document.createElement('button'); remove.className = 'text-button'; remove.textContent = '삭제'; remove.setAttribute('aria-label', `${item.name} 삭제`); remove.addEventListener('click', () => { state.wardrobe = state.wardrobe.filter(entry => entry.id !== item.id); save(); renderWardrobe(); $('results').replaceChildren(); }); row.append(swatch, name, tag, remove); $('wardrobe').append(row);
  }
}
$('closet-form').addEventListener('submit', event => { event.preventDefault(); const name = $('item-name').value.trim(); if (!name) return; if (state.wardrobe.length >= 100) return notify('옷은 최대 100개까지 등록할 수 있어요.'); state.wardrobe.push({ id: crypto.randomUUID(), name, category: $('category').value, warmth: $('warmth').value, color: $('item-color').value }); save(); renderWardrobe(); $('item-name').value = ''; $('results').replaceChildren(); notify('옷을 등록했어요. 새 추천에 반영됩니다.'); });
function renderHistory() {
  $('history').replaceChildren();
  if (!state.history.length) { const empty = document.createElement('p'); empty.className = 'empty'; empty.textContent = '마음에 드는 코디를 저장하면 이곳에서 다시 볼 수 있어요.'; $('history').append(empty); }
  state.history.forEach(record => {
    const row = document.createElement('div'); row.className = 'history-row';
    const dot = document.createElement('i'); dot.style.background = record.color; const text = document.createElement('div'); const heading = document.createElement('strong'); heading.textContent = record.title; const detail = document.createElement('p'); detail.textContent = record.clothes; const date = document.createElement('small'); date.textContent = `${new Date(record.date).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })} · ${record.weatherSource}`; text.append(heading, detail, date);
    const feedback = document.createElement('select'); feedback.setAttribute('aria-label', `${record.title} 피드백`); [['', '입어본 느낌 선택'], ['good', '마음에 들어요'], ['hot', '너무 더웠어요'], ['cold', '너무 추웠어요'], ['color', '색이 취향과 달라요']].forEach(([value, label]) => feedback.add(new Option(label, value))); feedback.value = record.feedback; feedback.addEventListener('change', () => { record.feedback = feedback.value; save(); notify('느낌을 기록했어요. 현재 버전에서는 기록만 저장하며 추천 학습은 후속 개발 예정입니다.'); }); row.append(dot, text, feedback); $('history').append(row);
  });
}
$('clear-data').addEventListener('click', () => { if (!confirm('이 브라우저의 옷장과 저장한 코디를 모두 삭제할까요?')) return; state.wardrobe = []; state.history = []; save(); renderWardrobe(); renderHistory(); $('results').replaceChildren(); notify('옷장과 코디 기록을 삭제했습니다.'); });
renderPalettes(); renderWardrobe(); renderHistory();
