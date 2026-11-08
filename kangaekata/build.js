// 使い方: node build.js  （katex と playwright が必要）
const fs = require('fs');
const path = require('path');
const katex = require('katex');
const { chromium } = require('playwright');

const src = fs.readFileSync(path.join(__dirname, 'kangaekata.txt'), 'utf8');
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

const units = [];
for (const raw of src.split('\n')) {
  const line = raw.trim();
  if (!line) continue;
  const tag = line.split(' ')[0], rest = line.slice(tag.length + 1).trim();
  const u = units.at(-1), ex = u?.examples.at(-1);
  switch (tag) {
    case '#': { const [subj, name] = rest.split('|').map(x => x.trim()); units.push({ subj, name, core: '', paras: [], points: [], mark: '', examples: [] }); break; }
    case 'V': u.core = rest; break;
    case 'P': u.paras.push(rest); break;
    case '-': u.points.push(rest); break;
    case 'M': u.mark = rest.replace(/^見分け方：/, ''); break;
    case '###': u.examples.push({ title: rest, q: '', flow: [] }); break;
    case 'Q': ex.q = rest; break;
    case 'T': case 'W': case 'K': case 'R': ex.flow.push({ tag, text: rest }); break;
    default: throw new Error('bad line: ' + line);
  }
}

const colors = { '数I': '#1f6feb', '数A': '#0f8a5f', '数II': '#c2410c', '数B': '#7c3aed', '数C': '#0e7490' };
const label = { T: '考える', W: '書く', K: 'ポイント', R: '答' };
let exNo = 0, toc = '', body = '';
units.forEach((u, i) => {
  const c = colors[u.subj];
  toc += `<li style="--c:${c}"><span class="tag">${u.subj}</span><a href="#u${i}"><b>${esc(u.name)}</b><br><span class="tc">${inline(u.core)}</span></a></li>`;
  body += `<section class="unit" id="u${i}" style="--c:${c}">
    <div class="uh"><span class="subj">${u.subj}</span>${esc(u.name)}</div>
    <div class="core"><div class="cl">この単元の見方</div>${inline(u.core)}</div>
    ${u.paras.map(p => `<p class="para">${inline(p)}</p>`).join('')}
    <ul class="pts">${u.points.map(p => `<li>${inline(p)}</li>`).join('')}</ul>
    <div class="mark"><b>見分け方</b>　${inline(u.mark)}</div>`;
  u.examples.forEach(ex => {
    exNo++;
    let step = 0;
    body += `<article class="ex"><div class="exh"><span class="exno">例題 ${exNo}</span>${inline(ex.title)}</div>
      <div class="q">${inline(ex.q)}</div><div class="flow">` +
      ex.flow.map(f => {
        if (f.tag === 'T') step++;
        return `<div class="f ${f.tag}"><span class="fl">${f.tag === 'T' ? step : ''}${label[f.tag]}</span><div class="ft">${inline(f.text)}</div></div>`;
      }).join('') + '</div></article>';
  });
  body += '</section>';
});

const katexCss = path.join(path.dirname(require.resolve('katex')), 'katex.min.css');
const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8">
<link rel="stylesheet" href="file://${katexCss}">
<style>
body { font-family: "IPAPGothic", "IPAGothic", sans-serif; font-size: 9.8pt; line-height: 1.65; color: #1d1f23; margin: 0; }
.cover { height: 250mm; display: flex; flex-direction: column; justify-content: center; page-break-after: always; }
.cover .kicker { color: #666; letter-spacing: .3em; font-size: 11pt; }
.cover h1 { font-size: 32pt; margin: 6mm 0 4mm; color: #111; line-height: 1.3; }
.cover p { font-size: 11pt; color: #444; max-width: 155mm; }
.cover .how { margin-top: 6mm; border-left: 4px solid #1f6feb; padding: 3mm 5mm; background: #f3f6fb; font-size: 10pt; max-width: 155mm; }
.legend { margin-top: 6mm; font-size: 9.5pt; }
.legend span { display: inline-block; margin-right: 4mm; }
.toc { page-break-after: always; }
.toc h2 { font-size: 18pt; margin: 0 0 4mm; }
.toc ol { list-style: none; padding: 0; margin: 0; }
.toc li { display: flex; gap: 3mm; padding: 2mm 0; border-bottom: 1px solid #e5e7ea; }
.toc a { color: inherit; text-decoration: none; }
.toc .tag { flex: 0 0 11mm; height: 5mm; line-height: 5mm; text-align: center; font-size: 8pt; color: #fff; background: var(--c); border-radius: 1mm; margin-top: 1mm; }
.toc .tc { color: #555; font-size: 9pt; }
.unit { page-break-before: always; }
.uh { font-size: 19pt; font-weight: bold; color: #fff; background: var(--c); padding: 2.5mm 5mm; border-radius: 2mm; }
.subj { font-size: 10pt; background: rgba(255,255,255,.25); border-radius: 1mm; padding: .5mm 2mm; margin-right: 3mm; vertical-align: 3px; }
.core { margin: 4mm 0 3mm; font-size: 14pt; font-weight: bold; color: var(--c); border: 2px solid var(--c); border-radius: 2mm; padding: 2.5mm 4mm; }
.cl { font-size: 8.5pt; color: #666; font-weight: normal; }
.para { margin: 2mm 0; }
.pts { margin: 2mm 0 3mm; padding-left: 6mm; } .pts li { margin: 1mm 0; }
.mark { background: color-mix(in srgb, var(--c) 9%, white); border-radius: 1.5mm; padding: 2mm 3.5mm; margin-bottom: 5mm; }
.mark b { color: var(--c); }
.ex { border: 1px solid #dfe2e6; border-radius: 2mm; padding: 3mm 4mm; margin-bottom: 5mm; break-inside: avoid; }
.exh { font-size: 12pt; font-weight: bold; margin-bottom: 1.5mm; }
.exno { font-size: 8.5pt; color: #fff; background: #333; border-radius: 1mm; padding: .3mm 2mm; margin-right: 2.5mm; vertical-align: 2px; }
.q { background: #f4f5f6; border-left: 3px solid #333; padding: 2mm 3mm; margin-bottom: 2.5mm; }
.flow { position: relative; }
.f { display: flex; gap: 3mm; padding: 1mm 0; }
.fl { flex: 0 0 15mm; font-size: 8pt; font-weight: bold; text-align: center; border-radius: 1mm; height: 5mm; line-height: 5mm; margin-top: .6mm; }
.ft { flex: 1; }
.f.T .fl { background: color-mix(in srgb, var(--c) 15%, white); color: var(--c); }
.f.T .ft { color: #333; }
.f.W { padding-left: 0; } .f.W .fl { color: #777; border: 1px solid #ccc; }
.f.W .ft { font-family: inherit; background: #fafafa; border-radius: 1mm; padding: 0 2mm; }
.f.K .fl { background: #f59e0b; color: #fff; }
.f.K .ft { font-weight: bold; color: #92400e; }
.f.R .fl { background: var(--c); color: #fff; }
.f.R .ft { font-weight: bold; }
strong { color: var(--c); }
.katex { font-size: 1.04em; }
</style></head><body>
<div class="cover">
  <div class="kicker">HOW TO THINK IN EXAM MATH</div>
  <h1>入試数学<br>単元別「考え方」ノート</h1>
  <p>公式や解法を暗記するだけでは、初めて見る入試問題で手が止まってしまいます。このノートでは単元ごとに、<b>その単元の問題をどういう目で見るか</b>をまとめ、そのあとで<b>解くときの頭の中を1行ずつ実況</b>しました（${units.length}単元・例題${exNo}問）。範囲は数学I・A・II・B・C（ベクトル）です。</p>
  <div class="how"><b>使い方</b><br>
  ① 単元の最初の「この単元の見方」と「見分け方」を読み、問題のどこを見るかを頭に入れる。<br>
  ② 例題は、まず自分で解いてみる。そのあと実況を読み、<b>自分の考えとどこで分かれたか</b>を確かめる。<br>
  ③ 過去問で手が止まったら「見分け方」に戻り、どの見方が使えるかを探す。</div>
  <div class="legend"><span>実況の記号：</span><span><b>考える</b> 頭の中</span><span><b>書く</b> 答案に書く式</span><span><b style="color:#b45309">ポイント</b> 突破口</span><span><b>答</b></span></div>
</div>
<div class="toc"><h2>目次</h2><ol>${toc}</ol></div>
${body}
</body></html>`;

const outHtml = path.join(__dirname, 'kangaekata.html');
fs.writeFileSync(outHtml, html);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + outHtml, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({
    path: path.join(__dirname, '入試数学_考え方ノート.pdf'), format: 'A4', printBackground: true,
    displayHeaderFooter: true, headerTemplate: '<span></span>',
    footerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#888"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    margin: { top: '14mm', bottom: '16mm', left: '14mm', right: '14mm' },
  });
  await browser.close();
  console.log('units:', units.length, 'examples:', exNo);
})();
