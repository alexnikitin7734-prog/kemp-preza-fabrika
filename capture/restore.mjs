// Вернуть настройки «Теста стилей» из site-backup.json (поле config)
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(HERE, '../../pptr/package.json'));
const puppeteer = require('puppeteer-core');
const BASE = 'https://fabrika.content.jarvis-msk.ru/';
const cfg = JSON.parse(fs.readFileSync(path.join(HERE, 'site-backup.json'), 'utf8')).config;
const browser = await puppeteer.launch({executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new'});
const page = await browser.newPage();
await page.goto(BASE, {waitUntil: 'networkidle2'});
await page.type('input[name=login]', process.env.FL);
await page.type('input[name=password]', process.env.FP);
await Promise.all([page.waitForNavigation({waitUntil: 'networkidle2'}), page.click('button')]);
const res = await page.evaluate(async (c) => {
  const put = await fetch('/api/sites/8f763b1a', {method: 'PUT', headers: {'content-type': 'application/json'}, body: JSON.stringify(c)});
  const putText = (await put.text()).slice(0, 200);
  const g = await fetch('/api/sites/8f763b1a'); const t = await g.text();
  let got = null; try { got = JSON.parse(t); } catch (e) {}
  return {status: put.status, putText, getStatus: g.status, getHead: t.slice(0, 200), same: !!(got && got.config && JSON.stringify(got.config) === JSON.stringify(c))};
}, cfg);
console.log(JSON.stringify(res));
await browser.close();
