import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(HERE, '../../pptr/package.json'));
const puppeteer = require('puppeteer-core');
const OUT = process.argv[2];
const browser = await puppeteer.launch({executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars', '--autoplay-policy=no-user-gesture-required']});
const page = await browser.newPage();
page.on('console', (m) => console.log('console:', m.text()));
page.on('pageerror', (e) => console.log('error:', e.message));
await page.setViewport({width: 1920, height: 1080});
await page.goto(pathToFileURL(path.join(HERE, '../index.html')).href, {waitUntil: 'networkidle2'});
await new Promise((r) => setTimeout(r, 2500));
await page.keyboard.press('ArrowRight');
for (const t of [3, 9]) {
  await new Promise((r) => setTimeout(r, t === 3 ? 3000 : 6000));
  console.log(t, await page.evaluate(() => [document.body.className, document.getElementById('voice').currentTime.toFixed(1), location.hash, [...document.querySelectorAll('#claude .bars i')].map((b) => b.style.transform).join(',')].join(' | ')));
  await page.screenshot({path: path.join(OUT, `talk${t}.png`)});
}
await page.keyboard.press('ArrowRight');
await new Promise((r) => setTimeout(r, 1500));
console.log('after', await page.evaluate(() => [document.body.className, document.getElementById('voice').paused, location.hash].join(' | ')));
await browser.close();
