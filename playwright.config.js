import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', timeout: 60000, workers: 1,
  use: { baseURL: 'http://localhost:8787', headless: true },
  webServer: { command: 'npm run dev -- --port 8787', url: 'http://localhost:8787/api/health', reuseExistingServer: true, timeout: 60000 }
});
