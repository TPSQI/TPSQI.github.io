const fs = require('fs');
const h = fs.readFileSync('p/native-js-blog.html', 'utf8');
const checks = {
  'size>10k': h.length > 10000,
  hasH2: h.includes('<h2'),
  hasPre: h.includes('pre class'),
  hasDataSlug: /data-slug=/.test(h),
  hasDataRoot: /data-root="\.\.\/"/.test(h),
  hasRootCss: h.includes('../css/style.css'),
  hasRootJs: h.includes('../js/app.js'),
  hasRootIndex: h.includes('../index.html'),
  noLocalhost: !h.includes('localhost'),
  noBareIndex: !/(^|[^.])href="index\.html/.test(h),
  noLocalBadge: !h.includes('本地版'),
  hasJsonld: h.includes('BlogPosting'),
  hasTitle: h.includes('原生 JavaScript'),
  hasPostLinkPrefix: h.includes('../p/')
};
let fail = 0;
for (const [k, v] of Object.entries(checks)) {
  if (!v) { fail++; console.error('FAIL', k); }
}
// 检查所有 p/ 页面基本完整
const files = fs.readdirSync('p').filter(f => f.endsWith('.html'));
for (const f of files) {
  const s = fs.readFileSync('p/' + f, 'utf8');
  if (!s.includes('data-slug') || !s.includes('<h2') || s.includes('localhost')) {
    fail++; console.error('FAIL page', f, 'len', s.length);
  }
  if (/(^|[^.])href="index\.html/.test(s) || /href="css\//.test(s)) {
    fail++; console.error('FAIL path prefix', f);
  }
}
console.log(fail === 0 ? `ALL PASS (${files.length} prerendered, sample ${h.length}B)` : fail + ' failures');
process.exit(fail ? 1 : 0);
