const fs = require('fs');
let bad = 0;
for (const f of fs.readdirSync('p')) {
  const t = fs.readFileSync('p/' + f, 'utf8');
  if (t.includes('example.com') || t.includes('rel="canonical"') || t.includes('localhost')) {
    bad++;
    console.log('BAD', f);
  }
}
const robots = fs.readFileSync('robots.txt', 'utf8');
if (robots.includes('example.com')) { bad++; console.log('BAD robots'); }
const site = fs.readFileSync('js/articles.js', 'utf8');
if (!site.includes("siteUrl: ''")) { bad++; console.log('BAD siteUrl not empty'); }
// 残留本地措辞
const chrome = ['index.html', 'about.html', 'links.html', 'post.html', 'js/app.js'];
for (const c of chrome) {
  const t = fs.readFileSync(c, 'utf8');
  if (t.includes('本地版') || t.includes('本地阅读') || t.includes('href="#"')) {
    bad++; console.log('BAD local/deadlink in', c);
  }
}
console.log(bad ? bad + ' failures' : 'PUBLIC READY CHECK PASS');
process.exit(bad ? 1 : 0);
