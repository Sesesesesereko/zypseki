// スマホ向けWebページ版を web/ に出力する。使い方: node build-web.js
const fs = require('fs');
const path = require('path');
const katex = require('katex');

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

const subjVar = { '数I': 'i', '数A': 'a', '数II': 'ii', '数B': 'b', '数C': 'c' };
const label = { T: '考える', W: '書く', K: 'ポイント', R: '答' };
let exNo = 0, nav = '', toc = '', body = '';
units.forEach((u, i) => {
  const c = `var(--s-${subjVar[u.subj]})`;
  nav += `<a href="#u${i}" style="--c:${c}">${esc(u.name)}</a>`;
  toc += `<li><a href="#u${i}" style="--c:${c}"><span class="tag">${u.subj}</span><span><b>${esc(u.name)}</b><small>${inline(u.core)}</small></span></a></li>`;
  body += `<section class="unit" id="u${i}" style="--c:${c}">
    <h2><span class="tag">${u.subj}</span>${esc(u.name)}</h2>
    <div class="core"><span class="eyebrow">この単元の見方</span><p>${inline(u.core)}</p></div>
    ${u.paras.map(p => `<p>${inline(p)}</p>`).join('')}
    <ul class="pts">${u.points.map(p => `<li>${inline(p)}</li>`).join('')}</ul>
    <div class="mark"><span class="eyebrow">見分け方</span><p>${inline(u.mark)}</p></div>`;
  u.examples.forEach(ex => {
    exNo++;
    let step = 0;
    body += `<article class="ex"><h3><span class="no">例題 ${exNo}</span>${inline(ex.title)}</h3>
      <div class="q">${inline(ex.q)}</div>
      <details><summary>自分で解いてから、頭の中の実況を見る</summary><ol class="flow">` +
      ex.flow.map(f => {
        if (f.tag === 'T') step++;
        return `<li class="f ${f.tag}"><span class="fl">${f.tag === 'T' ? step : ''}${label[f.tag]}</span><div class="ft">${inline(f.text)}</div></li>`;
      }).join('') + '</ol></details></article>';
  });
  body += '</section>';
});

const kdir = path.dirname(require.resolve('katex'));
const katexCss = fs.readFileSync(path.join(kdir, 'katex.min.css'), 'utf8');
const out = path.join(__dirname, 'web');
fs.mkdirSync(path.join(out, 'fonts'), { recursive: true });
for (const f of fs.readdirSync(path.join(kdir, 'fonts')).filter(f => f.endsWith('.woff2')))
  fs.copyFileSync(path.join(kdir, 'fonts', f), path.join(out, 'fonts', f));

const html = `<title>入試数学 考え方ノート</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap">
<style>${katexCss}</style>
<style>
/* 1カラムの読み物。上部に単元ジャンプのチップ列、例題の実況は折りたたみ */
:root {
  --bg: #f7f8f6; --surface: #ffffff; --fg: #1c1f1d; --muted: #5d655f; --line: #dfe3df; --tint: #eef1ee;
  --key: #9a4a00; --key-bg: #fff3e2;
  --s-i: #1d5fd1; --s-a: #0b7a52; --s-ii: #b8430c; --s-b: #6b3fc9; --s-c: #0b6f86;
  --font: "Zen Kaku Gothic New", "Hiragino Sans", "Noto Sans JP", "Yu Gothic", sans-serif;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --bg: #141715; --surface: #1c201e; --fg: #e8ece9; --muted: #a2aba5; --line: #2f3532; --tint: #232825;
  --key: #ffb35c; --key-bg: #3a2a15;
  --s-i: #7aa7ff; --s-a: #4fcf98; --s-ii: #ff9a5c; --s-b: #b597ff; --s-c: #5cc8e0; color-scheme: dark } }
:root[data-theme="dark"] {
  --bg: #141715; --surface: #1c201e; --fg: #e8ece9; --muted: #a2aba5; --line: #2f3532; --tint: #232825;
  --key: #ffb35c; --key-bg: #3a2a15;
  --s-i: #7aa7ff; --s-a: #4fcf98; --s-ii: #ff9a5c; --s-b: #b597ff; --s-c: #5cc8e0; color-scheme: dark }
body { background: var(--bg); color: var(--fg); font-family: var(--font); font-size: 16px; line-height: 1.75; }
body::before { content: ""; position: fixed; inset: 0 0 auto; height: env(safe-area-inset-top, 0px); z-index: 10; background: var(--bg); }
.wrap { max-width: 42rem; margin: 0 auto; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 0 4rem; }
header.top { padding-block: 1.75rem 1rem; }
header.top .kicker { font-size: .75rem; letter-spacing: .12em; color: var(--muted); }
h1 { font-size: 1.75rem; line-height: 1.3; margin: .3rem 0 .6rem; text-wrap: balance; }
header.top p { margin: .4rem 0; color: var(--muted); font-size: .95rem; }
nav.chips { position: sticky; top: env(safe-area-inset-top, 0px); z-index: 5; background: var(--bg); border-bottom: 1px solid var(--line); }
nav.chips .row { display: flex; gap: .4rem; overflow-x: auto; padding-block: .6rem; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); scrollbar-width: none; max-width: 42rem; margin: 0 auto; }
nav.chips .row::-webkit-scrollbar { display: none; }
nav.chips a { flex: none; font-size: .8rem; text-decoration: none; color: var(--c); border: 1px solid var(--c); border-radius: 999px; padding: .2rem .7rem; white-space: nowrap; }
nav.chips a:focus-visible, summary:focus-visible, .toc a:focus-visible { outline: 2px solid var(--c, var(--s-i)); outline-offset: 2px; }
.toc { list-style: none; padding: 0; margin: 1.25rem 0 0; display: grid; gap: .5rem; }
.toc a { display: flex; gap: .7rem; align-items: flex-start; text-decoration: none; color: var(--fg); background: var(--surface); border: 1px solid var(--line); border-radius: .6rem; padding: .7rem .8rem; }
.toc a > span:last-child { min-width: 0; }
.toc small { display: block; color: var(--muted); font-size: .82rem; line-height: 1.5; margin-top: .15rem; }
.tag { flex: none; display: inline-block; font-size: .7rem; font-weight: 700; color: var(--bg); background: var(--c); border-radius: .3rem; padding: .05rem .4rem; line-height: 1.6; }
.unit { scroll-margin-top: 3.5rem; padding-top: 2.5rem; }
.unit h2 { font-size: 1.45rem; margin: 0 0 .8rem; display: flex; align-items: center; gap: .55rem; color: var(--c); text-wrap: balance; }
.eyebrow { display: block; font-size: .72rem; letter-spacing: .08em; color: var(--muted); font-weight: 500; }
.core { border-left: 4px solid var(--c); padding: .2rem 0 .2rem .9rem; margin-bottom: 1rem; }
.core p { margin: .1rem 0 0; font-size: 1.15rem; font-weight: 700; line-height: 1.55; }
.unit > p { margin: .6rem 0; }
.pts { padding-left: 1.2rem; margin: .8rem 0; } .pts li { margin: .35rem 0; }
.mark { background: var(--tint); border-radius: .6rem; padding: .7rem .9rem; margin: 1rem 0 1.25rem; }
.mark .eyebrow { color: var(--c); font-weight: 700; }
.mark p { margin: .15rem 0 0; font-size: .95rem; }
strong { color: var(--c); }
.ex { background: var(--surface); border: 1px solid var(--line); border-radius: .75rem; padding: .9rem .9rem 1rem; margin-top: 1rem; }
.ex h3 { font-size: 1.05rem; margin: 0 0 .6rem; line-height: 1.5; }
.no { display: inline-block; font-size: .72rem; font-weight: 700; color: var(--muted); border: 1px solid var(--line); border-radius: .3rem; padding: 0 .4rem; margin-right: .45rem; vertical-align: .1em; }
.q { background: var(--tint); border-radius: .5rem; padding: .6rem .75rem; overflow-x: auto; }
details { margin-top: .7rem; }
summary { cursor: pointer; font-size: .9rem; font-weight: 700; color: var(--c); padding: .35rem 0; list-style: none; }
summary::-webkit-details-marker { display: none; }
summary::before { content: "▸"; display: inline-block; margin-right: .4rem; transition: transform .15s; }
details[open] summary::before { transform: rotate(90deg); }
@media (prefers-reduced-motion: reduce) { summary::before { transition: none; } }
.flow { list-style: none; padding: 0; margin: .4rem 0 0; display: grid; gap: .5rem; }
.f { display: grid; grid-template-columns: 4.6rem 1fr; gap: .55rem; align-items: start; }
.fl { font-size: .7rem; font-weight: 700; text-align: center; border-radius: .3rem; padding: .1rem 0; margin-top: .25rem; }
.ft { min-width: 0; overflow-x: auto; }
.f.T .fl { color: var(--c); background: var(--tint); }
.f.W .fl { color: var(--muted); border: 1px solid var(--line); }
.f.W .ft { background: var(--tint); border-radius: .35rem; padding: 0 .5rem; }
.f.K .fl { background: var(--key); color: var(--bg); }
.f.K .ft { color: var(--key); font-weight: 700; background: var(--key-bg); border-radius: .35rem; padding: 0 .5rem; }
.f.R .fl { background: var(--c); color: var(--bg); }
.f.R .ft { font-weight: 700; }
.katex { font-size: 1.05em; }
footer { margin-top: 3rem; color: var(--muted); font-size: .8rem; }
@media (max-width: 420px) { .f { grid-template-columns: 3.9rem 1fr; } h1 { font-size: 1.5rem; } }
</style>
<div class="wrap"><header class="top">
  <div class="kicker">数学I・A・II・B・C（ベクトル）</div>
  <h1>入試数学 考え方ノート</h1>
  <p>単元ごとに「問題をどういう目で見るか」と、解くときの頭の中の実況をまとめました。${units.length}単元・例題${exNo}問。</p>
  <p>例題はまず自分で解き、そのあと「実況を見る」を開いて、自分の考えとどこで分かれたかを確かめてください。</p>
</header></div>
<nav class="chips" aria-label="単元"><div class="row">${nav}</div></nav>
<main class="wrap">
  <ol class="toc">${toc}</ol>
  ${body}
  <footer>実況の記号：考える＝頭の中／書く＝答案に書く式／ポイント＝突破口／答</footer>
</main>`;
fs.writeFileSync(path.join(out, 'index.html'), html);
console.log('ok', units.length, exNo, fs.readdirSync(path.join(out, 'fonts')).length, 'fonts');
