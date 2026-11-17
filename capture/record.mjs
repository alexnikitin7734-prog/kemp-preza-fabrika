// Запись мастера рабочей Фабрики на «Тесте стилей» для слайда 03 → ../media/workflow.mp4
// Настройки сайта сохраняются до записи и возвращаются после — Маша на нём пробует стили.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(HERE, '../../pptr/package.json'));
const puppeteer = require('puppeteer-core');
const FFMPEG = 'C:/Users/web-heroes10/Downloads/_ffmpeg/ffmpeg-8.1.1-essentials_build/bin/ffmpeg.exe';
const BASE = 'https://fabrika.content.jarvis-msk.ru/';
const SITE = '8f763b1a';
const OUT = path.join(HERE, 'rec');
const FR = path.join(OUT, 'frames');
fs.rmSync(FR, {recursive: true, force: true});
fs.mkdirSync(FR, {recursive: true});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars']});
const page = await browser.newPage();
await page.setViewport({width: 1600, height: 1000, deviceScaleFactor: 1.2});
await page.goto(BASE, {waitUntil: 'networkidle2'});
await page.type('input[name=login]', process.env.FL);
await page.type('input[name=password]', process.env.FP);
await Promise.all([page.waitForNavigation({waitUntil: 'networkidle2'}), page.click('button')]);

const api = (method, body) => page.evaluate(async (m, b, id) => {
  const r = await fetch('/api/sites/' + id, {method: m, headers: b ? {'content-type': 'application/json'} : {}, body: b || undefined});
  return r.text();
}, method, body, SITE);
const backup = await api('GET');
fs.writeFileSync(path.join(HERE, 'site-backup.json'), backup);

const CURSOR = `(() => { if (document.getElementById('__cur')) return;
  const c = document.createElement('div'); c.id = '__cur';
  c.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 2l15 11-6.5 1.2L16 21l-3 1.4-3.3-6.6L4 20z" fill="#141414" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  c.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;pointer-events:none;transform:translate(800px,500px);transition:transform .7s cubic-bezier(.45,0,.2,1);filter:drop-shadow(0 2px 3px rgba(0,0,0,.25))';
  document.documentElement.appendChild(c);
  const st = document.createElement('style'); st.textContent = '@keyframes __rp{from{transform:translate(-50%,-50%) scale(.3);opacity:.6}to{transform:translate(-50%,-50%) scale(1.6);opacity:0}}';
  document.head.appendChild(st);
  window.__move = (x, y) => { c.style.transform = 'translate(' + x + 'px,' + y + 'px)'; };
  window.__ripple = (x, y) => { const r = document.createElement('div'); r.style.cssText = 'position:fixed;left:' + x + 'px;top:' + y + 'px;width:44px;height:44px;border-radius:50%;background:#ffd23a;z-index:99998;pointer-events:none;animation:__rp .5s ease-out forwards'; document.documentElement.appendChild(r); setTimeout(() => r.remove(), 600); };
})()`;

// элемент по селектору и (необязательно) точному тексту
const pos = (sel, text) => page.evaluate((s, t) => {
  const el = [...document.querySelectorAll(s)].find((e) => !t || (t[0] === '~' ? e.textContent.trim().endsWith(t.slice(1)) : e.textContent.trim() === t));
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {x: r.left + r.width / 2, y: r.top + r.height / 2};
}, sel, text);
const click = async (sel, text, after = 1200) => {
  let p = null;
  for (let i = 0; i < 40 && !p; i++) { p = await pos(sel, text); if (!p) await sleep(250); }
  if (!p) throw new Error('нет ' + sel + ' ' + (text || ''));
  await page.evaluate(CURSOR);
  await page.evaluate((x, y) => window.__move(x, y), p.x, p.y);
  await sleep(800);
  await page.evaluate((x, y) => window.__ripple(x, y), p.x, p.y);
  await page.mouse.click(p.x, p.y);
  await sleep(after);
};

let frames = [];
try {
  await page.goto(BASE + '?site=' + SITE + '&step=5', {waitUntil: 'networkidle2'});
  await sleep(2500);
  console.log(await page.evaluate(() => [...document.querySelectorAll('aside *')].filter((e) => /Главная/.test(e.textContent) && e.childElementCount <= 3).map((e) => e.tagName + '.' + e.className + ':' + e.textContent.trim()).slice(0, 6).join(' | ')));
  await page.evaluate(() => [...document.querySelectorAll('aside button, aside a, aside li, nav button')].find((e) => /Главная$/.test(e.textContent.trim())).click());
  await sleep(2500);
  if (process.env.DIAG) {
    await page.screenshot({path: path.join(HERE, 'look-home.png')});
    console.log(await page.evaluate(() => [...document.querySelectorAll('main button')].slice(0, 30).map((b) => b.className + ':' + (b.getAttribute('aria-label') || b.textContent).trim().slice(0, 25)).join(' | ')));
    throw new Error('DIAG');
  }
  await page.evaluate(CURSOR);

  const cdp = await page.createCDPSession();
  cdp.on('Page.screencastFrame', async ({data, metadata, sessionId}) => {
    const n = frames.length;
    frames.push(metadata.timestamp);
    fs.writeFileSync(path.join(FR, `${String(n).padStart(5, '0')}.jpg`), Buffer.from(data, 'base64'));
    cdp.send('Page.screencastFrameAck', {sessionId}).catch(() => {});
  });
  await cdp.send('Page.startScreencast', {format: 'jpeg', quality: 88, maxWidth: 1920, maxHeight: 1200, everyNthFrame: 1});
  await sleep(1200);

  // главная: у блока 5 вариантов — листаем первый экран
  await click('.sl-arrow[aria-label="Следующий вариант"]', null, 1800);
  await click('.sl-arrow[aria-label="Следующий вариант"]', null, 1800);

  // стиль художника
  await click('nav button, aside button', '~Стиль и цвет', 1500);
  await click('.fold-head', null, 1000);
  for (const name of ['Мо-Фокеев', 'Матисс', 'Лисицкий', 'Вырезка']) await click('.fold.open .seg button', name, 2600);

  // превью: каталог и карточка в том же стиле
  await click('button', 'Каталог', 2600);
  await click('button', 'Карточка', 2800);
  await click('button', 'Главная', 2000);

  // публикация: показываем шаг, ничего не нажимаем
  await click('nav button, aside button', '~Публикация', 3000);
  await cdp.send('Page.stopScreencast');
} finally {
  const r = await api('PUT', JSON.stringify(JSON.parse(backup).config));
  const now = JSON.parse(await api('GET')).config;
  console.log('настройки сайта возвращены, совпадают с копией:', JSON.stringify(now) === JSON.stringify(JSON.parse(backup).config));
  await browser.close();
}

const list = frames.map((t, i) => `file 'frames/${String(i).padStart(5, '0')}.jpg'\nduration ${((frames[i + 1] ?? t + 0.04) - t).toFixed(4)}`).join('\n');
fs.writeFileSync(path.join(OUT, 'list.txt'), list + `\nfile 'frames/${String(frames.length - 1).padStart(5, '0')}.jpg'\n`);
execFileSync(FFMPEG, ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(OUT, 'list.txt'), '-vf', 'scale=1920:1200:flags=lanczos,fps=30,format=yuv420p',
  '-c:v', 'libx264', '-crf', '22', '-preset', 'medium', '-an', path.join(HERE, '../media/workflow.mp4')], {cwd: OUT});
console.log('кадров', frames.length, '→ media/workflow.mp4');
