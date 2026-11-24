// Разведка рабочего мастера: вход формой, «Тест стилей», список шагов и кнопок → look-*.png
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(HERE, '../../pptr/package.json'));
const puppeteer = require('puppeteer-core');
const BASE = 'https://fabrika.content.jarvis-msk.ru/';
const SITE = '8f763b1a';

const browser = await puppeteer.launch({executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars']});
const page = await browser.newPage();
await page.setViewport({width: 1600, height: 1000});
await page.goto(BASE, {waitUntil: 'networkidle2'});
await page.type('input[name=login]', process.env.FL);
await page.type('input[name=password]', process.env.FP);
await Promise.all([page.waitForNavigation({waitUntil: 'networkidle2'}), page.click('button')]);
await page.goto(BASE + '?site=' + SITE, {waitUntil: 'networkidle2'});
await new Promise((r) => setTimeout(r, 3000));
await page.screenshot({path: path.join(HERE, 'look-1.png')});
console.log(await page.evaluate(() => [...document.querySelectorAll('aside button, nav button')].map((b) => b.textContent.trim()).join(' | ')));
await page.goto(BASE + '?site=' + SITE + '&step=5', {waitUntil: 'networkidle2'});
await new Promise((r) => setTimeout(r, 3000));
await page.screenshot({path: path.join(HERE, 'look-5.png')});
console.log(await page.evaluate(() => document.querySelector('main')?.innerText.slice(0, 1500)));
await browser.close();
