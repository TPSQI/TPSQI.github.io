/* ============================================================
   木质脚手架 · 页面逻辑
   ============================================================ */
(function () {
  'use strict';

  var BLOG = window.BLOG;
  var MD = window.MiniMarkdown;
  var PAGE_SIZE = 6;

  /* ---------- 工具 ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function params() {
    var out = {};
    var q = location.search.replace(/^\?/, '');
    if (!q) return out;
    q.split('&').forEach(function (pair) {
      var i = pair.indexOf('=');
      var k = i < 0 ? pair : pair.slice(0, i);
      var v = i < 0 ? '' : pair.slice(i + 1);
      out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
    });
    return out;
  }

  function rootPrefix() {
    var r = document.body.getAttribute('data-root');
    return r == null ? '' : r;
  }

  function absUrl(rel) {
    var base = (BLOG.siteUrl || '').replace(/\/+$/, '');
    if (!base) return '';
    if (/^https?:\/\//i.test(rel)) return rel;
    return base + '/' + String(rel).replace(/^\//, '');
  }

  function setMeta(sel, content) {
    if (!content) return;
    var el = document.querySelector(sel);
    if (el) el.setAttribute('content', content);
  }

  function setLink(rel, href) {
    if (!href) return;
    var el = document.querySelector('link[rel="' + rel + '"]');
    if (!el) {
      el = document.createElement('link');
      el.setAttribute('rel', rel);
      document.head.appendChild(el);
    }
    el.setAttribute('href', href);
  }

  function postUrl(p) { return rootPrefix() + 'p/' + p.slug + '.html'; }
  function catUrl(c) { return rootPrefix() + 'list.html?cat=' + encodeURIComponent(c); }
  function tagUrl(t) { return rootPrefix() + 'list.html?tag=' + encodeURIComponent(t); }

  function sortedPosts() {
    return BLOG.posts.slice().sort(function (a, b) {
      return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
    });
  }

  function findPost(slug) {
    for (var i = 0; i < BLOG.posts.length; i++) {
      if (BLOG.posts[i].slug === slug) return BLOG.posts[i];
    }
    return null;
  }

  function fmtDate(d) {
    var p = d.split('-');
    return p[0] + ' 年 ' + (+p[1]) + ' 月 ' + (+p[2]) + ' 日';
  }

  function fmtShort(d) {
    var p = d.split('-');
    return p[1] + '.' + p[2];
  }

  function catCount(name) {
    return BLOG.posts.filter(function (p) { return p.category === name; }).length;
  }

  function allTags() {
    var map = {};
    BLOG.posts.forEach(function (p) {
      p.tags.forEach(function (t) { map[t] = (map[t] || 0) + 1; });
    });
    return Object.keys(map).sort(function (a, b) { return map[b] - map[a]; })
      .map(function (t) { return { name: t, count: map[t] }; });
  }

  function readingTime(text) {
    var chars = String(text).replace(/\s/g, '').length;
    return Math.max(1, Math.round(chars / 500));
  }

  function plainText(md) {
    return String(md)
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/[#>*_~|-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  var ICON = {
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
    arrowUp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>'
  };

  /* ---------- 主题 ---------- */
  function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem('ws-theme'); } catch (e) {}
    var prefersDark = false;
    try { prefersDark = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches); } catch (e) {}
    var dark = saved ? saved === 'dark' : prefersDark;
    applyTheme(dark, false);

    var btn = $('#themeToggle');
    if (btn) {
      btn.addEventListener('click', function () {
        var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        applyTheme(!isDark, true);
      });
    }
  }

  function applyTheme(dark, save) {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    if (save) { try { localStorage.setItem('ws-theme', dark ? 'dark' : 'light'); } catch (e) {} }
    var btn = $('#themeToggle');
    if (btn) {
      btn.innerHTML = dark ? ICON.sun : ICON.moon;
      btn.setAttribute('aria-label', dark ? '切换到浅色模式' : '切换到深色模式');
    }
  }

  /* ---------- Toast ---------- */
  var toastTimer;
  function toast(msg) {
    var el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }

  /* ---------- 头部：菜单 / 搜索 ---------- */
  function initHeader() {
    var menuBtn = $('#menuToggle');
    var nav = $('#nav');
    if (menuBtn && nav) {
      menuBtn.addEventListener('click', function () {
        nav.classList.toggle('open');
      });
      nav.addEventListener('click', function (e) {
        if (e.target.tagName === 'A') nav.classList.remove('open');
      });
    }

    var page = document.body.getAttribute('data-page');
    $$('#nav a').forEach(function (a) {
      var key = a.getAttribute('data-nav');
      if (key === page || (page === 'post' && key === 'home') || (page === 'list' && key === 'home')) {
        if (key === page) a.classList.add('active');
      }
    });

    var openBtn = $('#searchOpen');
    if (openBtn) openBtn.addEventListener('click', openSearch);

    var overlay = $('#searchOverlay');
    if (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeSearch();
      });
    }

    var input = $('#searchInput');
    if (input) {
      input.addEventListener('input', function () { renderSearch(input.value); });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          var first = $('#searchResults a');
          if (first) location.href = first.getAttribute('href');
        }
      });
    }

    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openSearch();
      }
      if (e.key === 'Escape') closeSearch();
    });
  }

  function openSearch() {
    var o = $('#searchOverlay');
    if (!o) return;
    o.classList.add('open');
    var i = $('#searchInput');
    if (i) { i.value = ''; i.focus(); }
    renderSearch('');
  }

  function closeSearch() {
    var o = $('#searchOverlay');
    if (o) o.classList.remove('open');
  }

  function highlight(text, q) {
    if (!q) return esc(text);
    var idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx < 0) return esc(text);
    return esc(text.slice(0, idx)) + '<mark>' + esc(text.slice(idx, idx + q.length)) + '</mark>' + esc(text.slice(idx + q.length));
  }

  function renderSearch(q) {
    var box = $('#searchResults');
    if (!box) return;
    q = (q || '').trim();

    if (!q) {
      box.innerHTML =
        '<div class="search-empty">输入关键词搜索文章<br><small>支持标题、标签与正文</small></div>';
      return;
    }

    var lower = q.toLowerCase();
    var hits = sortedPosts().filter(function (p) {
      var hay = (p.title + ' ' + p.excerpt + ' ' + p.category + ' ' + p.tags.join(' ') + ' ' + plainText(p.content)).toLowerCase();
      return hay.indexOf(lower) !== -1;
    });

    if (!hits.length) {
      box.innerHTML = '<div class="search-empty">没有找到「' + esc(q) + '」相关文章</div>';
      return;
    }

    box.innerHTML = hits.slice(0, 12).map(function (p) {
      var body = plainText(p.content);
      var idx = body.toLowerCase().indexOf(lower);
      var snip = idx >= 0
        ? body.slice(Math.max(0, idx - 30), idx + 80)
        : p.excerpt;
      return (
        '<a href="' + postUrl(p) + '">' +
        '<div class="st">' + highlight(p.title, q) + '</div>' +
        '<div class="sd">' + fmtDate(p.date) + ' · ' + esc(p.category) + '</div>' +
        '<div class="sx">' + highlight(snip, q) + '</div>' +
        '</a>'
      );
    }).join('');
  }

  /* ---------- 卡片 ---------- */
  function postCard(p, opts) {
    opts = opts || {};
    return (
      '<article class="post-card' + (p.featured && opts.allowFeatured !== false ? ' featured' : '') + '">' +
      '<div class="post-card-top">' +
      (p.featured && opts.allowFeatured !== false ? '<span class="badge badge-featured">精选</span>' : '') +
      '<a class="badge badge-cat" href="' + catUrl(p.category) + '">' + esc(p.category) + '</a>' +
      '<span class="meta"><span>' + ICON.cal + fmtDate(p.date) + '</span>' +
      '<span>' + ICON.clock + '约 ' + readingTime(p.content) + ' 分钟</span></span>' +
      '</div>' +
      '<h3><a href="' + postUrl(p) + '">' + esc(p.title) + '</a></h3>' +
      '<p class="excerpt">' + esc(p.excerpt) + '</p>' +
      '<div class="post-card-foot">' +
      '<div class="tag-row">' +
      p.tags.map(function (t) {
        return '<a class="tag" href="' + tagUrl(t) + '">#' + esc(t) + '</a>';
      }).join('') +
      '</div>' +
      '<a class="read-more" href="' + postUrl(p) + '">阅读全文 →</a>' +
      '</div>' +
      '</article>'
    );
  }

  function pagination(page, total, base) {
    if (total <= 1) return '';
    var html = '<nav class="pagination">';
    if (page <= 1) {
      html += '<span class="disabled">← 上一页</span>';
    } else {
      html += '<a href="' + base(page - 1) + '">← 上一页</a>';
    }
    for (var i = 1; i <= total; i++) {
      if (i === page) html += '<span class="current">' + i + '</span>';
      else html += '<a href="' + base(i) + '">' + i + '</a>';
    }
    if (page >= total) {
      html += '<span class="disabled">下一页 →</span>';
    } else {
      html += '<a href="' + base(page + 1) + '">下一页 →</a>';
    }
    return html + '</nav>';
  }

  /* ---------- 侧栏 ---------- */
  function renderSidebar() {
    var box = $('#sidebar');
    if (!box) return;
    var posts = sortedPosts();
    var tags = allTags().slice(0, 14);

    box.innerHTML =
      '<div class="widget profile-widget">' +
      '<div class="avatar">木</div>' +
      '<p class="name">' + esc(BLOG.author) + '</p>' +
      '<p class="role">前端开发 · 写作 · 木工</p>' +
      '<div class="profile-stats">' +
      '<div><b>' + BLOG.posts.length + '</b><span>文章</span></div>' +
      '<div><b>' + BLOG.categories.length + '</b><span>分类</span></div>' +
      '<div><b>' + allTags().length + '</b><span>标签</span></div>' +
      '</div></div>' +

      '<div class="widget"><div class="widget-head">文章分类</div>' +
      '<div class="widget-body"><ul class="cat-list">' +
      BLOG.categories.map(function (c) {
        return (
          '<li><a href="' + catUrl(c.name) + '"><span class="cat-dot"></span>' +
          esc(c.emoji + ' ' + c.name) + '</a>' +
          '<span class="count-pill">' + catCount(c.name) + '</span></li>'
        );
      }).join('') +
      '</ul></div></div>' +

      '<div class="widget"><div class="widget-head">标签云</div>' +
      '<div class="widget-body"><div class="tag-cloud">' +
      tags.map(function (t) {
        return '<a class="tag" href="' + tagUrl(t.name) + '" style="font-size:' + (12 + Math.min(t.count, 6)) + 'px">#' + esc(t.name) + ' ' + t.count + '</a>';
      }).join('') +
      '</div></div></div>' +

      '<div class="widget"><div class="widget-head">最新文章</div>' +
      '<div class="widget-body"><ul class="mini-list">' +
      posts.slice(0, 5).map(function (p) {
        return '<li><a href="' + postUrl(p) + '">' + esc(p.title) +
          '<time>' + fmtDate(p.date) + '</time></a></li>';
      }).join('') +
      '</ul></div></div>';
  }

  /* ---------- 各页面 ---------- */
  function renderHome() {
    renderSidebar();
    var posts = sortedPosts();
    var q = params();
    var page = Math.max(1, parseInt(q.page || '1', 10) || 1);
    var total = Math.ceil(posts.length / PAGE_SIZE);
    if (page > total) page = total;

    var slice = posts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    var list = $('#homeList');
    if (list) {
      list.innerHTML = slice.map(function (p) { return postCard(p); }).join('');
    }

    var pg = $('#homePager');
    if (pg) {
      pg.innerHTML = pagination(page, total, function (n) {
        var base = rootPrefix() + 'index.html';
        return n <= 1 ? base : base + '?page=' + n;
      });
    }

    var stats = $('#heroStats');
    if (stats) {
      stats.innerHTML =
        '<span class="stat-chip"><b>' + BLOG.posts.length + '</b> 篇文章</span>' +
        '<span class="stat-chip"><b>' + BLOG.categories.length + '</b> 个分类</span>' +
        '<span class="stat-chip"><b>' + allTags().length + '</b> 个标签</span>' +
        '<span class="stat-chip"><b>自 ' + BLOG.since + '</b> 持续搭建</span>';
    }
  }

  function renderList() {
    renderSidebar();
    var q = params();
    var title = '文章列表';
    var sub = '浏览全部文章';
    var posts = sortedPosts();

    if (q.cat) {
      title = q.cat;
      sub = '分类下的全部文章';
      posts = posts.filter(function (p) { return p.category === q.cat; });
    } else if (q.tag) {
      title = '#' + q.tag;
      sub = '带有该标签的全部文章';
      posts = posts.filter(function (p) {
        return p.tags.some(function (t) { return t.toLowerCase() === q.tag.toLowerCase(); });
      });
    }

    var h1 = $('#listTitle');
    var p1 = $('#listDesc');
    var crumb = $('#listCrumb');
    if (h1) h1.textContent = title;
    if (p1) p1.textContent = sub + ' · 共 ' + posts.length + ' 篇';
    if (crumb) {
      var home = rootPrefix() + 'index.html';
      crumb.innerHTML = '<a href="' + home + '">首页</a><span>›</span><span>' + esc(title) + '</span>';
    }

    var box = $('#listBody');
    if (!box) return;

    if (!posts.length) {
      box.innerHTML =
        '<div class="empty-state"><div class="big">🍃</div>' +
        '<p>这个角落还没有文章</p><p><a href="' + rootPrefix() + 'index.html">← 回首页看看</a></p></div>';
      return;
    }
    box.innerHTML = posts.map(function (p) { return postCard(p, { allowFeatured: false }); }).join('');
  }

  function renderCategories() {
    var box = $('#catGrid');
    if (!box) return;
    box.innerHTML = BLOG.categories.map(function (c) {
      return (
        '<a class="cat-card" href="' + catUrl(c.name) + '">' +
        '<div class="emoji">' + c.emoji + '</div>' +
        '<h3>' + esc(c.name) + '</h3>' +
        '<p>' + esc(c.desc) + '</p>' +
        '<span class="num">' + catCount(c.name) + ' 篇文章 →</span>' +
        '</a>'
      );
    }).join('');
  }

  function renderTags() {
    var box = $('#tagGrid');
    if (!box) return;
    var tags = allTags();
    $('#tagCount').textContent = '共 ' + tags.length + ' 个标签';
    box.innerHTML = tags.map(function (t) {
      return '<a class="tag" href="' + tagUrl(t.name) + '" style="font-size:' + (13 + Math.min(t.count, 6) * 1.2) + 'px; padding: ' + (5 + Math.min(t.count, 5)) + 'px ' + (12 + Math.min(t.count, 5) * 2) + 'px">#' + esc(t.name) + ' <b>' + t.count + '</b></a>';
    }).join('');
  }

  function renderArchive() {
    var box = $('#archiveBody');
    if (!box) return;
    var posts = sortedPosts();
    var years = {};
    posts.forEach(function (p) {
      var y = p.date.slice(0, 4);
      (years[y] = years[y] || []).push(p);
    });
    var keys = Object.keys(years).sort(function (a, b) { return b - a; });

    $('#archiveCount').textContent = '共 ' + posts.length + ' 篇文章，跨越 ' + keys.length + ' 个年份';

    box.innerHTML = keys.map(function (y) {
      return (
        '<section class="archive-year">' +
        '<h2>' + y + '<small>' + years[y].length + ' 篇</small></h2>' +
        years[y].map(function (p) {
          return (
            '<div class="archive-item">' +
            '<time datetime="' + p.date + '">' + fmtDate(p.date) + '</time>' +
            '<div><a href="' + postUrl(p) + '">' + esc(p.title) + '</a>' +
            '<span class="cat-mini">' + esc(p.category) + '</span></div>' +
            '</div>'
          );
        }).join('') +
        '</section>'
      );
    }).join('');
  }

  function renderLinks() {
    var box = $('#linkGrid');
    if (!box) return;
    if (!BLOG.links || !BLOG.links.length) {
      box.innerHTML =
        '<div class="empty-state" style="grid-column:1/-1">' +
        '<div class="big">🪵</div>' +
        '<p><strong>暂无友链</strong></p>' +
        '<p>这里还没有交换链接的站点。</p>' +
        '</div>';
      return;
    }
    box.innerHTML = BLOG.links.map(function (l) {
      var inner =
        '<div class="link-ava">' + esc(l.name.charAt(0)) + '</div>' +
        '<div><b>' + esc(l.name) + '</b><span>' + esc(l.desc) + '</span></div>';
      if (l.url && l.url !== '#') {
        return (
          '<a class="link-card" href="' + esc(l.url) + '" target="_blank" rel="noopener nofollow">' +
          inner + '</a>'
        );
      }
      return (
        '<div class="link-card pending" title="友链交换中">' +
        inner +
        '<span class="link-badge">待交换</span>' +
        '</div>'
      );
    }).join('');
  }

  function renderAbout() {
    var el = $('#aboutStats');
    if (el) {
      el.innerHTML =
        '<b>' + BLOG.posts.length + '</b> 篇文章 · <b>' +
        BLOG.categories.length + '</b> 个分类 · <b>' +
        allTags().length + '</b> 个标签 · 自 ' + BLOG.since + ' 年';
    }
  }

  /* ---------- 文章页 ---------- */
  function renderPost() {
    var q = params();
    var slug = q.id || document.body.getAttribute('data-slug');
    var post = findPost(slug) || sortedPosts()[0];
    if (!post) return;

    document.title = post.title + ' · ' + BLOG.title;
    setMeta('meta[name="description"]', post.excerpt);
    setMeta('meta[property="og:type"]', 'article');
    setMeta('meta[property="og:title"]', post.title);
    setMeta('meta[property="og:description"]', post.excerpt);
    setMeta('meta[property="og:site_name"]', BLOG.title);
    setMeta('meta[name="twitter:card"]', 'summary');
    setMeta('meta[name="twitter:title"]', post.title);
    setMeta('meta[name="twitter:description"]', post.excerpt);

    var pageRel = rootPrefix() + 'p/' + post.slug + '.html';
    var abs = absUrl('p/' + post.slug + '.html');
    if (abs) {
      setLink('canonical', abs);
      setMeta('meta[property="og:url"]', abs);
    }

    var ldOld = document.getElementById('jsonld');
    if (ldOld) ldOld.parentNode.removeChild(ldOld);
    var ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.id = 'jsonld';
    var ldData = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.excerpt,
      datePublished: post.date,
      dateModified: post.updated || post.date,
      author: { '@type': 'Person', name: BLOG.author },
      publisher: { '@type': 'Person', name: BLOG.author },
      mainEntityOfPage: abs || pageRel
    };
    if (post.tags && post.tags.length) ldData.keywords = post.tags.join('，');
    ld.textContent = JSON.stringify(ldData);
    document.head.appendChild(ld);

    var posts = sortedPosts();
    var idx = posts.indexOf(post);
    var prev = posts[idx + 1] || null;
    var next = posts[idx - 1] || null;

    var head = $('#postHead');
    if (head) {
      head.innerHTML =
        '<div class="post-card-top">' +
        '<a class="badge badge-cat" href="' + catUrl(post.category) + '">' + esc(post.category) + '</a>' +
        (post.featured ? '<span class="badge badge-featured">精选</span>' : '') +
        post.tags.map(function (t) {
          return '<a class="tag" href="' + tagUrl(t) + '">#' + esc(t) + '</a>';
        }).join('') +
        '</div>' +
        '<h1>' + esc(post.title) + '</h1>' +
        '<div class="article-meta">' +
        '<span>' + ICON.user + esc(BLOG.author) + '</span>' +
        '<span>' + ICON.cal + '发布于 ' + fmtDate(post.date) + '</span>' +
        (post.updated ? '<span>' + ICON.cal + '更新于 ' + fmtDate(post.updated) + '</span>' : '') +
        '<span>' + ICON.clock + '阅读约 ' + readingTime(post.content) + ' 分钟</span>' +
        '<span><button class="btn btn-ghost" style="padding:4px 14px;font-size:12.5px" id="copyLink">复制链接</button></span>' +
        '</div>';
    }

    var rendered = MD.render(post.content);
    var body = $('#postBody');
    if (body) {
      body.innerHTML = rendered.html +
        '<div class="article-end">' +
        '<div class="end-mark">· · · 完 · · ·</div>' +
        '<p class="author-line">本文由 <b>' + esc(BLOG.author) + '</b> 撰写，欢迎以链接形式分享</p>' +
        '</div>';
    }

    var tocBox = $('#tocList');
    if (tocBox) {
      if (rendered.toc.length) {
        tocBox.innerHTML = rendered.toc.map(function (h) {
          return '<li class="lv' + h.level + '"><a href="#' + h.id + '" data-toc="' + h.id + '">' + esc(h.text) + '</a></li>';
        }).join('');
      } else {
        tocBox.innerHTML = '<li class="toc-empty">本文暂无目录</li>';
      }
    }

    var nav = $('#postNav');
    if (nav) {
      nav.innerHTML =
        (prev
          ? '<a class="prev" href="' + postUrl(prev) + '"><span class="dir">← 上一篇</span><span class="ttl">' + esc(prev.title) + '</span></a>'
          : '<span class="prev nav-item empty"><span class="dir">← 上一篇</span><span class="ttl">没有了</span></span>') +
        (next
          ? '<a class="next" href="' + postUrl(next) + '"><span class="dir">下一篇 →</span><span class="ttl">' + esc(next.title) + '</span></a>'
          : '<span class="next nav-item empty"><span class="dir">下一篇 →</span><span class="ttl">没有了</span></span>');
    }

    var rel = posts.filter(function (p) {
      if (p === post) return false;
      return p.category === post.category || p.tags.some(function (t) { return post.tags.indexOf(t) !== -1; });
    }).slice(0, 3);

    var relBox = $('#relatedList');
    if (relBox) {
      if (rel.length) {
        $('#relatedWrap').style.display = '';
        relBox.innerHTML = rel.map(function (p) { return postCard(p, { allowFeatured: false }); }).join('');
      } else {
        $('#relatedWrap').style.display = 'none';
      }
    }

    var copyBtn = $('#copyLink');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var url = location.href;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(function () { toast('链接已复制'); },
            function () { fallbackCopy(url); });
        } else {
          fallbackCopy(url);
        }
      });
    }

    initTocHighlight();
    initProgress();
    initComments(post);
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast('链接已复制'); }
    catch (e) { toast('复制失败'); }
    document.body.removeChild(ta);
  }

  function initTocHighlight() {
    var links = $$('#tocList a[data-toc]');
    if (!links.length || !('IntersectionObserver' in window)) return;
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('data-toc')] = a; });

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          links.forEach(function (a) { a.classList.remove('active'); });
          var a = map[en.target.id];
          if (a) a.classList.add('active');
        }
      });
    }, { rootMargin: '-80px 0px -70% 0px', threshold: 0 });

    $$('#postBody h1, #postBody h2, #postBody h3, #postBody h4').forEach(function (h) {
      observer.observe(h);
    });
  }

  function initProgress() {
    var bar = $('#readProgress');
    if (!bar) return;
    function update() {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
      bar.style.width = pct + '%';
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* ---------- 本地评论 ---------- */
  function commentKey(slug) { return 'ws-comments:' + slug; }

  function loadComments(slug) {
    try {
      return JSON.parse(localStorage.getItem(commentKey(slug)) || '[]');
    } catch (e) { return []; }
  }

  function saveComments(slug, list) {
    try { localStorage.setItem(commentKey(slug), JSON.stringify(list)); } catch (e) {}
  }

  function initComments(post) {
    var form = $('#commentForm');
    var list = $('#commentList');
    if (!form || !list) return;

    function paint() {
      var items = loadComments(post.slug);
      if (!items.length) {
        list.innerHTML = '<div class="comments-empty">还没有留言。写下第一条（仅当前浏览器可见）</div>';
        return;
      }
      list.innerHTML = items.map(function (c, i) {
        var name = c.name || '匿名';
        return (
          '<li class="comment-item' + (c.self ? '' : ' guest') + '">' +
          '<div class="comment-avatar">' + esc(name.charAt(0)) + '</div>' +
          '<div class="comment-main">' +
          '<div class="comment-head"><b>' + esc(name) + '</b>' +
          '<time>' + esc(c.time) + '</time>' +
          (c.self ? '<button class="comment-del" data-i="' + i + '">删除</button>' : '') +
          '</div><p>' + esc(c.text) + '</p>' +
          '</div></li>'
        );
      }).join('');
    }

    paint();

    list.addEventListener('click', function (e) {
      var btn = e.target.closest('.comment-del');
      if (!btn) return;
      var items = loadComments(post.slug);
      items.splice(+btn.getAttribute('data-i'), 1);
      saveComments(post.slug, items);
      paint();
      toast('已删除');
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = $('#cName').value.trim() || '匿名';
      var text = $('#cText').value.trim();
      if (!text) { toast('说点什么再提交吧'); return; }
      var items = loadComments(post.slug);
      items.unshift({
        name: name.slice(0, 20),
        text: text.slice(0, 1000),
        time: new Date().toLocaleString('zh-CN', { hour12: false }),
        self: true
      });
      saveComments(post.slug, items);
      form.reset();
      paint();
      toast('留言已保存到本地');
    });
  }

  /* ---------- 返回顶部 ---------- */
  function initBackTop() {
    var btn = $('#backTop');
    if (!btn) return;
    window.addEventListener('scroll', function () {
      if (window.scrollY > 420) btn.classList.add('show');
      else btn.classList.remove('show');
    }, { passive: true });
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------- 启动 ---------- */
  function boot() {
    initTheme();
    initHeader();
    initBackTop();

    var y = $('#yearNow');
    if (y) y.textContent = new Date().getFullYear();

    var brandTitle = $$('.js-title');
    brandTitle.forEach(function (el) { el.textContent = BLOG.title; });

    switch (document.body.getAttribute('data-page')) {
      case 'home': renderHome(); break;
      case 'post': renderPost(); break;
      case 'list': renderList(); break;
      case 'categories': renderCategories(); break;
      case 'tags': renderTags(); break;
      case 'archive': renderArchive(); break;
      case 'about': renderAbout(); break;
      case 'links': renderLinks(); break;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
