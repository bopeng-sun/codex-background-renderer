// Optional maintainer QA; runtime pages have no external dependencies.
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {dirname,join,resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const root=dirname(dirname(fileURLToPath(import.meta.url))),site=join(root,'.build/site'),prefix='/codex-background-renderer/',out=join(root,'.build/web-qa');
await mkdir(out,{recursive:true});
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.jpg':'image/jpeg','.gif':'image/gif','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{try{let path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(!path.startsWith(prefix))throw new Error();path=path.slice(prefix.length);if(!path||path.endsWith('/'))path+='index.html';const file=resolve(site,path);if(!file.startsWith(resolve(site)+sep))throw new Error();const body=await readFile(file);res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');res.end(body)}catch{res.writeHead(404);res.end('Not found')}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}${prefix}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXE||undefined});
const context=await browser.newContext({viewport:{width:1365,height:900},reducedMotion:'no-preference'}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(base);await page.screenshot({path:join(out,'home.png'),fullPage:true});
 assert.equal(await page.locator('h1').count(),1);assert.equal(await page.locator('a[href="animation/?settings=1"]').count(),1);
 await page.goto(base+'animation/?settings=1');await page.locator('#settings-dialog').waitFor({state:'visible'});
 await page.locator('#intro-title').fill('我的工作空间');await page.locator('#avatar-file').setInputFiles(join(root,'assets/avatar-motion.gif'));
 await page.locator('#preview-images').click();await page.locator('#settings-dialog').waitFor({state:'hidden'});await page.reload();
 await page.waitForFunction(()=>document.querySelector('.boot-title').textContent==='我的工作空间');
 const imported=await page.evaluate(()=>window.imageSettings.load());assert.ok(imported.avatar.startsWith('data:image/gif;base64,'));
 await page.locator('#settings-dialog .settings-close').click();
 await page.waitForFunction(()=>document.querySelector('.window').dataset.completed==='true',null,{timeout:25000});
 await page.goto(base+'background/');await page.waitForFunction(()=>window.__aemeathExtension?.status().completed,null,{timeout:25000});
 const status=await page.evaluate(()=>window.__aemeathExtension.status());assert.equal(status.wallpaper,true);assert.equal(status.overlay,false);
 await page.locator('textarea').fill('自定义背景后的输入测试');await page.locator('#ready').click();assert.equal(await page.locator('#ready').textContent(),'点击成功');
 await page.screenshot({path:join(out,'background.png')});await page.locator('#settings').click();
 const frame=page.frameLocator('#aemeath-extension-overlay');await frame.locator('#settings-dialog').waitFor({state:'visible'});await frame.locator('#restore-appearance').click();
 await page.waitForFunction(()=>!window.__aemeathExtension);assert.deepEqual(errors,[]);
 await page.setViewportSize({width:390,height:844});await page.goto(base);await page.screenshot({path:join(out,'mobile.png'),fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const report={passed:true,subpath:prefix,settingsDeepLink:true,gifImport:true,persistedTitle:true,animationCompleted:true,backgroundCompleted:true,restore:true,mobileNoOverflow:true,errors,realCodexIntegration:'not tested'};
 await writeFile(join(out,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}catch(error){await page.screenshot({path:join(out,'failure.png')});console.log(JSON.stringify({error:error.message,errors,title:await page.locator('.boot-title').textContent().catch(()=>null),settings:await page.evaluate(async()=>{const s=await window.imageSettings?.load();return s?{keys:Object.keys(s),title:s.introTitle,themeId:s.themeId}:null}).catch(()=>null)},null,2));throw error}finally{await context.close();await browser.close();await new Promise(r=>server.close(r))}
