import { EditorView, keymap } from '@codemirror/view';
import { Compartment, EditorState } from '@codemirror/state';
import { defaultKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { css } from '@codemirror/lang-css';
import { autocompletion, completionKeymap } from '@codemirror/autocomplete';
import MarkdownIt from 'markdown-it';
import readmeRaw from '../README.md?raw';
import './styles.css';

const STORAGE_KEYS = {
  markdown: 'md2wechat.markdown',
  selectedTheme: 'md2wechat.selectedTheme',
  customThemes: 'md2wechat.customThemes',
  previewMode: 'md2wechat.previewMode',
  codeTheme: 'md2wechat.codeTheme',
  inlineLinks: 'md2wechat.inlineLinks',
};

const CODE_THEMES = [
  { id: 'default', name: 'Default', cssUrl: './vendor/highlight.js/styles/default.min.css' },
  { id: 'github', name: 'GitHub', cssUrl: './vendor/highlight.js/styles/github.min.css' },
  { id: 'github-dark', name: 'GitHub Dark', cssUrl: './vendor/highlight.js/styles/github-dark.min.css' },
  { id: 'solarized-light', name: 'Solarized Light', cssUrl: './vendor/highlight.js/styles/solarized-light.min.css' },
  { id: 'atom-one-light', name: 'Atom One Light', cssUrl: './vendor/highlight.js/styles/atom-one-light.min.css' },
  { id: 'atom-one-dark', name: 'Atom One Dark', cssUrl: './vendor/highlight.js/styles/atom-one-dark.min.css' },
  { id: 'vs', name: 'VS', cssUrl: './vendor/highlight.js/styles/vs.min.css' },
  { id: 'vs2015', name: 'VS2015', cssUrl: './vendor/highlight.js/styles/vs2015.min.css' },
  { id: 'xcode', name: 'Xcode', cssUrl: './vendor/highlight.js/styles/xcode.min.css' },
  { id: 'stackoverflow-light', name: 'StackOverflow Light', cssUrl: './vendor/highlight.js/styles/stackoverflow-light.min.css' },
  { id: 'stackoverflow-dark', name: 'StackOverflow Dark', cssUrl: './vendor/highlight.js/styles/stackoverflow-dark.min.css' },
  { id: 'tokyo-night-dark', name: 'Tokyo Night Dark', cssUrl: './vendor/highlight.js/styles/tokyo-night-dark.min.css' },
  { id: 'night-owl', name: 'Night Owl', cssUrl: './vendor/highlight.js/styles/night-owl.min.css' },
];

const CSS_SNIPPETS = [
  { label: '标题样式', code: '.wx-article h2 {\n  border-left: 4px solid #07c160;\n  padding-left: 0.6em;\n}\n' },
  { label: '引用块', code: '.wx-article blockquote {\n  margin: 1em 0;\n  padding: 0.75em 1em;\n  border-left: 4px solid #07c160;\n  background: #f6fbf8;\n}\n' },
  { label: '行内代码', code: '.wx-article code {\n  font-family: Menlo, Monaco, Consolas, monospace;\n  background: #f4f5f5;\n  padding: 0.2em 0.45em;\n  border-radius: 4px;\n}\n' },
  { label: '代码块', code: '.wx-article pre {\n  background: #1f2937;\n  color: #f9fafb;\n  border-radius: 8px;\n  padding: 0.9em 1em;\n  overflow: auto;\n}\n' },
  { label: '表格', code: '.wx-article table {\n  width: 100%;\n  border-collapse: collapse;\n}\n\n.wx-article th, .wx-article td {\n  border: 1px solid #e5e5e5;\n  padding: 0.55em 0.65em;\n}\n' },
];

const DEFAULT_MD = readmeRaw;

const NEW_THEME_TEMPLATE = `.wx-article {
  color: #333;
  font-size: 16px;
  line-height: 1.75;
}

.wx-article h2 {
  border-left: 4px solid #07c160;
  padding-left: 0.6em;
}`;

const BUILTIN_THEMES = [
  {
    id: 'classic',
    name: '经典白',
    css: `
.wx-article { color: #333; font-size: 16px; line-height: 1.75; word-break: break-word; }
.wx-article h1, .wx-article h2, .wx-article h3, .wx-article h4 { color: #111; font-weight: 700; margin: 1.6em 0 0.7em; line-height: 1.35; }
.wx-article h1 { font-size: 1.8em; }
.wx-article h2 { font-size: 1.45em; border-left: 4px solid #07c160; padding-left: 0.6em; }
.wx-article h3 { font-size: 1.22em; }
.wx-article p { margin: 0.85em 0; }
.wx-article a { color: #576b95; text-decoration: none; border-bottom: 1px solid #576b95; }
.wx-article blockquote { margin: 1em 0; padding: 0.8em 1em; color: #666; border-left: 4px solid #07c160; background: #f6fbf8; }
.wx-article ul, .wx-article ol { margin: 0.8em 0; padding-left: 1.3em; }
.wx-article code { font-family: Menlo, Monaco, Consolas, monospace; background: #f4f5f5; padding: 0.2em 0.45em; border-radius: 4px; }
.wx-article pre { margin: 1em 0; background: #1f2937; color: #f9fafb; border-radius: 8px; padding: 0.9em 1em; overflow: auto; }
.wx-article pre code { background: transparent; color: inherit; padding: 0; }
.wx-article table { width: 100%; border-collapse: collapse; margin: 1em 0; }
.wx-article th, .wx-article td { border: 1px solid #e5e5e5; padding: 0.55em 0.65em; }
`,
  },
  {
    id: 'ink',
    name: '墨色卡片',
    css: `
.wx-article { color: #2b2b2b; font-size: 16px; line-height: 1.8; background: #fffdf8; border: 1px solid #efe7d8; border-radius: 14px; padding: 22px; }
.wx-article h1, .wx-article h2, .wx-article h3, .wx-article h4 { color: #23395d; font-weight: 700; margin: 1.3em 0 0.65em; }
.wx-article h2 { border-bottom: 2px solid #23395d; padding-bottom: 0.2em; display: inline-block; }
.wx-article blockquote { margin: 1.1em 0; padding: 0.7em 1em; background: #f6f1e6; border-left: 3px solid #9b7e46; color: #6a5633; }
.wx-article code { font-family: Menlo, Monaco, Consolas, monospace; background: #f2ecde; color: #614c24; padding: 0.2em 0.45em; border-radius: 4px; }
.wx-article pre { background: #2c313a; color: #f8f8f2; border-radius: 10px; padding: 0.95em 1.05em; overflow: auto; }
.wx-article pre code { background: transparent; color: inherit; padding: 0; }
`,
  },
  {
    id: 'mint',
    name: '薄荷简约',
    css: `
.wx-article { color: #203040; font-size: 16px; line-height: 1.75; }
.wx-article h1, .wx-article h2, .wx-article h3, .wx-article h4 { margin: 1.4em 0 0.65em; line-height: 1.35; color: #1f6357; }
.wx-article h2 { background: linear-gradient(90deg, #dff8f0 0, #dff8f0 70%, transparent 70%); padding: 0.2em 0.4em; border-radius: 4px; }
.wx-article a { color: #1d8c77; text-decoration: underline; text-decoration-thickness: 1px; }
.wx-article blockquote { margin: 1em 0; padding: 0.75em 1em; border-radius: 8px; background: #eefaf6; border: 1px solid #d7f3eb; color: #2d5b51; }
.wx-article code { font-family: Menlo, Monaco, Consolas, monospace; background: #e8f6f2; color: #1c5c50; padding: 0.2em 0.42em; border-radius: 4px; }
.wx-article pre { background: #102326; color: #e9fcf6; padding: 0.95em 1.05em; border-radius: 10px; overflow: auto; }
.wx-article pre code { background: transparent; color: inherit; padding: 0; }
`,
  },
  {
    id: 'ocean',
    name: '深海蓝',
    css: `
.wx-article { color: #19324a; font-size: 16px; line-height: 1.8; }
.wx-article h1, .wx-article h2, .wx-article h3 { color: #0c4f82; margin: 1.3em 0 0.6em; }
.wx-article h2 { border-left: 5px solid #0c7ac7; padding-left: 0.55em; }
.wx-article a { color: #0c7ac7; }
.wx-article blockquote { background: #edf7ff; border-left: 4px solid #7dc7ff; margin: 1em 0; padding: 0.8em 1em; color: #30546f; }
.wx-article code { background: #e8f1f8; color: #0f4e7a; padding: 0.2em 0.4em; border-radius: 4px; }
.wx-article pre { background: #0f2233; color: #d8ecff; padding: 0.9em 1em; border-radius: 9px; overflow: auto; }
.wx-article pre code { background: transparent; color: inherit; padding: 0; }
`,
  },
  {
    id: 'sunset',
    name: '落日橙',
    css: `
.wx-article { color: #3f2a22; font-size: 16px; line-height: 1.78; }
.wx-article h1, .wx-article h2, .wx-article h3 { color: #b54b2e; margin: 1.3em 0 0.6em; }
.wx-article h2 { border-bottom: 2px dashed #e39a5d; padding-bottom: 0.25em; }
.wx-article blockquote { background: #fff4e8; border-left: 4px solid #ef8f47; margin: 1em 0; padding: 0.75em 1em; color: #7c4f2b; }
.wx-article a { color: #cb6239; }
.wx-article code { background: #ffebdb; color: #7c3b1a; padding: 0.2em 0.4em; border-radius: 4px; }
.wx-article pre { background: #3d2720; color: #ffe7d7; padding: 0.95em 1.05em; border-radius: 10px; overflow: auto; }
.wx-article pre code { background: transparent; color: inherit; padding: 0; }
`,
  },
  {
    id: 'violet-paper',
    name: '紫藤纸感',
    css: `
.wx-article { color: #2f2a42; font-size: 16px; line-height: 1.78; background: #fcfaff; border: 1px solid #ede7fb; border-radius: 10px; }
.wx-article h1, .wx-article h2, .wx-article h3 { color: #5b3fa6; margin: 1.35em 0 0.65em; }
.wx-article h2 { border-left: 4px solid #8f76d8; padding-left: 0.55em; }
.wx-article a { color: #6c4bc4; }
.wx-article blockquote { background: #f6f1ff; border-left: 4px solid #b39df0; padding: 0.75em 1em; margin: 1em 0; color: #4d4173; }
.wx-article code { background: #f0eaff; color: #5a3ea7; padding: 0.2em 0.45em; border-radius: 4px; }
.wx-article pre { background: #241f35; color: #efe8ff; padding: 0.95em 1.05em; border-radius: 10px; overflow: auto; }
.wx-article pre code { background: transparent; color: inherit; padding: 0; }
`,
  },
  {
    id: 'mono-news',
    name: '报刊黑白',
    css: `
.wx-article { color: #1f1f1f; font-size: 16px; line-height: 1.85; font-family: Georgia, "Times New Roman", serif; }
.wx-article h1, .wx-article h2, .wx-article h3 { color: #111; margin: 1.5em 0 0.65em; }
.wx-article h2 { border-bottom: 1px solid #111; padding-bottom: 0.3em; }
.wx-article blockquote { margin: 1em 0; padding: 0.7em 1em; border-left: 3px solid #333; background: #f7f7f7; }
.wx-article a { color: #111; text-decoration: underline; }
.wx-article code { background: #f1f1f1; color: #111; padding: 0.2em 0.4em; border-radius: 3px; font-family: Menlo, Consolas, monospace; }
.wx-article pre { background: #101010; color: #f2f2f2; padding: 0.95em 1.05em; border-radius: 8px; overflow: auto; }
.wx-article pre code { background: transparent; color: inherit; padding: 0; }
`,
  },
];

const INLINE_STYLE_PROPS = [
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
  'border-radius',
  'background', 'background-color',
  'color', 'font-size', 'font-weight', 'font-style', 'font-family',
  'line-height', 'letter-spacing',
  'text-align', 'text-decoration', 'text-indent', 'white-space', 'word-break',
  'vertical-align',
  'list-style-type',
  'box-shadow',
];

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getHljs() {
  return window.hljs || null;
}

function getCodeThemeById(themeId) {
  return CODE_THEMES.find((theme) => theme.id === themeId) ?? CODE_THEMES[0];
}

function getInitialCodeThemeId() {
  return localStorage.getItem(STORAGE_KEYS.codeTheme) ?? 'github-dark';
}

function syncCodeThemeColors() {
  const probe = document.createElement('pre');
  probe.className = 'hljs';
  probe.textContent = 'probe';
  document.body.appendChild(probe);

  const computed = window.getComputedStyle(probe);
  document.documentElement.style.setProperty('--hljs-bg', computed.backgroundColor);
  document.documentElement.style.setProperty('--hljs-fg', computed.color);

  document.body.removeChild(probe);
}

function loadHighlightAssets(themeId, onReady) {
  const codeTheme = getCodeThemeById(themeId);
  let finished = false;
  const done = () => {
    if (finished) return;
    finished = true;
    syncCodeThemeColors();
    onReady();
  };

  let cssLink = document.querySelector('link[data-hljs-css="1"]');
  if (!cssLink) {
    cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.dataset.hljsCss = '1';
    document.head.appendChild(cssLink);
  }
  cssLink.onload = done;
  cssLink.href = codeTheme.cssUrl;
  window.setTimeout(done, 220);

  if (getHljs()) {
    return;
  }

  const exists = document.querySelector('script[data-hljs-js="1"]');
  if (exists) return;

  const script = document.createElement('script');
  script.src = './vendor/highlight.js/highlight.min.js';
  script.async = true;
  script.dataset.hljsJs = '1';
  script.onload = done;
  document.head.appendChild(script);
}

const md = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
  typographer: true,
  highlight(str, lang) {
    const hljs = getHljs();
    if (!hljs) {
      return `<pre><code>${escapeHtml(str)}</code></pre>`;
    }
    if (lang && hljs.getLanguage(lang)) {
      const highlighted = hljs.highlight(str, { language: lang }).value;
      return `<pre class="hljs"><code class="language-${lang}">${highlighted}</code></pre>`;
    }
    const highlighted = hljs.highlightAuto(str).value;
    return `<pre class="hljs"><code>${highlighted || escapeHtml(str)}</code></pre>`;
  },
});

const app = document.querySelector('#app');
app.innerHTML = `
  <header class="toolbar">
    <div class="toolbar-left">
      <span class="logo">md2wechat</span>
      <button id="editorViewBtn" class="tab-btn active" type="button">编辑器</button>
      <button id="themeViewBtn" class="tab-btn" type="button">主题管理</button>
      <div class="tool-field">
        <span class="tool-label">预览主题：</span>
        <select id="themeSelect" title="选择主题"></select>
      </div>
      <div class="tool-field">
        <span class="tool-label">代码主题：</span>
        <select id="codeThemeSelect" title="代码主题"></select>
      </div>
      <div class="tool-field">
        <span class="tool-label">预览方式：</span>
        <select id="previewModeSelect" title="预览设备">
          <option value="mobile">手机</option>
          <option value="desktop">桌面</option>
        </select>
      </div>
    </div>
    <div class="toolbar-right">
      <a
        class="icon-btn github-link"
        href="https://github.com/sszgr/md2wechat"
        target="_blank"
        rel="noopener noreferrer"
        title="打开 GitHub 仓库"
        aria-label="打开 GitHub 仓库"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 .5A11.5 11.5 0 0 0 .5 12.22c0 5.23 3.36 9.67 8.03 11.24.59.12.8-.27.8-.58v-2.2c-3.27.73-3.95-1.61-3.95-1.61-.53-1.4-1.3-1.77-1.3-1.77-1.06-.74.08-.73.08-.73 1.17.08 1.79 1.24 1.79 1.24 1.05 1.84 2.74 1.31 3.4 1 .1-.78.4-1.31.73-1.61-2.61-.31-5.35-1.35-5.35-6.01 0-1.33.46-2.42 1.22-3.27-.12-.31-.53-1.56.12-3.24 0 0 1-.33 3.3 1.25a11.2 11.2 0 0 1 6.01 0c2.29-1.58 3.29-1.25 3.29-1.25.66 1.68.25 2.93.12 3.24.76.85 1.22 1.94 1.22 3.27 0 4.67-2.75 5.7-5.37 6 .42.37.8 1.07.8 2.17v3.21c0 .31.2.71.81.58A11.74 11.74 0 0 0 23.5 12.2 11.5 11.5 0 0 0 12 .5Z" />
        </svg>
      </a>
    </div>
  </header>

  <main id="editorView" class="workspace">
    <section class="panel editor-panel">
      <div class="panel-title">Markdown</div>
      <div id="editor"></div>
    </section>
    <section class="panel preview-panel">
      <div class="panel-title panel-title-row">
        <span>预览</span>
        <div class="panel-title-actions">
          <button id="inlineLinksBtn" type="button">追加文内链接：关</button>
          <button id="selectPreviewBtn" type="button">全选预览</button>
          <button id="copyBtn" class="primary" type="button">复制到公众号</button>
        </div>
      </div>
      <div class="preview-scroll">
        <div id="previewViewport" class="preview-viewport mobile">
          <article id="preview" class="wx-article"></article>
        </div>
      </div>
    </section>
  </main>

  <main id="themeManagerView" class="theme-manager hidden">
    <section class="panel theme-list-panel">
      <div class="panel-title">主题列表</div>
      <div id="themeList" class="theme-list"></div>
    </section>
    <section class="panel theme-form-panel">
      <div class="panel-title">主题编辑</div>
      <div class="theme-form">
        <label for="themeNameInput">主题名称</label>
        <input id="themeNameInput" type="text" placeholder="输入主题名称" />
        <label>主题 CSS</label>
        <div id="themeCssEditor" class="theme-css-editor"></div>
        <div class="theme-hints">
          <div class="theme-hints-title">基础提示（可点击插入）</div>
          <div id="snippetList" class="snippet-list"></div>
        </div>
        <div class="theme-form-actions">
          <button id="newThemeBtn" type="button">新增主题</button>
          <button id="duplicateThemeBtn" type="button">另存为新主题</button>
          <button id="saveThemeBtn" class="primary" type="button">保存主题</button>
          <button id="deleteThemeBtn" class="danger" type="button">删除主题</button>
          <button id="applyThemeBtn" type="button">应用到预览</button>
        </div>
      </div>
    </section>
  </main>
`;

const editorViewBtn = document.querySelector('#editorViewBtn');
const themeViewBtn = document.querySelector('#themeViewBtn');
const editorViewRoot = document.querySelector('#editorView');
const themeManagerViewRoot = document.querySelector('#themeManagerView');
const themeSelect = document.querySelector('#themeSelect');
const codeThemeSelect = document.querySelector('#codeThemeSelect');
const previewModeSelect = document.querySelector('#previewModeSelect');
const previewViewport = document.querySelector('#previewViewport');
const inlineLinksBtn = document.querySelector('#inlineLinksBtn');
const selectPreviewBtn = document.querySelector('#selectPreviewBtn');
const copyBtn = document.querySelector('#copyBtn');
const preview = document.querySelector('#preview');

const themeList = document.querySelector('#themeList');
const themeNameInput = document.querySelector('#themeNameInput');
const themeCssEditorHost = document.querySelector('#themeCssEditor');
const snippetList = document.querySelector('#snippetList');
const newThemeBtn = document.querySelector('#newThemeBtn');
const duplicateThemeBtn = document.querySelector('#duplicateThemeBtn');
const saveThemeBtn = document.querySelector('#saveThemeBtn');
const deleteThemeBtn = document.querySelector('#deleteThemeBtn');
const applyThemeBtn = document.querySelector('#applyThemeBtn');

const themeStyleTag = document.createElement('style');
themeStyleTag.id = 'theme-style';
document.head.appendChild(themeStyleTag);

const cssEditableCompartment = new Compartment();
let cssEditorView = null;

let currentView = 'editor';
let managerEditingMode = 'existing';
let managerSelectedThemeId = null;
let customThemes = loadCustomThemes();
let allThemes = [...BUILTIN_THEMES, ...customThemes];
let inlineLinksEnabled = localStorage.getItem(STORAGE_KEYS.inlineLinks) === '1';

function loadCustomThemes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.customThemes);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((t) => t && t.id && t.name && t.css)
      .map((t) => ({ ...t, custom: true }));
  } catch {
    return [];
  }
}

function saveCustomThemes() {
  localStorage.setItem(STORAGE_KEYS.customThemes, JSON.stringify(customThemes));
}

function getThemeById(themeId) {
  return allThemes.find((t) => t.id === themeId) ?? BUILTIN_THEMES[0];
}

function refreshThemes() {
  allThemes = [...BUILTIN_THEMES, ...customThemes];
  renderThemeOptions();
  renderThemeList();
}

function renderThemeOptions() {
  const activeThemeId = localStorage.getItem(STORAGE_KEYS.selectedTheme) ?? BUILTIN_THEMES[0].id;
  themeSelect.innerHTML = '';
  allThemes.forEach((theme) => {
    const option = document.createElement('option');
    option.value = theme.id;
    option.textContent = theme.name;
    themeSelect.appendChild(option);
  });
  themeSelect.value = getThemeById(activeThemeId).id;
}

function renderCodeThemeOptions() {
  const activeCodeThemeId = getInitialCodeThemeId();
  codeThemeSelect.innerHTML = '';
  CODE_THEMES.forEach((theme) => {
    const option = document.createElement('option');
    option.value = theme.id;
    option.textContent = theme.name;
    codeThemeSelect.appendChild(option);
  });
  codeThemeSelect.value = getCodeThemeById(activeCodeThemeId).id;
}

function renderSnippetList() {
  snippetList.innerHTML = CSS_SNIPPETS
    .map((item, idx) => `<button type="button" class="chip-btn" data-snippet-index="${idx}">${item.label}</button>`)
    .join('');
}

function createThemeCssEditor(initialDoc) {
  const state = EditorState.create({
    doc: initialDoc,
    extensions: [
      keymap.of([...defaultKeymap, ...completionKeymap]),
      css(),
      autocompletion({ activateOnTyping: true }),
      cssEditableCompartment.of(EditorView.editable.of(true)),
      EditorView.lineWrapping,
      EditorView.theme({
        '&': { height: '100%', minHeight: '280px' },
        '.cm-scroller': {
          overflow: 'auto',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace',
        },
        '.cm-content': { padding: '12px', fontSize: '13px', lineHeight: '1.5' },
        '.cm-focused': { outline: 'none' },
      }),
    ],
  });

  cssEditorView = new EditorView({
    state,
    parent: themeCssEditorHost,
  });
}

function getThemeCssValue() {
  return cssEditorView?.state.doc.toString() ?? '';
}

function setThemeCssValue(value) {
  if (!cssEditorView) return;
  const docLen = cssEditorView.state.doc.length;
  cssEditorView.dispatch({
    changes: { from: 0, to: docLen, insert: value },
  });
}

function setThemeCssEditable(editable) {
  if (!cssEditorView) return;
  cssEditorView.dispatch({
    effects: cssEditableCompartment.reconfigure(EditorView.editable.of(editable)),
  });
}

function insertAtCursor(text) {
  if (!cssEditorView) return;
  const { from, to } = cssEditorView.state.selection.main;
  cssEditorView.dispatch({
    changes: { from, to, insert: text },
    selection: { anchor: from + text.length },
  });
  cssEditorView.focus();
}

function renderThemeList() {
  const selectedId = managerSelectedThemeId || localStorage.getItem(STORAGE_KEYS.selectedTheme) || BUILTIN_THEMES[0].id;
  themeList.innerHTML = allThemes
    .map((theme) => {
      const activeClass = theme.id === selectedId ? 'active' : '';
      return `<button class="theme-item ${activeClass}" data-theme-id="${theme.id}" type="button">${theme.name}</button>`;
    })
    .join('');
}

function applyTheme(themeId) {
  const theme = getThemeById(themeId);
  themeStyleTag.textContent = theme.css;
  localStorage.setItem(STORAGE_KEYS.selectedTheme, theme.id);
  themeSelect.value = theme.id;
}

function renderPreview(markdownText) {
  preview.innerHTML = md.render(markdownText);
}

function saveMarkdown(markdownText) {
  localStorage.setItem(STORAGE_KEYS.markdown, markdownText);
}

function getInitialMarkdown() {
  return localStorage.getItem(STORAGE_KEYS.markdown) ?? DEFAULT_MD;
}

function getInitialThemeId() {
  return localStorage.getItem(STORAGE_KEYS.selectedTheme) ?? BUILTIN_THEMES[0].id;
}

function getInitialPreviewMode() {
  const mode = localStorage.getItem(STORAGE_KEYS.previewMode);
  return mode === 'mobile' ? 'mobile' : 'desktop';
}

function setPreviewMode(mode) {
  const nextMode = mode === 'desktop' ? 'desktop' : 'mobile';
  previewViewport.classList.remove('mobile', 'desktop');
  previewViewport.classList.add(nextMode);
  previewModeSelect.value = nextMode;
  localStorage.setItem(STORAGE_KEYS.previewMode, nextMode);
}

function openView(view) {
  currentView = view;
  const editorOn = view === 'editor';
  editorViewRoot.classList.toggle('hidden', !editorOn);
  themeManagerViewRoot.classList.toggle('hidden', editorOn);
  editorViewBtn.classList.toggle('active', editorOn);
  themeViewBtn.classList.toggle('active', !editorOn);
}

function toInlineStyles(sourceEl, targetEl) {
  if (!(sourceEl instanceof HTMLElement) || !(targetEl instanceof HTMLElement)) return;

  const computed = window.getComputedStyle(sourceEl);
  const styleText = INLINE_STYLE_PROPS
    .map((prop) => `${prop}:${computed.getPropertyValue(prop)}`)
    .join(';');
  targetEl.setAttribute('style', styleText);

  const sourceChildren = Array.from(sourceEl.children);
  const targetChildren = Array.from(targetEl.children);
  for (let i = 0; i < sourceChildren.length; i += 1) {
    toInlineStyles(sourceChildren[i], targetChildren[i]);
  }
}

function appendStyle(el, styleText) {
  const current = el.getAttribute('style') || '';
  el.setAttribute('style', `${current};${styleText}`);
}

function renderInlineLinksButton() {
  inlineLinksBtn.textContent = inlineLinksEnabled ? '追加文内链接：开' : '追加文内链接：关';
}

function normalizeCopyDom(rootEl) {
  appendStyle(rootEl, 'box-sizing:border-box;line-height:1.75;word-break:break-word;');

  rootEl.querySelectorAll('p').forEach((el) => {
    appendStyle(el, 'margin:0.55em 0;line-height:1.75;');
  });

  rootEl.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((el) => {
    appendStyle(el, 'margin:1.05em 0 0.45em;line-height:1.45;');
  });

  rootEl.querySelectorAll('blockquote').forEach((el) => {
    appendStyle(el, 'margin:0.7em 0;padding:0.7em 0.9em;max-width:100%;width:auto;box-sizing:border-box;');
  });

  rootEl.querySelectorAll('img').forEach((el) => {
    appendStyle(el, 'max-width:100%;height:auto;display:block;');
  });

  rootEl.querySelectorAll('pre').forEach((el) => {
    appendStyle(el, 'line-height:1.6;white-space:pre-wrap;word-break:break-word;');
  });

  rootEl.querySelectorAll('li').forEach((el) => {
    appendStyle(el, 'line-height:1.75;margin:0.25em 0;');
  });
}

function appendInlineLinks(rootEl) {
  const links = [];
  const indexByHref = new Map();

  rootEl.querySelectorAll('a[href]').forEach((a) => {
    const href = (a.getAttribute('href') || '').trim();
    if (!href || !/^https?:\/\//i.test(href)) return;

    let idx = indexByHref.get(href);
    if (!idx) {
      idx = links.length + 1;
      indexByHref.set(href, idx);
      links.push({ href, text: (a.textContent || '').trim() });
    }

    const marker = document.createElement('sup');
    marker.textContent = `[${idx}]`;
    appendStyle(marker, 'font-size:0.78em;line-height:1;vertical-align:super;');
    a.after(marker);
  });

  if (links.length === 0) return;

  const divider = document.createElement('hr');
  appendStyle(divider, 'margin:1.2em 0;border:0;border-top:1px solid #d9d9d9;');

  const title = document.createElement('p');
  title.textContent = '文内链接：';
  appendStyle(title, 'margin:0.3em 0 0.4em;font-weight:700;');

  const list = document.createElement('ol');
  appendStyle(list, 'margin:0;padding-left:1.2em;');

  links.forEach((item) => {
    const li = document.createElement('li');
    const showText = item.text && item.text !== item.href;
    li.textContent = showText ? `${item.text} - ${item.href}` : item.href;
    appendStyle(li, 'margin:0.22em 0;line-height:1.6;word-break:break-all;');
    list.appendChild(li);
  });

  rootEl.appendChild(divider);
  rootEl.appendChild(title);
  rootEl.appendChild(list);
}

function buildCopyHtml() {
  const cloned = preview.cloneNode(true);
  toInlineStyles(preview, cloned);
  normalizeCopyDom(cloned);
  if (inlineLinksEnabled) {
    appendInlineLinks(cloned);
  }
  const cleanedRootStyle = [
    'border:none',
    'border-radius:0',
    'background:transparent',
    'box-shadow:none',
    'padding:0',
    'margin:0',
    'width:unset',
    'max-width:none',
    'min-width:0',
    'min-height:0',
  ].join(';');
  cloned.setAttribute('style', `${cloned.getAttribute('style')};${cleanedRootStyle}`);
  cloned.removeAttribute('id');
  return cloned.outerHTML;
}

function selectPreviewContent() {
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(preview);
  selection.removeAllRanges();
  selection.addRange(range);
}

async function copyPreviewToClipboard() {
  const html = buildCopyHtml();
  const text = preview.innerText;

  if (window.ClipboardItem && navigator.clipboard?.write) {
    const item = new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([text], { type: 'text/plain' }),
    });
    await navigator.clipboard.write([item]);
    return;
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  throw new Error('Clipboard API not available');
}

function selectThemeInManager(themeId, mode = 'existing') {
  const theme = getThemeById(themeId);
  managerSelectedThemeId = theme.id;
  managerEditingMode = mode;
  themeNameInput.value = mode === 'new' ? '' : theme.name;
  setThemeCssValue(mode === 'new' ? NEW_THEME_TEMPLATE : theme.css);

  const editable = mode === 'new' || theme.custom;
  saveThemeBtn.textContent = mode === 'new' ? '创建主题' : '保存主题';
  deleteThemeBtn.disabled = !theme.custom || mode === 'new';
  themeNameInput.readOnly = false;
  setThemeCssEditable(editable);

  renderThemeList();
}

function createTheme(name, css) {
  const id = `custom-${Date.now()}`;
  const theme = { id, name, css, custom: true };
  customThemes = [...customThemes, theme].slice(-50);
  saveCustomThemes();
  refreshThemes();
  return theme;
}

function updateCustomTheme(themeId, payload) {
  customThemes = customThemes.map((theme) => (theme.id === themeId ? { ...theme, ...payload, custom: true } : theme));
  saveCustomThemes();
  refreshThemes();
}

function deleteCustomTheme(themeId) {
  customThemes = customThemes.filter((theme) => theme.id !== themeId);
  saveCustomThemes();
  refreshThemes();

  const currentTheme = localStorage.getItem(STORAGE_KEYS.selectedTheme);
  if (currentTheme === themeId) {
    applyTheme(BUILTIN_THEMES[0].id);
  }
}

refreshThemes();
renderCodeThemeOptions();
renderSnippetList();
applyTheme(getInitialThemeId());
setPreviewMode(getInitialPreviewMode());
openView('editor');
createThemeCssEditor(NEW_THEME_TEMPLATE);

let currentMarkdown = getInitialMarkdown();
const editorState = EditorState.create({
  doc: currentMarkdown,
  extensions: [
    keymap.of(defaultKeymap),
    markdown(),
    EditorView.lineWrapping,
    EditorView.theme({
      '&': { height: '100%' },
      '.cm-scroller': {
        overflow: 'auto',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace',
      },
      '.cm-content': { padding: '16px', fontSize: '14px' },
      '.cm-focused': { outline: 'none' },
    }),
    EditorView.updateListener.of((update) => {
      if (!update.docChanged) return;
      const value = update.state.doc.toString();
      currentMarkdown = value;
      saveMarkdown(value);
      renderPreview(value);
    }),
  ],
});

const editorView = new EditorView({
  state: editorState,
  parent: document.querySelector('#editor'),
});

renderPreview(currentMarkdown);
selectThemeInManager(localStorage.getItem(STORAGE_KEYS.selectedTheme) || BUILTIN_THEMES[0].id);
renderInlineLinksButton();
loadHighlightAssets(getInitialCodeThemeId(), () => {
  renderPreview(currentMarkdown);
});

editorViewBtn.addEventListener('click', () => openView('editor'));
themeViewBtn.addEventListener('click', () => {
  openView('themes');
  selectThemeInManager(managerSelectedThemeId || themeSelect.value);
});

themeSelect.addEventListener('change', () => {
  applyTheme(themeSelect.value);
  renderThemeList();
});

previewModeSelect.addEventListener('change', () => {
  setPreviewMode(previewModeSelect.value);
});

codeThemeSelect.addEventListener('change', () => {
  localStorage.setItem(STORAGE_KEYS.codeTheme, codeThemeSelect.value);
  loadHighlightAssets(codeThemeSelect.value, () => {
    renderPreview(currentMarkdown);
  });
});

inlineLinksBtn.addEventListener('click', () => {
  inlineLinksEnabled = !inlineLinksEnabled;
  localStorage.setItem(STORAGE_KEYS.inlineLinks, inlineLinksEnabled ? '1' : '0');
  renderInlineLinksButton();
});

snippetList.addEventListener('click', (event) => {
  const target = event.target.closest('.chip-btn');
  if (!(target instanceof HTMLElement)) return;
  const idx = Number(target.dataset.snippetIndex);
  if (!Number.isInteger(idx) || idx < 0 || idx >= CSS_SNIPPETS.length) return;
  const cssValue = getThemeCssValue();
  const prefix = cssValue && !cssValue.endsWith('\n') ? '\n' : '';
  insertAtCursor(`${prefix}${CSS_SNIPPETS[idx].code}`);
});

selectPreviewBtn.addEventListener('click', () => {
  selectPreviewContent();
  selectPreviewBtn.textContent = '已全选';
  window.setTimeout(() => {
    selectPreviewBtn.textContent = '全选预览';
  }, 1000);
});

themeList.addEventListener('click', (event) => {
  const target = event.target.closest('.theme-item');
  if (!(target instanceof HTMLElement)) return;
  const themeId = target.dataset.themeId;
  if (!themeId) return;
  selectThemeInManager(themeId);
});

newThemeBtn.addEventListener('click', () => {
  managerSelectedThemeId = null;
  managerEditingMode = 'new';
  themeNameInput.value = '';
  setThemeCssValue(NEW_THEME_TEMPLATE);
  setThemeCssEditable(true);
  saveThemeBtn.textContent = '创建主题';
  deleteThemeBtn.disabled = true;
  renderThemeList();
});

duplicateThemeBtn.addEventListener('click', () => {
  const sourceTheme = managerSelectedThemeId ? getThemeById(managerSelectedThemeId) : null;
  const nextName = sourceTheme ? `${sourceTheme.name} 副本` : '新主题';
  themeNameInput.value = nextName;
  if (!getThemeCssValue().trim()) {
    setThemeCssValue(sourceTheme?.css || NEW_THEME_TEMPLATE);
  }
  managerEditingMode = 'new';
  saveThemeBtn.textContent = '创建主题';
  deleteThemeBtn.disabled = true;
  setThemeCssEditable(true);
});

saveThemeBtn.addEventListener('click', () => {
  const name = themeNameInput.value.trim();
  const css = getThemeCssValue().trim();

  if (!name || !css) {
    window.alert('主题名称和 CSS 不能为空');
    return;
  }

  if (managerEditingMode === 'new' || !managerSelectedThemeId) {
    const created = createTheme(name, css);
    selectThemeInManager(created.id);
    applyTheme(created.id);
    return;
  }

  const theme = getThemeById(managerSelectedThemeId);
  if (!theme.custom) {
    const created = createTheme(name, css);
    selectThemeInManager(created.id);
    applyTheme(created.id);
    return;
  }

  updateCustomTheme(theme.id, { name, css });
  selectThemeInManager(theme.id);
  applyTheme(theme.id);
});

deleteThemeBtn.addEventListener('click', () => {
  if (!managerSelectedThemeId) return;
  const theme = getThemeById(managerSelectedThemeId);
  if (!theme.custom) return;

  if (!window.confirm(`确认删除主题「${theme.name}」吗？`)) return;
  deleteCustomTheme(theme.id);
  const fallbackThemeId = localStorage.getItem(STORAGE_KEYS.selectedTheme) || BUILTIN_THEMES[0].id;
  selectThemeInManager(fallbackThemeId);
});

applyThemeBtn.addEventListener('click', () => {
  if (!managerSelectedThemeId) return;
  applyTheme(managerSelectedThemeId);
  openView('editor');
});

copyBtn.addEventListener('click', async () => {
  copyBtn.disabled = true;
  copyBtn.textContent = '复制中...';
  try {
    await copyPreviewToClipboard();
    copyBtn.textContent = '复制成功';
  } catch (error) {
    console.error(error);
    copyBtn.textContent = '复制失败';
  } finally {
    window.setTimeout(() => {
      copyBtn.disabled = false;
      copyBtn.textContent = '复制到公众号';
    }, 1200);
  }
});
