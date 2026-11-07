// 使い方: node build.js  （katex と playwright が必要）
const fs = require('fs');
const path = require('path');
const katex = require('katex');
const { chromium } = require('playwright');

const src = fs.readFileSync(path.join(__dirname, 'joseki.txt'), 'utf8');
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function inline(text) {
  let bold = false;
  const out = text.split(/(\$[^$]+\$)/).map(p => {
    if (p.startsWith('$') && p.endsWith('$') && p.length > 1)
      return katex.renderToString(p.slice(1, -1), { throwOnError: true });
    return esc(p).replace(/\*\*/g, () => (bold = !bold) ? '<strong>' : '</strong>');
  }).join('');
  if (bold) throw new Error('unclosed **: ' + text);
  return out;
}

const subjects = [];
let cur = null;
for (const raw of src.split('\n')) {
  const line = raw.trim();
  if (!line) continue;
  const tag = line.split(' ')[0], rest = line.slice(tag.length + 1).trim();
  const s = subjects.at(-1), u = s?.units.at(-1);
  switch (tag) {
    case '#': { const [key, title] = rest.split('|').map(x => x.trim()); subjects.push({ key, title, units: [] }); break; }
    case '##': s.units.push({ name: rest, items: [] }); break;
    case '###': cur = { title: rest, signal: '', steps: [], q: '', a: [], note: '' }; u.items.push(cur); break;
    case '?': cur.signal = rest; break;
    case '-': cur.steps.push(rest); break;
    case 'Q': cur.q = rest; break;
    case 'A': cur.a.push(rest); break;
    case '!': cur.note = rest; break;
    default: throw new Error('bad line: ' + line);
  }
}

const colors = { '全般': '#4b5563', '整数': '#1f6feb', '確率': '#0f8a5f', '関数': '#c2410c',
  '図形': '#0e7490', '三角・指数対数': '#7c3aed', '微積': '#be123c', '数列': '#a16207' };

let n = 0, toc = '', body = '';
subjects.forEach(s => {
  const c = colors[s.key] || '#333';
  toc += `<div class="toc-sub" style="--c:${c}"><div class="toc-h">${esc(s.title)}</div><ol>`;
  body += `<section class="subject" style="--c:${c}"><h1>${esc(s.title)}</h1>`;
  s.units.forEach(u => {
    body += `<h2>${esc(u.name)}</h2>`;
    u.items.forEach(it => {
      n++;
      toc += `<li value="${n}"><a href="#j${n}">${inline(it.title)}</a></li>`;
      body += `<article class="card" id="j${n}">
        <div class="ttl"><span class="no">定石 ${n}</span>${inline(it.title)}</div>
        <div class="sig"><span class="lbl">こう出たら</span>${inline(it.signal)}</div>
        <ol class="steps">${it.steps.map(x => `<li>${inline(x)}</li>`).join('')}</ol>
        <div class="ex"><div class="q"><span class="lbl q">例題</span>${inline(it.q)}</div>
        <div class="a"><span class="lbl a">解答の要点</span>${it.a.map(x => `<p>${inline(x)}</p>`).join('')}</div></div>
        ${it.note ? `<div class="note">注意：${inline(it.note)}</div>` : ''}
      </article>`;
    });
  });
  toc += '</ol></div>';
  body += '</section>';
});

const katexCss = path.join(path.dirname(require.resolve('katex')), 'katex.min.css');
const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8">
<link rel="stylesheet" href="file://${katexCss}">
<style>
body { font-family: "IPAPGothic", "IPAGothic", sans-serif; font-size: 9.8pt; line-height: 1.6; color: #1d1f23; margin: 0; }
.cover { height: 250mm; display: flex; flex-direction: column; justify-content: center; page-break-after: always; }
.cover .kicker { color: #666; letter-spacing: .3em; font-size: 11pt; }
.cover h1 { font-size: 32pt; margin: 6mm 0 4mm; color: #111; }
.cover p { font-size: 11pt; color: #444; max-width: 150mm; }
.cover .how { margin-top: 8mm; border-left: 4px solid #1f6feb; padding: 3mm 5mm; background: #f3f6fb; font-size: 10pt; max-width: 150mm; }
.toc { page-break-after: always; columns: 2; column-gap: 9mm; font-size: 9pt; }
.toc-title { font-size: 18pt; font-weight: bold; margin-bottom: 4mm; column-span: all; }
.toc-sub { break-inside: avoid; margin-bottom: 4mm; }
.toc-h { font-weight: bold; color: var(--c); border-bottom: 2px solid var(--c); margin-bottom: 1mm; font-size: 11pt; }
.toc ol { margin: 0; padding-left: 7mm; } .toc a { color: inherit; text-decoration: none; }
.subject { page-break-before: always; }
.subject h1 { font-size: 19pt; color: #fff; background: var(--c); padding: 2.5mm 5mm; border-radius: 2mm; margin: 0 0 3mm; }
h2 { font-size: 12pt; color: var(--c); margin: 3mm 0 3mm; }
.card { border: 1px solid #dfe2e6; border-top: 4px solid var(--c); border-radius: 2mm; padding: 3mm 4.5mm 3.5mm; margin-bottom: 5mm; break-inside: avoid; }
.ttl { font-size: 13pt; font-weight: bold; margin-bottom: 2mm; }
.no { display: inline-block; font-size: 8.5pt; color: #fff; background: var(--c); border-radius: 1mm; padding: .3mm 2mm; margin-right: 2.5mm; vertical-align: 2px; }
.lbl { display: inline-block; font-size: 8pt; font-weight: bold; border: 1px solid var(--c); color: var(--c); border-radius: 1mm; padding: 0 1.6mm; margin-right: 2mm; }
.sig { background: color-mix(in srgb, var(--c) 9%, white); padding: 1.6mm 3mm; border-radius: 1.5mm; }
.steps { margin: 2mm 0 2.5mm; padding-left: 6mm; } .steps li { margin: .6mm 0; }
.ex { border-top: 1px dashed #c9cdd2; padding-top: 2mm; }
.q { margin-bottom: 1.6mm; }
.lbl.q { background: #333; color: #fff; border-color: #333; }
.a { background: #f7f8f9; padding: 1.8mm 3mm; border-radius: 1.5mm; }
.a p { margin: .5mm 0; }
.note { margin-top: 2mm; font-size: 9pt; color: #8a4b00; }
strong { color: var(--c); }
.katex { font-size: 1.04em; }
</style></head><body>
<div class="cover">
  <div class="kicker">ENTRANCE EXAM MATHEMATICS</div>
  <h1>入試数学 解法の定石</h1>
  <p>大学入試の記述問題で「問題文のこの形を見たら、この方針で解く」という解法パターンを ${n} 個まとめました。範囲は文系数学（数学I・A・II・B・C）です。一橋大学でよく出る整数・確率・微積分を厚めにしています。</p>
  <div class="how"><b>使い方</b><br>
  ① 「こう出たら」を読んで、問題文のどこを見ればこの定石を使うと判断できるかを覚える。<br>
  ② 例題を自分で解いてから「解答の要点」で答え合わせをする。<br>
  ③ 過去問で手が止まったら目次に戻り、使える定石を探す。</div>
</div>
<div class="toc"><div class="toc-title">目次</div>${toc}</div>
${body}
</body></html>`;

const outHtml = path.join(__dirname, 'nyushi-joseki.html');
fs.writeFileSync(outHtml, html);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + outHtml, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({
    path: path.join(__dirname, '入試数学_解法の定石.pdf'), format: 'A4', printBackground: true,
    displayHeaderFooter: true, headerTemplate: '<span></span>',
    footerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#888"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    margin: { top: '14mm', bottom: '16mm', left: '14mm', right: '14mm' },
  });
  await browser.close();
  console.log('items:', n);
})();
