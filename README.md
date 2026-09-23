# 木质脚手架

个人博客 · 纯静态站点 · 作者署名「木质脚手架」

在线地址：<https://tpsqi.github.io/>

---

## 关于本项目

本仓库由 **AI 模型协助从零编写**（模型：`opencode/mimo-v2.6-flash-free`，对话式编程助手 opencode）。

人负责提出需求、验收与内容审定；模型负责生成页面结构、样式、交互脚本、Markdown 渲染器、预渲染构建脚本与示例文章。站点本身不依赖任何前端框架或服务端运行时。

## 技术栈

| 层 | 技术 |
|---|---|
| 结构 | 语义化 HTML5（多页面） |
| 样式 | 原生 CSS（自定义属性深浅色、Grid / Flex 响应式） |
| 交互 | 原生 JavaScript（ES5+ 风格，无打包、无转译） |
| 正文 | Markdown → 自研轻量解析器 `js/markdown.js` |
| 数据 | `js/articles.js` 全局对象（文章、分类、标签、友链） |
| 预渲染 | Node.js + jsdom（`tools/build.js` 生成 `p/*.html`） |
| 测试 | Node 断言 + jsdom 集成测试（`test/`） |
| 托管 | GitHub Pages（`TPSQI.github.io`） |

**明确不使用：** React / Vue、构建器（Vite / Webpack）、SSR 框架、后端服务、数据库。

## 功能

- 首页文章列表与分页
- 文章详情：目录（TOC）、阅读进度、上下篇、相关阅读、复制链接
- 分类 / 标签 / 按年归档
- 全文搜索（`Ctrl / ⌘ + K`）
- 深色 / 浅色主题（记忆偏好，防闪烁）
- 本地留言（`localStorage`，不上传服务器）
- 响应式布局、无障碍跳过链接、404 页
- SEO：Open Graph、JSON-LD、预渲染正文

## 目录结构

```text
.
├── index.html          # 首页
├── post.html           # 文章模板（?id= 或 data-slug）
├── list.html           # 分类 / 标签列表
├── archive.html        # 归档
├── categories.html     # 分类总览
├── tags.html           # 标签云
├── about.html          # 关于
├── links.html          # 友链
├── 404.html
├── robots.txt
├── css/style.css       # 全站样式
├── js/
│   ├── markdown.js     # Markdown 解析器
│   ├── articles.js     # 站点配置 + 全部文章数据
│   └── app.js          # 页面逻辑
├── p/                  # 预渲染文章页（构建产物，可直接访问）
├── tools/build.js      # 预渲染 + sitemap / RSS 生成
└── test/               # 冒烟 / DOM / 预渲染测试
```

## 本地开发

无需安装依赖即可浏览（任意静态服务器或直接打开均可）：

```bash
# 可选：本地起一个静态服务
npx serve .
```

运行测试（需先安装 jsdom，仅开发需要）：

```bash
npm install --prefix test jsdom
node test/smoke.js
node test/prerender.js
node test/dom.js
node test/public.js
```

## 写文章

编辑 `js/articles.js`，在 `posts` 数组中追加一条：

```js
{
  slug: 'my-first-post',       // 唯一英文 slug
  title: '文章标题',
  date: '2026-09-23',
  category: '技术',             // 技术 | 随笔 | 阅读 | 生活
  tags: ['前端'],
  excerpt: '列表页显示的摘要……',
  content: `# 正文写 Markdown`
}
```

然后重新预渲染并部署：

```bash
node tools/build.js
git add -A
git commit -m "Update posts"
git push
```

## 配置站点域名（可选）

在 `js/articles.js` 顶部填写：

```js
siteUrl: 'https://tpsqi.github.io',
```

再次执行 `node tools/build.js`，会生成：

- `sitemap.xml`
- `feed.xml`（RSS 2.0）
- `robots.txt` 中的 Sitemap 行
- 各文章页的 canonical / og:url

## 部署

推送到本仓库 `main` 分支后，GitHub Pages 会自动发布至 <https://tpsqi.github.io/>。

## License

个人博客，文章版权归作者所有。代码可自由学习与复用。
