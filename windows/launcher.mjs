import {execFile as rawExec, spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {createServer as createHttpServer} from 'node:http';
import {createServer as createNetServer} from 'node:net';
import {readFile, access} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {buildInjection} from '../extension/payload.mjs';
import {connect, localSocket, pageTarget} from '../extension/cdp.mjs';

const exec = promisify(rawExec);
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const powershell = process.env.SystemRoot
  ? join(process.env.SystemRoot, 'System32/WindowsPowerShell/v1.0/powershell.exe')
  : 'powershell.exe';
const previewPort = 18765;
const marker = 'aemeath-windows-preview-v2';
const origin = `http://127.0.0.1:${previewPort}`;

async function platform(action, options = {}) {
  const args = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-File', join(root, 'windows/platform.ps1'), '-Action', action];
  for (const [key, value] of Object.entries(options)) {
    if (value !== '' && value !== null && value !== undefined) args.push(`-${key}`, String(value));
  }
  const {stdout} = await exec(powershell, args, {timeout: 20000, maxBuffer: 1024 * 1024, windowsHide: true});
  return JSON.parse(stdout.replace(/^\uFEFF/, '').trim());
}

export function trustedInstallation(info) {
  return info.signatureStatus === 'Valid' && /(?:^|,\s*)O="?OpenAI(?: OpCo)?(?:, LLC)?"?(?:,|$)/i.test(info.signer);
}

export function listenerMatches(listeners, executable) {
  return Array.isArray(listeners) && listeners.length > 0 && listeners.every(listener =>
    listener.address === '127.0.0.1' && listener.sameUser === true &&
    typeof listener.executable === 'string' &&
    listener.executable.toLowerCase() === executable.toLowerCase());
}

async function findInstallation() {
  const discovered = await platform('Discover');
  const candidates = Array.isArray(discovered) ? discovered : [discovered];
  const errors = [];
  for (const candidate of candidates) {
    try {
      const info = await platform('Inspect', {Executable: candidate.executable});
      if (!trustedInstallation(info)) throw new Error('未通过 OpenAI 数字签名校验');
      // A CLI binary cannot host the appearance layer.
      await access(join(dirname(info.executable), 'resources/app.asar'));
      return {...info, appId: candidate.appId};
    } catch (error) { errors.push(error.message); }
  }
  throw new Error('未找到已签名的 Codex 桌面应用。可设置 CODEX_STARTUP_EXE 指向桌面程序（不是 CLI）。' +
    (errors.length ? '\n' + errors.join('\n') : ''));
}

async function freePort() {
  return new Promise((fulfill, reject) => {
    const server = createNetServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(error => error ? reject(error) : fulfill(port));
    });
  });
}

export async function injectUntilReady({port, executable, source, timeout = 45000}) {
  const deadline = Date.now() + timeout;
  let lastError = '等待 Codex 主窗口';
  while (Date.now() < deadline) {
    let client;
    try {
      const listeners = await platform('Listener', {Port: port});
      if (!listenerMatches(listeners, executable)) throw new Error('调试端口尚未就绪，或端口地址/进程/用户不匹配');
      const response = await fetch(`http://127.0.0.1:${port}/json/list`, {
        signal: AbortSignal.timeout(1500), redirect: 'error'
      });
      if (!response.ok) throw new Error('调试页面尚未就绪');
      const targets = await response.json();
      if (!Array.isArray(targets)) throw new Error('调试页面列表无效');
      const target = targets.find(pageTarget);
      if (!target) throw new Error('未发现兼容的 app://-/index.html 主窗口');
      client = await connect(localSocket(target.webSocketDebuggerUrl, port));
      const result = await client.call('Runtime.evaluate', {expression: source, returnByValue: true, awaitPromise: true});
      if (result.exceptionDetails || result.result?.value?.installed !== true) throw new Error('动画注入失败');
      while (Date.now() < deadline) {
        const status = await client.call('Runtime.evaluate', {
          expression: 'globalThis.__aemeathExtension?.status()', returnByValue: true
        });
        const state = status.result?.value;
        if (state?.ready || state?.completed) return;
        if (state?.phase === 'failed' || state?.phase === 'timeout') throw new Error('动画素材加载失败');
        await delay(100);
      }
      throw new Error('动画加载超时');
    } catch (error) { lastError = error.message; }
    finally { client?.close(); }
    await delay(200);
  }
  throw new Error(lastError);
}

async function launch() {
  const info = await findInstallation();
  if (info.running.length) {
    console.log('Codex 已在运行，本次只打开已有应用。保存工作并完全退出后，再双击此启动器才会播放动画。');
    await platform('Activate', {Executable: info.executable, AppId: info.appId || ''});
    return;
  }
  const source = await buildInjection(root);
  const port = await freePort();
  console.log('正在启动 Codex，并尝试加载动画。Ctrl+Alt+B 打开图片设置。');
  const child = spawn(info.executable, ['--remote-debugging-address=127.0.0.1', `--remote-debugging-port=${port}`], {
    cwd: dirname(info.executable), detached: true, stdio: 'ignore', windowsHide: false
  });
  await new Promise((fulfill, reject) => { child.once('spawn', fulfill); child.once('error', reject); });
  child.unref();
  try {
    await injectUntilReady({port, executable: info.executable, source});
    console.log('动画已开始，辅助进程退出；播放后保留静态背景。');
  } catch (error) {
    throw new Error(`当前 Codex 版本未能接入动画：${error.message}。\n` +
      'Codex 安装文件未修改。完全退出后从官方图标正常打开即可结束调试状态。\n' +
      '仍可用「预览动画-Win11.cmd」或「预览背景-Win11.cmd」查看完整效果。');
  }
}

export function allowedAsset(pathname) {
  const files = new Set([
    '/', '/index.html', '/animation.js', '/image-settings.js', '/style.css',
    '/assets/avatar.jpg', '/assets/avatar-motion.gif', '/assets/artwork.jpg', '/assets/contours.js', '/assets/theme.js',
    '/.build/extension-preview/', '/.build/extension-preview/index.html',
    '/.build/extension-preview/extension.js', '/.build/extension-preview/controls.js'
  ]);
  if (!files.has(pathname)) return null;
  if (pathname === '/') return 'index.html';
  if (pathname === '/.build/extension-preview/') return '.build/extension-preview/index.html';
  return pathname.slice(1);
}

export async function servePreview() {
  await import('../tools/extension-preview.mjs');
  const mime = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.gif': 'image/gif'};
  const server = createHttpServer(async (request, response) => {
    const pathname = new URL(request.url, origin).pathname;
    if (request.headers.host !== `127.0.0.1:${previewPort}` || !['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(403); response.end(); return;
    }
    if (pathname === '/health') {
      response.writeHead(200, {'Content-Type': 'application/json'});
      response.end(JSON.stringify({marker, root})); return;
    }
    const asset = allowedAsset(pathname);
    if (!asset) { response.writeHead(404); response.end(); return; }
    try {
      const body = await readFile(join(root, asset));
      const extension = asset.slice(asset.lastIndexOf('.'));
      response.writeHead(200, {'Content-Type': (mime[extension] || 'application/octet-stream') +
        (['.jpg','.gif'].includes(extension) ? '' : '; charset=utf-8'), 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff'});
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch { response.writeHead(404); response.end(); }
  });
  await new Promise((fulfill, reject) => {
    server.once('error', reject);
    server.listen(previewPort, '127.0.0.1', fulfill);
  });
  // No startup registration: this preview helper closes itself after 30 minutes.
  const shutdown = setTimeout(() => server.close(), 30 * 60 * 1000);
  shutdown.unref();
  server.once('close', () => clearTimeout(shutdown));
  console.log(`本机动画预览：${origin}\nCtrl+C 可立即结束预览服务，30 分钟后自动退出。`);
  return server;
}

async function previewServer() {
  try {
    const response = await fetch(`${origin}/health`, {signal: AbortSignal.timeout(800), redirect: 'error'});
    const status = await response.json();
    if (status.marker !== marker || status.root !== root) throw new Error('端口被其他项目占用');
    return;
  } catch (error) {
    if (error.message === '端口被其他项目占用') throw error;
  }
  const child = spawn(process.execPath, [join(root, 'windows/launcher.mjs'), '--serve'], {
    detached: true, stdio: 'ignore', windowsHide: true
  });
  await new Promise((fulfill, reject) => { child.once('spawn', fulfill); child.once('error', reject); });
  child.unref();
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(`${origin}/health`, {signal: AbortSignal.timeout(800), redirect: 'error'});
      const status = await response.json();
      if (status.marker !== marker || status.root !== root) throw new Error('端口被其他项目占用');
      return;
    } catch (error) { if (error.message === '端口被其他项目占用') throw error; }
    await delay(100);
  }
  throw new Error('预览服务无法启动，请检查本机端口 18765 是否被占用');
}

async function preview(wallpaper = false) {
  await previewServer();
  const url = origin + (wallpaper ? '/.build/extension-preview/' : '/');
  const browserCandidates = [
    process.env['ProgramFiles(x86)'] && join(process.env['ProgramFiles(x86)'], 'Microsoft/Edge/Application/msedge.exe'),
    process.env.ProgramFiles && join(process.env.ProgramFiles, 'Microsoft/Edge/Application/msedge.exe'),
    process.env.ProgramFiles && join(process.env.ProgramFiles, 'Google/Chrome/Application/chrome.exe'),
    process.env['ProgramFiles(x86)'] && join(process.env['ProgramFiles(x86)'], 'Google/Chrome/Application/chrome.exe'),
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe'),
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Google/Chrome SxS/Application/chrome.exe')
  ].filter(Boolean);
  const browser = (await Promise.all(browserCandidates.map(async path => {
    try { await access(path); return path; } catch { return null; }
  }))).find(Boolean);
  if (browser) {
    const child = spawn(browser, [`--app=${url}`, '--window-size=1100,820'], {
      detached: true, stdio: 'ignore', windowsHide: false
    });
    await new Promise((fulfill, reject) => { child.once('spawn', fulfill); child.once('error', reject); });
    child.unref();
  } else {
    await exec(powershell, ['-NoProfile', '-NonInteractive', '-Command', 'Start-Process $env:AEMEATH_PREVIEW_URL'], {
      windowsHide: true, env: {...process.env, AEMEATH_PREVIEW_URL: url}
    });
  }
  console.log(`已打开预览：${url}\nCtrl+Alt+B 打开设置；Esc 跳过。`);
}

async function main() {
  const mode = process.argv[2] || '--preview';
  if (mode === '--serve') { await servePreview(); return; }
  if (process.platform !== 'win32') throw new Error('此启动入口需要 Windows；其他平台可直接打开 index.html');
  if (mode === '--preview') return preview();
  if (mode === '--wallpaper') return preview(true);
  if (mode === '--launch') return launch();
  if (mode === '--doctor') {
    const info = await findInstallation();
    const {running, ...installation} = info;
    console.log(JSON.stringify({node: process.version, ...installation, running: running.length > 0,
      integration: 'experimental; requires a fresh Codex launch; real app injection has not been verified'}, null, 2));
    return;
  }
  throw new Error(`未知模式：${mode}`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
