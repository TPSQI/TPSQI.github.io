/* 构建脚本：预渲染文章页 + （可选）生成 sitemap / RSS
   用法：
     node tools/build.js
   发布前请在 js/articles.js 中填写 siteUrl，例如：
     siteUrl: 'https://blog.example.com'
*/
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, '..', 'test', 'node_modules', 'jsdom'));

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'p');

function loadJs(dom, rel) {
  const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  dom.window.eval(code);
}

function buildPost(post) {
  const template = fs.readFileSync(path.join(ROOT, 'post.html'), 'utf8');
  const vc = new VirtualConsole();
  const errors = [];
  vc.on('jsdomError', e => errors.push(e.message));
  vc.on('error', (...a) => errors.push(a.join(' ')));

  const dom = new JSDOM(template, {
    url: 'http://localhost/p/' + post.slug + '.html',
    runScripts: 'outside-only',
    virtualConsole: vc,
    pretendToBeVisual: true
  });

  if (!dom.window.matchMedia) {
    dom.window.matchMedia = q => ({
      matches: false, media: q,
      addListener() {}, removeListener() {},
      addEventListener() {}, removeEventListener() {}
    });
  }

  const body = dom.window.document.body;
  body.setAttribute('data-slug', post.slug);
  body.setAttribute('data-root', '../');

  loadJs(dom, 'js/markdown.js');
  loadJs(dom, 'js/articles.js');
  loadJs(dom, 'js/app.js');
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded', { bubbles: true }));
  dom.window.dispatchEvent(new dom.window.Event('load'));

  if (errors.length) {
    console.error('  ! ' + post.slug + ':', errors.join(' | '));
  }

  let html = dom.serialize();

  // 根目录资源与页面 → 上一级
  const rootPages = [
    'index.html', 'post.html', 'list.html', 'archive.html',
    'categories.html', 'tags.html', 'links.html', 'about.html',
    '404.html', 'feed.xml', 'robots.txt', 'sitemap.xml'
  ];
  html = html.replace(/(href|src)="(?!\/\/|https?:|data:|#|\.\.\/|mailto:)([^"]+)"/g, (m, attr, url) => {
    if (url.startsWith('css/') || url.startsWith('js/') || url.startsWith('p/')) {
      return attr + '="../' + url + '"';
    }
    const file = url.split('?')[0].split('#')[0];
    if (rootPages.includes(file)) {
      return attr + '="../' + url + '"';
    }
    return m;
  });

  // 预渲染页面上，data-root 已生成 ../p/ 等链接，无需再包一层；
  // 上面的 p/ 前缀规则会误伤已带 ../ 的情况 —— 已在负向断言中排除。

  // 关闭预渲染时的无意义查询（保留 data-slug 供客户端增强）
  html = html.replace(/<body data-page="post" data-root="\.\." data-slug="([^"]+)">/,
    '<body data-page="post" data-root="../" data-slug="$1">');

  // 属性顺序可能不同，兜底确保 body 属性存在
  if (!/data-slug=/.test(html)) {
    console.error('  ! data-slug missing for ' + post.slug);
  }

  fs.writeFileSync(path.join(OUT_DIR, post.slug + '.html'), html, 'utf8');
  return html.length;
}

function xmlEscape(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function stripMd(md) {
  return String(md)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_~|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildMeta(BLOG) {
  const posts = BLOG.posts.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  const site = (BLOG.siteUrl || '').replace(/\/+$/, '');

  if (!site) {
    console.log('[build] siteUrl 未设置，跳过 sitemap.xml / feed.xml / robots Sitemap 行。');
    console.log('[build] 请在 js/articles.js 顶部填写 siteUrl 后重新运行：node tools/build.js');
    fs.writeFileSync(
      path.join(ROOT, 'robots.txt'),
      'User-agent: *\nAllow: /\n\n# 配置 siteUrl 并重新构建后，此处会自动追加 Sitemap\n',
      'utf8'
    );
    return;
  }

  const urls = [
    { loc: site + '/', priority: '1.0' },
    { loc: site + '/archive.html', priority: '0.8' },
    { loc: site + '/categories.html', priority: '0.6' },
    { loc: site + '/tags.html', priority: '0.5' },
    { loc: site + '/about.html', priority: '0.5' },
    { loc: site + '/links.html', priority: '0.4' }
  ].concat(posts.map(p => ({
    loc: site + '/p/' + p.slug + '.html',
    lastmod: p.updated || p.date,
    priority: p.featured ? '0.9' : '0.7'
  })));

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${xmlEscape(u.loc)}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap, 'utf8');

  const items = posts.map(p => {
    const link = site + '/p/' + p.slug + '.html';
    return `    <item>
      <title>${xmlEscape(p.title)}</title>
      <link>${xmlEscape(link)}</link>
      <guid isPermaLink="true">${xmlEscape(link)}</guid>
      <pubDate>${new Date(p.date + 'T08:00:00+08:00').toUTCString()}</pubDate>
      <category>${xmlEscape(p.category)}</category>
      <description>${xmlEscape(p.excerpt || stripMd(p.content).slice(0, 180))}</description>
    </item>`;
  }).join('\n');

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlEscape(BLOG.title)}</title>
    <link>${xmlEscape(site + '/')}</link>
    <description>${xmlEscape(BLOG.desc)}</description>
    <language>zh-cn</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${xmlEscape(site + '/feed.xml')}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
  fs.writeFileSync(path.join(ROOT, 'feed.xml'), feed, 'utf8');

  fs.writeFileSync(
    path.join(ROOT, 'robots.txt'),
    `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`,
    'utf8'
  );

  console.log('[build] 已生成 sitemap.xml / feed.xml / robots.txt');
}

function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

  // 读取站点数据
  global.window = global;
  require(path.join(ROOT, 'js', 'markdown.js'));
  require(path.join(ROOT, 'js', 'articles.js'));
  const BLOG = global.BLOG || window.BLOG;

  console.log('[build] 预渲染 ' + BLOG.posts.length + ' 篇文章 → p/');
  for (const post of BLOG.posts) {
    const size = buildPost(post);
    console.log('  ✓ p/' + post.slug + '.html (' + size + ' bytes)');
  }

  buildMeta(BLOG);
  console.log('[build] 完成');
}

main();
