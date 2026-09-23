/* 冒烟测试：在 Node 中模拟 window，验证数据与 Markdown 渲染 */
global.window = global;
require('../js/markdown.js');
require('../js/articles.js');

const BLOG = window.BLOG;
const MD = window.MiniMarkdown;
let fail = 0;
function assert(cond, msg) {
  if (!cond) { fail++; console.error('FAIL:', msg); }
}

assert(BLOG.posts.length >= 12, 'should have >= 12 posts, got ' + BLOG.posts.length);

const slugs = new Set();
BLOG.posts.forEach(p => {
  assert(!slugs.has(p.slug), 'dup slug: ' + p.slug);
  slugs.add(p.slug);
  ['title', 'date', 'category', 'excerpt', 'content'].forEach(k => {
    assert(p[k], p.slug + ' missing ' + k);
  });
  assert(Array.isArray(p.tags) && p.tags.length, p.slug + ' tags');
  assert(/^\d{4}-\d{2}-\d{2}$/.test(p.date), p.slug + ' date format');

  const r = MD.render(p.content);
  assert(r.html.length > 500, p.slug + ' html too short: ' + r.html.length);
  assert(!r.html.includes('\u0000'), p.slug + ' unreplaced code placeholder');
  assert(!/\*\*[^*]+\*\*/.test(r.html.replace(/<pre[\s\S]*?<\/pre>/g, '')), p.slug + ' unrendered bold');
  assert(r.toc.length >= 2, p.slug + ' toc entries: ' + r.toc.length);

  // headings must have ids
  const h2 = r.html.match(/<h[23] id="[^"]+"/g);
  assert(h2 && h2.length >= 1, p.slug + ' heading ids');

  // fences should only survive inside inline code
  const noPre = r.html.replace(/<pre[\s\S]*?<\/pre>/g, '').replace(/<code>[\s\S]*?<\/code>/g, '');
  assert(!noPre.includes('```'), p.slug + ' leftover fence');
});

// categories consistency
BLOG.categories.forEach(c => {
  const n = BLOG.posts.filter(p => p.category === c.name).length;
  assert(n > 0, 'empty category: ' + c.name);
});

// sort check
const sorted = BLOG.posts.slice().sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
assert(sorted[0].date >= sorted[sorted.length - 1].date, 'sort order');

// markdown features unit test
const unit = MD.render([
  '# 标题一',
  '',
  '段落 **加粗** *斜体* `代码` [链接](https://example.com) ~~删除~~',
  '',
  '> 引用一行',
  '> 引用二行',
  '',
  '- 项目 A',
  '- 项目 B',
  '  - 嵌套 C',
  '',
  '1. 有序一',
  '2. 有序二',
  '',
  '```js',
  'const a = 1; // code <b>not bold</b>',
  '```',
  '',
  '| 列1 | 列2 |',
  '| --- | --- |',
  '| a | b |',
  '',
  '---'
].join('\n'));

assert(unit.html.includes('<h1 id="'), 'unit h1');
assert(unit.html.includes('<strong>加粗</strong>'), 'unit bold');
assert(unit.html.includes('<em>斜体</em>'), 'unit italic');
assert(unit.html.includes('<code>代码</code>'), 'unit code');
assert(unit.html.includes('<a href="https://example.com" target="_blank" rel="noopener">链接</a>'), 'unit link');
assert(unit.html.includes('<del>删除</del>'), 'unit strike');
assert(unit.html.includes('<blockquote>'), 'unit quote');
assert(unit.html.includes('<ul>'), 'unit ul');
assert(unit.html.includes('<ol'), 'unit ol');
assert(unit.html.includes('language-js'), 'unit code lang');
assert(unit.html.includes('&lt;b&gt;not bold&lt;/b&gt;'), 'unit code escaped');
assert(unit.html.includes('<table>'), 'unit table');
assert(unit.html.includes('<hr>'), 'unit hr');
assert(unit.toc.length === 1, 'unit toc: ' + unit.toc.length);

// links data
assert(BLOG.links.length >= 5, 'links');
assert(BLOG.author === '木质脚手架', 'author');

if (fail === 0) {
  console.log('ALL PASS — posts:', BLOG.posts.length,
    'totalChars:', BLOG.posts.reduce((s, p) => s + p.content.length, 0),
    'tags:', new Set(BLOG.posts.flatMap(p => p.tags)).size);
} else {
  console.error(fail + ' failures');
  process.exit(1);
}
