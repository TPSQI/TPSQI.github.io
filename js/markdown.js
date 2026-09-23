(function (global) {
  'use strict';

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function slugify(text) {
    var s = String(text)
      .trim()
      .toLowerCase()
      .replace(/[\s]+/g, '-')
      .replace(/[^\w一-龥\-]+/g, '')
      .replace(/\-+/g, '-')
      .replace(/^\-|\-$/g, '');
    return s || 'section-' + Math.random().toString(36).slice(2, 8);
  }

  function inline(text) {
    var codes = [];
    var t = String(text).replace(/`([^`]+)`/g, function (_, code) {
      codes.push(code);
      return '\u0000' + (codes.length - 1) + '\u0000';
    });

    t = escapeHtml(t);

    t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, function (_, alt, src, title) {
      return '<img src="' + src + '" alt="' + alt + '"' + (title ? ' title="' + title + '"' : '') + ' loading="lazy">';
    });

    t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, label, href) {
      var external = /^https?:\/\//.test(href);
      return '<a href="' + href + '"' + (external ? ' target="_blank" rel="noopener"' : '') + '>' + label + '</a>';
    });

    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    t = t.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    t = t.replace(/(^|[^w])_([^_\n]+)_(?=\W|$)/g, '$1<em>$2</em>');
    t = t.replace(/~~([^~]+)~~/g, '<del>$1</del>');

    t = t.replace(/\u0000(\d+)\u0000/g, function (_, i) {
      return '<code>' + escapeHtml(codes[+i]) + '</code>';
    });

    return t;
  }

  function isTableSep(line) {
    return /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(line) && line.indexOf('-') !== -1;
  }

  function splitRow(line) {
    var s = line.trim().replace(/^\|/, '').replace(/\|$/, '');
    var cells = [];
    var cur = '';
    var inCode = false;
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (ch === '`') inCode = !inCode;
      if (ch === '|' && !inCode) {
        cells.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    cells.push(cur.trim());
    return cells;
  }

  function renderList(lines, ordered, startNum, options, toc, depth) {
    var html = ordered ? '<ol' + (startNum !== 1 ? ' start="' + startNum + '"' : '') + '>' : '<ul>';
    var i = 0;
    while (i < lines.length) {
      var line = lines[i];
      var m = ordered ? line.match(/^(\s*)(\d+)\.\s+(.*)$/) : line.match(/^(\s*)[-*+]\s+(.*)$/);
      if (!m) break;

      var indent = m[1].length;
      var text = ordered ? m[3] : m[2];
      var children = [];

      i++;
      while (i < lines.length) {
        var next = lines[i];
        var nextM = ordered ? next.match(/^(\s*)(\d+)\.\s+(.*)$/) : next.match(/^(\s*)[-*+]\s+(.*)$/);
        if (nextM && nextM[1].length <= indent) break;
        if (nextM && nextM[1].length > indent) {
          children.push(next.slice(indent + 2));
        } else if (/^\s{2,}\S/.test(next) || /^\s*$/.test(next)) {
          if (/^\s*$/.test(next) && i + 1 < lines.length && !/^\s+/.test(lines[i + 1])) break;
          children.push(next.slice(Math.min(indent + 2, next.length)));
        } else {
          break;
        }
        i++;
      }

      var inner;
      if (/^\s*$/.test(text)) {
        inner = '';
      } else {
        inner = inline(text);
      }
      if (children.length) {
        inner += renderList(children, /\d+\./.test(children[0] || ''), 1, options, toc, depth + 1);
      }
      html += '<li>' + inner + '</li>';
    }
    html += ordered ? '</ol>' : '</ul>';
    return html;
  }

  function render(md) {
    var toc = [];
    var lines = String(md).replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n');
    var html = [];
    var i = 0;
    var headingSeq = {};

    function heading(level, text) {
      var plain = text.replace(/`([^`]+)`/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_~]/g, '');
      var id = slugify(plain);
      headingSeq[id] = (headingSeq[id] || 0) + 1;
      if (headingSeq[id] > 1) id = id + '-' + headingSeq[id];
      toc.push({ level: level, text: plain, id: id });
      return '<h' + level + ' id="' + id + '">' + inline(text) + '</h' + level + '>';
    }

    while (i < lines.length) {
      var line = lines[i];

      if (/^\s*$/.test(line)) {
        i++;
        continue;
      }

      var fence = line.match(/^\s*```(\w*)\s*$/);
      if (fence) {
        var lang = fence[1];
        var code = [];
        i++;
        while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) {
          code.push(lines[i]);
          i++;
        }
        i++;
        html.push(
          '<pre class="code-block"' + (lang ? ' data-lang="' + lang + '"' : '') + '><code' +
          (lang ? ' class="language-' + lang + '"' : '') + '>' +
          escapeHtml(code.join('\n')) + '</code></pre>'
        );
        continue;
      }

      var hm = line.match(/^(#{1,6})\s+(.*)$/);
      if (hm) {
        html.push(heading(hm[1].length, hm[2].replace(/\s+#+\s*$/, '')));
        i++;
        continue;
      }

      if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
        html.push('<hr>');
        i++;
        continue;
      }

      if (/^\s*>\s?/.test(line)) {
        var quote = [];
        while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
          quote.push(lines[i].replace(/^\s*>\s?/, ''));
          i++;
        }
        html.push('<blockquote>' + render(quote.join('\n')).html + '</blockquote>');
        continue;
      }

      if (line.indexOf('|') !== -1 && i + 1 < lines.length && isTableSep(lines[i + 1])) {
        var headCells = splitRow(line);
        i += 2;
        var rows = [];
        while (i < lines.length && lines[i].indexOf('|') !== -1 && !/^\s*$/.test(lines[i])) {
          rows.push(splitRow(lines[i]));
          i++;
        }
        var table = '<div class="table-wrap"><table><thead><tr>';
        headCells.forEach(function (c) { table += '<th>' + inline(c) + '</th>'; });
        table += '</tr></thead><tbody>';
        rows.forEach(function (r) {
          table += '<tr>';
          headCells.forEach(function (_, idx) {
            table += '<td>' + inline(r[idx] || '') + '</td>';
          });
          table += '</tr>';
        });
        table += '</tbody></table></div>';
        html.push(table);
        continue;
      }

      if (/^\s*\d+\.\s+/.test(line)) {
        var olLines = [];
        while (i < lines.length && (/^\s*\d+\.\s+/.test(lines[i]) || /^\s{2,}\S/.test(lines[i]))) {
          olLines.push(lines[i]);
          i++;
        }
        var startNum = parseInt((olLines[0].match(/^(\s*)(\d+)\./) || [])[2], 10) || 1;
        html.push(renderList(olLines, true, startNum, {}, toc, 0));
        continue;
      }

      if (/^\s*[-*+]\s+/.test(line)) {
        var ulLines = [];
        while (i < lines.length && (/^\s*[-*+]\s+/.test(lines[i]) || /^\s{2,}\S/.test(lines[i]))) {
          ulLines.push(lines[i]);
          i++;
        }
        html.push(renderList(ulLines, false, 1, {}, toc, 0));
        continue;
      }

      var para = [];
      while (i < lines.length && !/^\s*$/.test(lines[i])) {
        var stop =
          /^(#{1,6})\s+/.test(lines[i]) ||
          /^\s*```/.test(lines[i]) ||
          /^\s*>\s?/.test(lines[i]) ||
          /^\s*[-*+]\s+/.test(lines[i]) ||
          /^\s*\d+\.\s+/.test(lines[i]) ||
          /^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i]);
        if (stop && para.length) break;
        if (stop && !para.length) break;
        para.push(lines[i]);
        i++;
      }
      if (para.length) {
        html.push('<p>' + inline(para.join('\n')).replace(/\n/g, '<br>') + '</p>');
      } else {
        i++;
      }
    }

    return { html: html.join('\n'), toc: toc };
  }

  global.MiniMarkdown = { render: render, escapeHtml: escapeHtml, slugify: slugify };
})(window);
