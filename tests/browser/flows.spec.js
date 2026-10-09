import { test, expect } from '@playwright/test';
test('wardrobe recommendation history reload and delete', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: /선명하고 시원한 색/ }).click();
  await page.locator('#item-name').fill('<b>네이비 셔츠</b>');
  await page.getByRole('button', { name: '옷 등록 +' }).click();
  await expect(page.locator('.wardrobe-item')).toContainText('<b>네이비 셔츠</b>');
  await expect(page.locator('.wardrobe-item b')).toHaveCount(0);
  await page.getByRole('button', { name: '코디 3개 추천받기 →' }).click();
  await expect(page.locator('.look')).toHaveCount(3);
  await expect(page.locator('.look').first()).toContainText('겨울 팔레트');
  await expect(page.locator('.look').first()).toContainText('<b>네이비 셔츠</b>');
  await page.getByRole('button', { name: '이 코디 저장', exact: true }).first().click();
  await page.locator('.history-row select').selectOption('good');
  await page.reload();
  await expect(page.locator('.wardrobe-item')).toHaveCount(1);
  await expect(page.locator('.history-row select')).toHaveValue('good');
  await page.route('**/api/weather?city=seoul', route => route.fulfill({ json: { temperature: 13.5, rain: true, observedAt: '2026-10-09T12:00', source: 'Open-Meteo', city: 'seoul' } }));
  await page.getByRole('button', { name: '지역 날씨 불러오기 ↗' }).click();
  await expect(page.locator('#weather-note')).toContainText('Open-Meteo');
  await expect(page.locator('#temperature')).toHaveValue('13.5');
  await expect(page.locator('#rain')).toHaveValue('true');
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: '옷장·기록 모두 삭제' }).click();
  await expect(page.locator('.wardrobe-item')).toHaveCount(0);
  await expect(page.locator('.history-row')).toHaveCount(0);
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/desktop.png', fullPage: true });
});
test('mobile layout invalid image and denied camera', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => { throw new DOMException('Denied', 'NotAllowedError'); } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: '카메라 켜기' }).click();
  await expect(page.locator('#quality')).toContainText('거절');
  await page.locator('#upload').setInputFiles({ name: 'fake.png', mimeType: 'image/png', buffer: Buffer.from('invalid-image') });
  await expect(page.locator('#quality')).toContainText('읽을 수 없습니다');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
});
test('synthetic webcam capture loads self-hosted model and stops tracks', async ({ browser }) => {
  const context = await browser.newContext({ permissions: ['camera'] });
  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => {
      const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 480;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#a99480'; ctx.fillRect(0,0,640,480);
      const synthetic = canvas.captureStream(1); window.testStream = synthetic; return synthetic;
    } });
  });
  const outbound = []; const errors = [];
  page.on('request', request => { if (!request.url().startsWith('http://localhost:8787')) outbound.push(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/'); await page.locator('#camera').click();
  await expect(page.locator('#capture')).toBeVisible();
  await page.locator('#capture').click();
  await expect(page.locator('#quality')).toContainText('얼굴을 찾지 못했습니다', { timeout: 45000 });
  expect(await page.evaluate(() => window.testStream.getTracks().every(track => track.readyState === 'ended'))).toBeTruthy();
  expect(outbound).toEqual([]); expect(errors).toEqual([]);
  await page.locator('#discard').click();
  await expect(page.locator('#photo')).toBeHidden();
  await context.close();
});
test('frame policy block is distinct from user refusal', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(document, 'permissionsPolicy', { value: { allowsFeature: () => false } });
  });
  await page.goto('/'); await page.locator('#camera').click();
  await expect(page.locator('#quality')).toContainText('카메라 정책');
  await expect(page.locator('#camera-diagnostics')).toContainText('PermissionsPolicyError');
  await expect(page.locator('#mobile-upload')).toHaveAttribute('capture', 'user');
});
test('missing and busy camera have separate recovery instructions', async ({ page }) => {
  await page.addInitScript(() => {
    let count = 0;
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => { throw new DOMException('Camera failure', count++ ? 'NotReadableError' : 'NotFoundError'); } });
  });
  await page.goto('/'); await page.locator('#camera').click();
  await expect(page.locator('#quality')).toContainText('찾지 못했습니다');
  await page.locator('#camera').click();
  await expect(page.locator('#quality')).toContainText('다른 앱');
});
