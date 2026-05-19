# md2wechat

`md2wechat` 是一个纯前端的 Markdown 到微信公众号排版工具。它把写作、预览、主题切换、图片管理和复制发布放在同一个页面里，减少反复调样式和来回粘贴的时间。

## 在线使用

https://md.sszgr.com

## 适合解决什么问题

公众号编辑器对 Markdown、代码块、表格、引用和图片的支持并不稳定。文章写完后，常常还要再花时间调整字号、间距、代码样式和图片位置。

`md2wechat` 的目标是把这些问题前置到预览阶段：先排版，后发布，尽量让复制到公众号后的效果接近预览。

## 功能亮点

- Markdown 编辑与实时预览
- 手机 / 桌面预览模式切换
- 内置多套文章主题，支持收藏置顶
- 代码主题切换，也可选择“跟随主题”
- 主题管理：查看、编辑、新增、删除、另存为
- 主题 CSS 编辑器：CodeMirror + CSS 自动补全
- 常用主题片段快速插入
- 图片资源管理：上传、替换、预览文中图片
- 一键复制到公众号：复制 HTML 并内联样式
- 全选预览区：作为手动复制兜底
- 本地自动保存：Markdown、主题、自定义主题和偏好设置

## 快速使用

1. 在左侧输入或粘贴 Markdown。
2. 在右侧检查文章预览。
3. 切换文章主题、代码主题和预览模式。
4. 如需调整样式，进入“主题管理”编辑或另存为自定义主题。
5. 点击“复制到公众号”，粘贴到公众号编辑器后再做最后检查。

## 本地开发

```bash
npm install
npm run dev
```

建议使用 Node.js `20.19+` 或 `22.12+`。

## 构建与预览

```bash
npm run build
npm run preview
```

构建产物会输出到 `dist/`。

## 项目结构

```text
.
├─ src/
│  ├─ default.md       # 打开页面时展示的默认示例文章
│  ├─ main.js          # 主逻辑：编辑器、预览、主题、复制、持久化
│  ├─ styles.css       # 页面与组件样式
│  └─ theme-preview.md # 主题管理页右侧预览文章
├─ public/
│  ├─ wechat-qrcode.png
│  ├─ theme-covers/    # 主题卡片封面图，按主题 id 命名
│  └─ vendor/
│     └─ highlight.js/
│        ├─ highlight.min.js
│        └─ styles/    # 代码高亮主题 CSS
├─ index.html
├─ package.json
└─ vite.config.js
```

## 主题定制

内置主题可以直接使用，也可以基于它“另存为”自定义主题。建议所有样式规则都以 `.wx-article` 为根选择器，避免影响编辑器页面本身。

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

补充说明：

- 主题封面可放在 `public/theme-covers/<theme-id>.svg`
- 主题管理页的预览文章可编辑 `src/theme-preview.md`
- 默认打开时的文章内容可编辑 `src/default.md`
- 如果代码主题选择“跟随主题”，代码块会使用当前文章主题里的 `pre` / `code` 样式

## 复制策略

为适配公众号粘贴场景，复制逻辑会：

- 同时写入 `text/html` 和 `text/plain`
- 将预览区域的计算样式转换为内联样式
- 去除根容器上的边框、圆角、宽度限制等页面预览样式
- 尽量保留代码块、表格、引用和图片的展示效果

## 技术栈

- Vite
- CodeMirror 6
- markdown-it
- highlight.js

## 公众号与更新

如果现有主题还不够贴合你的内容风格，或者你希望定制专属排版方案，欢迎关注公众号：**碎碎冰安全**。

![公众号二维码](./public/wechat-qrcode.png)

后续会继续同步：

- 主题模板更新
- 可复用样式片段
- 微信公众号排版技巧
- 项目版本动态

## 私人部署说明

如果你将本项目用于个人私有部署，建议在页面或文档中保留项目来源与公众号链接。这样能帮助更多人找到原项目并持续获得更新，也感谢你对开源项目的支持。
