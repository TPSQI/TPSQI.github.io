/* jsdom 集成测试：加载各页面验证渲染 */
const { JSDOM, VirtualConsole } = require('jsdom');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
let fail = 0;
function assert(cond, msg) {
  if (!cond) { fail++; console.error('FAIL:', msg); }
}

function loadPage(file, search) {
  const vc = new VirtualConsole();
  const errors = [];
  vc.on('jsdomError', e => errors.push(e.message));
  vc.on('error', (...a) => errors.push(a.join(' ')));

  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const dom = new JSDOM(html, {
    url: 'http://localhost/' + file + (search || ''),
    runScripts: 'outside-only',
    virtualConsole: vc,
    resources: 'usable',
    pretendToBeVisual: true
  });

  // 手动执行脚本（file:// 资源加载在 jsdom 中不可靠）
  if (!dom.window.matchMedia) {
    dom.window.matchMedia = function (q) {
      return { matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} };
    };
  }
  for (const src of ['js/markdown.js', 'js/articles.js', 'js/app.js']) {
    const code = fs.readFileSync(path.join(ROOT, src), 'utf8');
    try { dom.window.eval(code); }
    catch (e) { errors.push(src + ': ' + e.message); }
  }
  // 触发 DOMContentLoaded / 加载
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded', { bubbles: true }));
  dom.window.dispatchEvent(new dom.window.Event('load'));
  return { dom, errors, doc: dom.window.document, win: dom.window };
}

function run() {
  // ---- 首页 ----
  {
    const { errors, doc } = loadPage('index.html');
    assert(errors.length === 0, 'index errors: ' + errors.join(' | '));
    const cards = doc.querySelectorAll('#homeList .post-card');
    assert(cards.length === 6, 'home page1 cards: ' + cards.length);
    const firstLink = doc.querySelector('#homeList h3 a');
    assert(firstLink && /^p\/.+\.html$/.test(firstLink.getAttribute('href')),
      'home card links to prerendered post: ' + (firstLink && firstLink.getAttribute('href')));
    assert(doc.querySelector('#heroStats .stat-chip'), 'hero stats');
    assert(doc.querySelectorAll('#sidebar .widget').length >= 4, 'sidebar widgets');
    const pager = doc.querySelectorAll('#homePager a, #homePager span');
    assert(pager.length > 0, 'pagination rendered');
    assert(doc.querySelector('#homePager .current'), 'current page marker');
    // 精选标记
    assert(doc.querySelector('#homeList .badge-featured'), 'featured badge');
  }

  // ---- 首页第 2 页 ----
  {
    const { errors, doc } = loadPage('index.html', '?page=2');
    assert(errors.length === 0, 'index p2 errors: ' + errors.join(' | '));
    const cards = doc.querySelectorAll('#homeList .post-card');
    assert(cards.length === 6, 'home page2 cards: ' + cards.length); // 14 posts -> page2 has 6
  }

  // ---- 文章页 ----
  {
    const { errors, doc } = loadPage('post.html', '?id=native-js-blog');
    assert(errors.length === 0, 'post errors: ' + errors.join(' | '));
    assert(doc.title.includes('原生 JavaScript'), 'post title: ' + doc.title);
    assert(doc.querySelector('#postBody h2'), 'post headings');
    assert(doc.querySelector('#postBody pre.code-block'), 'post code block');
    assert(doc.querySelector('#postBody table'), 'post table');
    assert(doc.querySelectorAll('#tocList a').length >= 3, 'toc links');
    assert(doc.querySelector('#postNav .prev') && doc.querySelector('#postNav .next'), 'post nav');
    assert(doc.querySelectorAll('#postNav a[href="#"]').length === 0, 'no href=# in post nav');
    assert(doc.querySelector('#relatedList .post-card'), 'related posts');
    assert(doc.querySelector('#commentForm'), 'comment form');
    assert(doc.querySelector('#commentList .comments-empty'), 'comment empty state');

    // 测试留言
    const win = doc.defaultView;
    doc.querySelector('#cName').value = '测试者';
    doc.querySelector('#cText').value = '这是一条本地测试留言';
    doc.querySelector('#commentForm').dispatchEvent(new win.Event('submit', { bubbles: true, cancelable: true }));
    const item = doc.querySelector('#commentList .comment-item');
    assert(item && item.textContent.includes('这是一条本地测试留言'), 'comment saved+rendered');
    const stored = JSON.parse(win.localStorage.getItem('ws-comments:native-js-blog') || '[]');
    assert(stored.length === 1 && stored[0].name === '测试者', 'localStorage comment');
  }

  // ---- 文章页：缺省 id 回退 ----
  {
    const { errors, doc } = loadPage('post.html');
    assert(errors.length === 0, 'post default errors');
    assert(doc.querySelector('#postBody h1, #postBody h2'), 'post default renders first article');
  }

  // ---- 分类列表 ----
  {
    const { errors, doc } = loadPage('list.html', '?cat=' + encodeURIComponent('技术'));
    assert(errors.length === 0, 'list cat errors: ' + errors.join(' | '));
    assert(doc.querySelector('#listTitle').textContent === '技术', 'list title');
    const cards = doc.querySelectorAll('#listBody .post-card');
    assert(cards.length === 5, 'tech posts count: ' + cards.length);
  }

  // ---- 标签列表 ----
  {
    const { errors, doc } = loadPage('list.html', '?tag=' + encodeURIComponent('前端'));
    assert(errors.length === 0, 'list tag errors: ' + errors.join(' | '));
    const cards = doc.querySelectorAll('#listBody .post-card');
    assert(cards.length >= 2, 'tag posts: ' + cards.length);
    assert(doc.querySelector('#listTitle').textContent.includes('前端'), 'tag title');
  }

  // ---- 不存在的标签 ----
  {
    const { errors, doc } = loadPage('list.html', '?tag=nopenope');
    assert(doc.querySelector('#listBody .empty-state'), 'empty state');
  }

  // ---- 分类页 ----
  {
    const { errors, doc } = loadPage('categories.html');
    assert(errors.length === 0, 'categories errors: ' + errors.join(' | '));
    assert(doc.querySelectorAll('#catGrid .cat-card').length === 4, 'cat cards');
  }

  // ---- 标签页 ----
  {
    const { errors, doc } = loadPage('tags.html');
    assert(errors.length === 0, 'tags errors: ' + errors.join(' | '));
    assert(doc.querySelectorAll('#tagGrid .tag').length >= 10, 'tag cloud count');
  }

  // ---- 归档页 ----
  {
    const { errors, doc } = loadPage('archive.html');
    assert(errors.length === 0, 'archive errors: ' + errors.join(' | '));
    const years = doc.querySelectorAll('#archiveBody .archive-year');
    assert(years.length === 2, 'archive years: ' + years.length);
    assert(doc.querySelectorAll('#archiveBody .archive-item').length === 14, 'archive items');
  }

  // ---- 关于页 ----
  {
    const { errors, doc } = loadPage('about.html');
    assert(errors.length === 0, 'about errors: ' + errors.join(' | '));
    assert(doc.querySelector('#aboutStats').textContent.includes('14'), 'about stats');
    assert(doc.body.textContent.includes('作者简介暂未撰写'), 'bio placeholder note');
  }

  // ---- 友链页 ----
  {
    const { errors, doc } = loadPage('links.html');
    assert(errors.length === 0, 'links errors: ' + errors.join(' | '));
    assert(doc.querySelectorAll('#linkGrid a.link-card').length === 0, 'no friend link cards');
    assert(doc.body.textContent.includes('暂无友链'), 'empty friends message');
    assert(doc.body.textContent.includes('申请友链') === false, 'no apply section');
    assert(doc.body.textContent.includes('欢迎交换链接') === false, 'no apply copy');
  }

  // ---- 搜索 ----
  {
    const { errors, doc, win } = loadPage('index.html');
    assert(errors.length === 0, 'search page errors');
    doc.querySelector('#searchOpen').click();
    assert(doc.querySelector('#searchOverlay').classList.contains('open'), 'search open');
    const input = doc.querySelector('#searchInput');
    input.value = '脚手架';
    input.dispatchEvent(new win.Event('input', { bubbles: true }));
    const hits = doc.querySelectorAll('#searchResults a');
    assert(hits.length >= 1, 'search hits for 脚手架: ' + hits.length);
    input.value = 'Grid';
    input.dispatchEvent(new win.Event('input', { bubbles: true }));
    assert(doc.querySelectorAll('#searchResults a').length >= 1, 'search hits Grid');
    input.value = 'zzz不存在zzz';
    input.dispatchEvent(new win.Event('input', { bubbles: true }));
    assert(doc.querySelector('#searchResults .search-empty'), 'search empty');
  }

  // ---- 主题切换 ----
  {
    const { doc, win } = loadPage('index.html');
    const before = doc.documentElement.getAttribute('data-theme');
    doc.querySelector('#themeToggle').click();
    const after = doc.documentElement.getAttribute('data-theme');
    assert(before !== after, 'theme toggled: ' + before + ' -> ' + after);
    assert(win.localStorage.getItem('ws-theme') === after, 'theme persisted');
  }

  // ---- 预渲染文章页 ----
  {
    const prerendered = fs.readdirSync(path.join(ROOT, 'p')).filter(f => f.endsWith('.html'));
    assert(prerendered.length === 14, 'prerendered count: ' + prerendered.length);

    const { errors, doc } = loadPage('p/native-js-blog.html');
    assert(errors.length === 0, 'prerendered page errors: ' + errors.join(' | '));
    assert(doc.querySelector('#postBody h2'), 'prerendered has static content');
    assert(doc.title.includes('原生 JavaScript'), 'prerendered title');
    const rel = doc.querySelector('#relatedList h3 a');
    if (rel) {
      assert(rel.getAttribute('href').startsWith('../p/'), 'related link prefix: ' + rel.getAttribute('href'));
    }
  }

  if (fail === 0) {
    console.log('DOM ALL PASS');
  } else {
    console.error(fail + ' DOM failures');
    process.exit(1);
  }
}

run();
