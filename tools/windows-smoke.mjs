// Optional developer QA. Runtime launchers have no npm dependencies.
// Set PLAYWRIGHT_MODULE_PATH and BROWSER_EXE to existing local installations.
import {createRequire} from 'node:module';
import {mkdir, writeFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const out = join(root, '.build/windows-qa');
await mkdir(out, {recursive: true});
const browser = await chromium.launch({headless: true, executablePath: process.env.BROWSER_EXE || undefined});
const context = await browser.newContext({viewport: {width: 1200, height: 850}, reducedMotion: 'no-preference'});
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const results = [];
try {
  await page.goto('http://127.0.0.1:18765/');
  await page.waitForFunction(() => document.querySelector('#elapsed').textContent.trim().startsWith('00.0') === false);
  await page.waitForFunction(() => Number(document.querySelector('#timeline').value) > 7);
  await page.screenshot({path: join(out, 'animation.png')});
  await page.waitForFunction(() => document.querySelector('.window').dataset.completed === 'true', null, {timeout: 25000});
  results.push('Standalone animation completed');
  await page.keyboard.press('Control+Alt+b');
  await page.locator('#settings-dialog').waitFor({state: 'visible'});
  await page.locator('#intro-title').fill('Windows 11');
  await page.locator('#preview-images').click();
  await page.locator('#settings-dialog').waitFor({state: 'hidden'});
  await page.reload();
  await page.waitForFunction(() => document.querySelector('.boot-title').textContent === 'Windows 11');
  results.push('Ctrl+Alt+B settings and persisted title work');

  await page.goto('http://127.0.0.1:18765/.build/extension-preview/');
  await page.waitForFunction(() => window.__aemeathExtension?.status().ready);
  await page.waitForFunction(() => window.__aemeathExtension?.status().completed, null, {timeout: 25000});
  const state = await page.evaluate(() => window.__aemeathExtension.status());
  assert.equal(state.overlay, false);
  assert.equal(state.wallpaper, true);
  await page.waitForFunction(() => document.querySelector('#test-status').textContent.includes('"completed":true'));
  await page.screenshot({path: join(out, 'wallpaper.png')});
  await page.locator('#ready').click();
  assert.equal(await page.locator('#ready').textContent(), '点击成功');
  await page.locator('textarea').fill('背景预览输入测试');
  assert.equal(await page.locator('textarea').inputValue(), '背景预览输入测试');
  results.push('Overlay removed after playback; wallpaper remains; host is interactive');
  await page.keyboard.press('Control+Alt+b');
  const frame = page.frameLocator('#aemeath-extension-overlay');
  await frame.locator('#settings-dialog').waitFor({state: 'visible'});
  await frame.locator('#restore-appearance').click();
  await page.waitForFunction(() => !window.__aemeathExtension && !document.documentElement.hasAttribute('data-aemeath-skin'));
  results.push('Settings shortcut and restore appearance work in mock host');
  const denied = await context.request.get('http://127.0.0.1:18765/.git/config');
  assert.equal(denied.status(), 404);
  assert.deepEqual(errors, []);
  results.push('No browser script errors; repository files are not served');
  const report = {passed: true, results, errors, realCodexIntegration: 'not tested'};
  await writeFile(join(out, 'results.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await context.close();
  await browser.close();
}
