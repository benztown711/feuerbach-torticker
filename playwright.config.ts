import { defineConfig, devices } from '@playwright/test';

/**
 * E2E in zwei Profilen (research.md R-10): iphone (WebKit) und android (Chromium).
 * Lokal im Cloud-Container gibt es nur Chromium: PW_CHROMIUM_PATH setzt den Browserpfad,
 * PW_PROJECTS=android beschränkt auf das Android-Profil. In der CI laufen beide.
 */
const chromiumPath = process.env.PW_CHROMIUM_PATH;
const PORT = 4173;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://localhost:${PORT}/feuerbach-torticker/`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
  },
  projects: [
    { name: 'iphone', use: { ...devices['iPhone 15'] } },
    {
      name: 'android',
      use: {
        ...devices['Pixel 7'],
        ...(chromiumPath ? { launchOptions: { executablePath: chromiumPath } } : {}),
      },
    },
  ].filter((p) => !process.env.PW_PROJECTS || process.env.PW_PROJECTS.split(',').includes(p.name)),
  webServer: {
    command: 'npm run preview',
    url: `http://localhost:${PORT}/feuerbach-torticker/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
