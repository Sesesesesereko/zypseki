// 使い方: node build.js  （katex と playwright が必要）
const fs = require('fs');
const path = require('path');
const katex = require('katex');
const { chromium } = require('playwright');

const src = fs.readFileSync(path.join(__dirname, 'joseki.txt'), 'utf8');
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// $...$ を KaTeX に、**...** を強調に
function inline(text) {
  const parts = text.split(/(\$[^$]+\$)/);
  let bold = false; // ** は数式をまたいでもよい
  const out = parts.map(p => {
    if (p.startsWith('$') && p.endsWith('$') && p.length > 1)
      return katex.renderToString(p.slice(1, -1), { throwOnError: true });
    return esc(p).replace(/\*\*/g, () => (bold = !bold) ? '<strong>' : '</strong>');
  }).join('');
  if (bold) throw new Error('unclosed **: ' + text);
  return out;
}

const subjects = [];
for (const raw of src.split('\n')) {
  const line = raw.trim();
  if (!line) continue;
  if (line.startsWith('## ')) subjects.at(-1).units.push({ name: line.slice(3), rows: [] });
  else if (line.startsWith('# ')) {
    const [key, title] = line.slice(2).split('|').map(s => s.trim());
    subjects.push({ key, title, units: [] });
  } else {
    const [when, how] = line.split('::').map(s => s.trim());
    if (!how) throw new Error('bad line: ' + line);
    subjects.at(-1).units.at(-1).rows.push({ when, how });
  }
}

const colors = { '共通': '#5b5f66', '数学I': '#1f6feb', '数学A': '#0f8a5f', '数学II': '#c2410c',
  '数学B': '#7c3aed', '数学III': '#be123c', '数学C': '#0e7490' };

let total = 0;
let toc = '', body = '';
subjects.forEach((s, si) => {
  const c = colors[s.key] || '#333';
  toc += `<div class="toc-sub" style="--c:${c}"><div class="toc-h">${esc(s.title)}</div><ul>` +
    s.units.map((u, ui) => `<li><a href="#u${si}-${ui}">${esc(u.name)}</a></li>`).join('') + '</ul></div>';
  body += `<section class="subject" style="--c:${c}"><h1>${esc(s.title)}</h1>`;
  s.units.forEach((u, ui) => {
    total += u.rows.length;
    body += `<h2 id="u${si}-${ui}">${esc(u.name)}</h2><table><thead><tr><th class="w">こんなとき</th><th>定石</th></tr></thead><tbody>` +
      u.rows.map(r => `<tr><td class="w">${inline(r.when)}</td><td>${inline(r.how)}</td></tr>`).join('') +
      '</tbody></table>';
  });
  body += '</section>';
});

const katexCss = path.join(path.dirname(require.resolve('katex')), 'katex.min.css');
const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8">
<link rel="stylesheet" href="file://${katexCss}">
<style>
@page { size: A4; margin: 14mm 13mm 16mm; }
body { font-family: "IPAPGothic", "IPAGothic", sans-serif; font-size: 9.6pt; line-height: 1.55; color: #1d1f23; margin: 0; }
.cover { height: 250mm; display: flex; flex-direction: column; justify-content: center; page-break-after: always; }
.cover .kicker { color: #666; letter-spacing: .3em; font-size: 11pt; }
.cover h1 { font-size: 34pt; margin: 6mm 0 4mm; border: 0; padding: 0; color: #111; }
.cover p { font-size: 11pt; color: #444; max-width: 140mm; }
.cover .how { margin-top: 10mm; border-left: 4px solid #1f6feb; padding: 3mm 5mm; background: #f3f6fb; font-size: 10pt; }
.toc { page-break-after: always; columns: 2; column-gap: 10mm; }
.toc-title { font-size: 18pt; font-weight: bold; margin-bottom: 4mm; column-span: all; }
.toc-sub { break-inside: avoid; margin-bottom: 5mm; }
.toc-h { font-weight: bold; color: var(--c); border-bottom: 2px solid var(--c); padding-bottom: 1mm; margin-bottom: 1.5mm; font-size: 12pt; }
.toc ul { margin: 0; padding-left: 5mm; } .toc a { color: inherit; text-decoration: none; }
.subject { page-break-before: always; }
.subject h1 { font-size: 20pt; color: #fff; background: var(--c); padding: 2.5mm 5mm; border-radius: 2mm; margin: 0 0 4mm; }
h2 { font-size: 13pt; color: var(--c); border-left: 5px solid var(--c); padding-left: 3mm; margin: 6mm 0 2mm; break-after: avoid; }
table { width: 100%; border-collapse: collapse; }
thead th { background: color-mix(in srgb, var(--c) 14%, white); color: #222; text-align: left; padding: 1.4mm 2.5mm; font-size: 9pt; }
td { padding: 1.6mm 2.5mm; border-bottom: 1px solid #e3e5e8; vertical-align: top; }
tr { break-inside: avoid; }
td.w, th.w { width: 37%; }
td.w { color: #333; background: #fafafb; }
strong { color: var(--c); }
.katex { font-size: 1.04em; }
</style></head><body>
<div class="cover">
  <div class="kicker">HIGH SCHOOL MATHEMATICS</div>
  <h1>単元別 数学の定石集</h1>
  <p>数学I・A・II・B・III・C の全単元について、「この形が出たら、まずこう考える」という定石を ${total} 項目にまとめました。</p>
  <div class="how"><b>使い方</b><br>左列「こんなとき」は問題の見た目・条件、右列「定石」は最初に試すべき手。問題を解く前に左列を見て、手が止まったら右列を思い出す――という往復で身につけてください。</div>
</div>
<div class="toc"><div class="toc-title">目次</div>${toc}</div>
${body}
</body></html>`;

const outHtml = path.join(__dirname, 'math-joseki.html');
fs.writeFileSync(outHtml, html);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + outHtml, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({
    path: path.join(__dirname, '数学の定石集.pdf'), format: 'A4', printBackground: true,
    displayHeaderFooter: true, headerTemplate: '<span></span>',
    footerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#888"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    margin: { top: '14mm', bottom: '16mm', left: '13mm', right: '13mm' },
  });
  await browser.close();
  console.log('items:', total);
})();
