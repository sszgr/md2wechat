# md2wechat

一个纯前端的 Markdown -> 微信公众号排版工具，目标是让你在本地快速完成编辑、预览、主题调整，并把结果直接粘贴到公众号编辑器。

## 在线预览

- https://md.sszgr.com

## 特性总览

- 纯前端实现，无后端依赖
- Markdown 编辑器（CodeMirror）
- 实时预览（markdown-it）
- 预览主题切换（内置多主题）
- 代码高亮主题切换（highlight.js，多代码主题）
- 主题管理页：查看 / 编辑 / 新增 / 删除 / 另存为
- 主题 CSS 编辑：CodeMirror + CSS 自动补全
- 常用主题片段快速插入（标题、引用、代码块、表格等）
- 预览模式切换（手机 / 桌面）
- 一键复制到公众号（复制 HTML + 内联样式）
- 一键全选预览区（手动复制兜底）
- 本地自动保存（Markdown、主题选择、预览模式、自定义主题）

## 项目结构

```text
.
├─ src/
│  ├─ main.js        # 主逻辑：编辑器、预览、主题、复制、持久化
│  └─ styles.css     # 页面与组件样式
├─ public/
│  └─ vendor/
│     └─ highlight.js/
│        ├─ highlight.min.js
│        └─ styles/  # 各代码高亮主题 CSS
├─ index.html
└─ vite.config.js
```

## 本地开发

```bash
npm install
npm run dev
```

打开开发地址后即可使用。

## 构建与预览

```bash
npm run build
npm run preview
```

构建产物在 `dist/`。

## 使用说明

1. 在左侧输入 Markdown。
2. 在顶部选择“预览主题 / 代码主题 / 预览方式”。
3. 如需改样式，进入“主题管理”页编辑 CSS。
4. 点击“复制到公众号”，然后粘贴到公众号编辑器。
5. 如果浏览器权限限制复制，可先点“全选预览”再手动复制。

## 主题管理说明

- 内置主题可查看，保存时会自动作为自定义主题保存。
- 自定义主题支持新增、编辑、删除。
- 建议所有规则以 `.wx-article` 为根选择器，避免污染外部样式。

示例：

```css
.wx-article {
  font-size: 16px;
  line-height: 1.75;
  color: #333;
}

.wx-article h2 {
  border-left: 4px solid #07c160;
  padding-left: 0.6em;
}
```

## 复制策略说明

为尽量适配公众号粘贴场景，复制逻辑会：

- 复制 `text/html` + `text/plain`
- 对预览 DOM 进行内联样式展开
- 去除会限制粘贴后布局的根容器样式（如卡片边框/圆角/宽度限制）

## 技术栈

- Vite
- CodeMirror 6
- markdown-it
- highlight.js
