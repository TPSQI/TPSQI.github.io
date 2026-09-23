const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function git(args, opts) {
  return execSync('git ' + args, Object.assign({
    encoding: 'buffer',
    maxBuffer: 50 * 1024 * 1024,
    shell: true
  }, opts || {}));
}

// 列出 HEAD 全部 blob
const ls = execSync('git ls-tree -r HEAD', { encoding: 'utf8', shell: true });
const files = ls.trim().split('\n').map(line => {
  const m = line.match(/\t(.+)$/);
  return m ? m[1] : null;
}).filter(Boolean);

const patterns = [
  { name: 'email', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  { name: 'cn-phone', re: /(?<!\d)1[3-9]\d{9}(?!\d)/g },
  { name: 'win-user-path', re: /[A-Za-z]:\\Users\\[^\\\s"']+/g },
  { name: 'unix-home', re: /\/(?:Users|home)\/[A-Za-z0-9._-]+/g },
  { name: 'private-key', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
  { name: 'aws-key', re: /AKIA[0-9A-Z]{16}/g },
  { name: 'token-like', re: /(?:ghp|gho|github_pat)_[A-Za-z0-9_]{20,}/g },
  { name: 'idcard', re: /(?<!\d)\d{17}[\dXx](?!\d)/g },
  { name: 'local-machine-name', re: /DELL|tpsteng9|玩机/g }
];

const findings = [];
for (const f of files) {
  let buf;
  try {
    buf = git('show "HEAD:' + f.replace(/"/g, '\\"') + '"').toString('utf8');
  } catch (e) {
    // 二进制等
    continue;
  }
  for (const p of patterns) {
    const m = buf.match(p.re);
    if (m) {
      findings.push({ file: f, type: p.name, matches: [...new Set(m)].slice(0, 5) });
    }
  }
}

// commit 元数据
const meta = execSync('git log "--format=%H|%an|%ae|%cn|%ce|%s"', {
  encoding: 'utf8',
  shell: true
});

// 确认 node_modules 从未入库
const allObjects = execSync('git rev-list --objects --all', { encoding: 'utf8', shell: true });
const nm = allObjects.split('\n').filter(l => l.includes('node_modules'));
const envFiles = allObjects.split('\n').filter(l => /\.env|id_rsa|\.pem|credential|\.pfx/i.test(l));

console.log('tracked files:', files.length);
console.log('content findings:', findings.length ? findings : 'NONE');
console.log('node_modules objects:', nm.length);
console.log('secret-like object names:', envFiles.length ? envFiles : 'NONE');
console.log('--- commit metadata ---');
console.log(meta.trim());
console.log('--- sample file list ---');
console.log(files.join('\n'));
