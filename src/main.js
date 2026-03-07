import { EditorView, keymap } from '@codemirror/view';
import { Compartment, EditorState } from '@codemirror/state';
import { defaultKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { css } from '@codemirror/lang-css';
import { autocompletion, completionKeymap } from '@codemirror/autocomplete';
import MarkdownIt from 'markdown-it';
import defaultMarkdownRaw from './default.md?raw';
import themePreviewRaw from './theme-preview.md?raw';
import './styles.css';

const STORAGE_KEYS = {
  markdown: 'md2wechat.markdown',
  selectedTheme: 'md2wechat.selectedTheme',
  customThemes: 'md2wechat.customThemes',
  favoriteThemes: 'md2wechat.favoriteThemes',
  themePreviewVisible: 'md2wechat.themePreviewVisible',
  previewMode: 'md2wechat.previewMode',
  codeTheme: 'md2wechat.codeTheme',
  inlineLinks: 'md2wechat.inlineLinks',
};
const MOBILE_NOTICE_SESSION_KEY = 'md2wechat.mobileNoticeDismissed';

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

const DEFAULT_MD = defaultMarkdownRaw;
const THEME_PREVIEW_MD = themePreviewRaw;

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
  {
    id: 'yanqi-lake',
    name: '湖岸蓝调',
    css: `
.wx-article { color: #1f2a38; font-size: 16px; line-height: 1.82; word-break: break-word; }
.wx-article h1, .wx-article h2, .wx-article h3 { margin: 1.5em 0 0.75em; font-weight: 700; color: #2584b5; }
.wx-article h1 { font-size: 1.45em; border-bottom: 1px solid #2584b5; padding-bottom: 0.25em; }
.wx-article h2 { font-size: 1.2em; border-bottom: 4px solid #2584b5; padding-bottom: 0.1em; }
.wx-article h2::before { content: counter(h2) " "; counter-increment: h2; color: #9fcdd0; border-bottom: 4px solid #9fcdd0; margin-right: 0.2em; }
.wx-article { counter-reset: h2; }
.wx-article p { margin: 0.85em 0; }
.wx-article a { color: #2584b5; font-weight: 700; text-decoration: none; border-bottom: 1px solid #2584b5; }
.wx-article blockquote { margin: 1em 0; padding: 0.75em 1em; border-left: 4px solid #9fcdd0; background: #f2f8fb; color: #3e5d74; }
.wx-article code { background: #edf5fa; color: #255b7e; padding: 0.2em 0.45em; border-radius: 4px; }
.wx-article pre { background: #132836; color: #dceefa; padding: 0.95em 1.05em; border-radius: 10px; overflow: auto; }
.wx-article pre code { background: transparent; color: inherit; padding: 0; }
`,
  },
  {
    id: 'pine-forest',
    name: '青杉手札',
    css: `
.wx-article { color: #1d2f2a; font-size: 16px; line-height: 1.78; }
.wx-article h1, .wx-article h2, .wx-article h3 { color: #2f765f; margin: 1.3em 0 0.7em; }
.wx-article h2 { display: inline-block; padding: 0.2em 0.7em; border-radius: 999px; background: #e4f4ec; }
.wx-article p { margin: 0.85em 0; }
.wx-article a { color: #2c8b6b; text-decoration: none; border-bottom: 1px dashed #2c8b6b; }
.wx-article blockquote { margin: 1em 0; padding: 0.8em 1em; border-radius: 8px; background: #eff8f4; border: 1px solid #d3ecdf; color: #3f6559; }
.wx-article code { background: #e8f5ef; color: #2b6e58; padding: 0.2em 0.45em; border-radius: 4px; }
.wx-article pre { background: #163129; color: #d8f1e8; padding: 0.95em 1.05em; border-radius: 10px; overflow: auto; }
.wx-article pre code { background: transparent; color: inherit; padding: 0; }
`,
  },
  {
    id: 'aurora',
    name: '海盐晨雾',
    css: `
.wx-article { color: #17334a; font-size: 16px; line-height: 1.8; }
.wx-article h1, .wx-article h2, .wx-article h3 { color: #176d9c; margin: 1.35em 0 0.65em; }
.wx-article h2 { border-left: 0.35em solid #19b6b1; padding-left: 0.55em; background: linear-gradient(90deg, #e5f8f8 0, transparent 78%); }
.wx-article a { color: #1784ba; text-decoration: underline; text-decoration-color: #8fd6f7; }
.wx-article blockquote { margin: 1em 0; padding: 0.75em 1em; background: #eef9ff; border-left: 4px solid #69d7da; color: #2e566f; }
.wx-article code { background: #e6f5ff; color: #19608d; padding: 0.2em 0.45em; border-radius: 4px; }
.wx-article pre { background: #12263c; color: #d9edff; padding: 0.95em 1.05em; border-radius: 10px; overflow: auto; }
.wx-article pre code { background: transparent; color: inherit; padding: 0; }
`,
  },
  {
    id: 'night-city',
    name: '午夜电台',
    css: `
.wx-article { color: #ececff; font-size: 16px; line-height: 1.8; background: #1a1f3b; border-radius: 12px; padding: 20px; }
.wx-article h1, .wx-article h2, .wx-article h3 { color: #7de0ff; margin: 1.35em 0 0.65em; }
.wx-article h2 { border-bottom: 2px solid #50b5ff; padding-bottom: 0.2em; }
.wx-article a { color: #c1f5ff; border-bottom: 1px solid #7de0ff; text-decoration: none; }
.wx-article blockquote { margin: 1em 0; padding: 0.8em 1em; border-left: 4px solid #67d6ff; background: rgba(84, 162, 255, 0.15); color: #cfeaff; }
.wx-article code { background: rgba(125, 224, 255, 0.15); color: #bdf4ff; padding: 0.2em 0.45em; border-radius: 4px; }
.wx-article pre { background: #101633; color: #dfe8ff; padding: 0.95em 1.05em; border-radius: 10px; overflow: auto; }
.wx-article pre code { background: transparent; color: inherit; padding: 0; }
`,
  },
  {
    id: 'amber-manifesto',
    name: '琥珀宣言',
    css: `
.wx-article { color: #2f241d; font-size: 16px; line-height: 1.9; background: linear-gradient(180deg, #fffdf7 0%, #fff8ee 100%); border: 1px solid #f0e0c8; border-radius: 18px; padding: 26px 22px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.75); }
.wx-article h1, .wx-article h2, .wx-article h3, .wx-article h4 { color: #7b401f; font-weight: 800; letter-spacing: 0.02em; margin: 1.45em 0 0.7em; line-height: 1.35; }
.wx-article h1 { font-size: 1.75em; padding-bottom: 0.4em; border-bottom: 1px solid #d6ae75; }
.wx-article h2 { font-size: 1.32em; display: inline-block; padding: 0.18em 0.7em; border-radius: 999px; background: linear-gradient(90deg, #8b4d24 0%, #b56a2f 100%); color: #fff8ef; }
.wx-article h3 { font-size: 1.12em; padding-left: 0.7em; border-left: 4px solid #d08a41; }
.wx-article p { margin: 0.95em 0; text-align: justify; }
.wx-article strong { color: #8f4216; }
.wx-article hr { border: 0; border-top: 1px dashed #dcb58a; margin: 1.8em 0; }
.wx-article a { color: #9d5122; text-decoration: none; border-bottom: 1px solid #cf8f5a; }
.wx-article ul, .wx-article ol { margin: 0.9em 0; padding-left: 1.45em; }
.wx-article li { margin: 0.38em 0; }
.wx-article ul li::marker, .wx-article ol li::marker { color: #c07334; font-weight: 700; }
.wx-article blockquote { margin: 1.2em 0; padding: 1em 1.1em; background: #fff3e4; border: 1px solid #f2d2ad; border-left: 5px solid #d9823b; border-radius: 14px; color: #6a4528; box-shadow: 0 10px 24px rgba(177, 114, 55, 0.08); }
.wx-article code { font-family: Menlo, Monaco, Consolas, monospace; background: #fdebd9; color: #8a4214; padding: 0.2em 0.45em; border-radius: 6px; }
.wx-article pre { background: #2f231d; color: #ffe9d6; padding: 1em 1.1em; border-radius: 14px; overflow: auto; box-shadow: 0 16px 32px rgba(31, 18, 12, 0.18); }
.wx-article pre code { background: transparent; color: inherit; padding: 0; }
.wx-article table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 1.2em 0; overflow: hidden; border: 1px solid #ecd8be; border-radius: 14px; }
.wx-article th { background: #faecda; color: #74421f; font-weight: 700; }
.wx-article th, .wx-article td { padding: 0.7em 0.8em; border-bottom: 1px solid #f1e4d1; }
.wx-article tr:last-child td { border-bottom: 0; }
`,
  },
  {
    id: 'obsidian-ledger',
    name: '黑曜账簿',
    css: `
.wx-article { color: #d8deea; font-size: 16px; line-height: 1.85; background: linear-gradient(180deg, #141922 0%, #0f131a 100%); border: 1px solid #283241; border-radius: 18px; padding: 24px 22px; box-shadow: 0 22px 40px rgba(6, 10, 17, 0.32); }
.wx-article h1, .wx-article h2, .wx-article h3, .wx-article h4 { color: #f5f7fb; margin: 1.4em 0 0.65em; line-height: 1.35; font-weight: 800; }
.wx-article h1 { font-size: 1.74em; letter-spacing: 0.03em; }
.wx-article h2 { font-size: 1.26em; position: relative; padding-left: 0.95em; }
.wx-article h2::before { content: ''; position: absolute; left: 0; top: 0.2em; width: 0.32em; height: 1.1em; border-radius: 999px; background: linear-gradient(180deg, #67c7ff 0%, #3d84ff 100%); box-shadow: 0 0 16px rgba(88, 165, 255, 0.45); }
.wx-article h3 { font-size: 1.08em; color: #9dcfff; }
.wx-article p { margin: 0.9em 0; }
.wx-article strong { color: #ffffff; }
.wx-article hr { border: 0; border-top: 1px solid #2b3543; margin: 1.8em 0; }
.wx-article a { color: #7dd8ff; text-decoration: none; border-bottom: 1px solid #467fe2; }
.wx-article ul, .wx-article ol { margin: 0.9em 0; padding-left: 1.45em; }
.wx-article li::marker { color: #74c5ff; }
.wx-article blockquote { margin: 1.2em 0; padding: 0.95em 1.05em; background: rgba(103, 199, 255, 0.08); border: 1px solid rgba(103, 199, 255, 0.18); border-left: 5px solid #62bfff; border-radius: 14px; color: #bfdbf8; }
.wx-article code { font-family: Menlo, Monaco, Consolas, monospace; background: rgba(116, 197, 255, 0.12); color: #a8e3ff; padding: 0.2em 0.45em; border-radius: 6px; }
.wx-article pre { background: #0a0e14; color: #dbedff; padding: 1em 1.1em; border-radius: 14px; overflow: auto; border: 1px solid #1f2b3a; }
.wx-article pre code { background: transparent; color: inherit; padding: 0; }
.wx-article table { width: 100%; border-collapse: collapse; margin: 1.2em 0; border: 1px solid #283241; overflow: hidden; border-radius: 12px; }
.wx-article th { background: #1a2230; color: #f3f7ff; }
.wx-article th, .wx-article td { padding: 0.7em 0.8em; border-bottom: 1px solid #232e3c; }
`,
  },
  {
    id: 'atelier-grid',
    name: '工坊栅格',
    css: `
.wx-article { color: #26313d; font-size: 16px; line-height: 1.82; background-color: #fcfdff; background-image: linear-gradient(rgba(105, 141, 182, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(105, 141, 182, 0.08) 1px, transparent 1px); background-size: 24px 24px; border: 1px solid #dbe5f0; border-radius: 18px; padding: 24px 22px; }
.wx-article h1, .wx-article h2, .wx-article h3, .wx-article h4 { color: #1f4f7a; margin: 1.4em 0 0.65em; font-weight: 800; line-height: 1.35; }
.wx-article h1 { font-size: 1.72em; text-transform: uppercase; letter-spacing: 0.04em; }
.wx-article h2 { font-size: 1.24em; display: inline-block; padding: 0.15em 0.55em; border: 2px solid #2a6aa1; background: rgba(255,255,255,0.78); box-shadow: 6px 6px 0 #d9e7f5; }
.wx-article h3 { font-size: 1.1em; padding-bottom: 0.24em; border-bottom: 2px dashed #89b0d7; }
.wx-article p { margin: 0.92em 0; }
.wx-article strong { color: #154973; }
.wx-article a { color: #0f6eb7; text-decoration: none; background-image: linear-gradient(transparent calc(100% - 2px), #99c3ea 0); background-repeat: no-repeat; }
.wx-article ul, .wx-article ol { margin: 0.9em 0; padding-left: 1.5em; }
.wx-article li::marker { color: #2f78b9; font-weight: 700; }
.wx-article blockquote { margin: 1.2em 0; padding: 1em 1.05em; background: rgba(255,255,255,0.82); border: 2px dashed #8db5da; border-radius: 14px; color: #41566d; box-shadow: 8px 8px 0 rgba(141, 181, 218, 0.22); }
.wx-article code { font-family: Menlo, Monaco, Consolas, monospace; background: #e8f2fb; color: #17496f; padding: 0.2em 0.45em; border-radius: 5px; }
.wx-article pre { background: #142331; color: #d8ebff; padding: 1em 1.1em; border-radius: 14px; overflow: auto; border: 2px solid #2b4b67; box-shadow: 10px 10px 0 rgba(33, 71, 109, 0.18); }
.wx-article pre code { background: transparent; color: inherit; padding: 0; }
.wx-article table { width: 100%; border-collapse: collapse; margin: 1.2em 0; background: rgba(255,255,255,0.88); }
.wx-article th, .wx-article td { padding: 0.72em 0.8em; border: 1px solid #cfe0f0; }
.wx-article th { background: #e9f2fb; color: #1f537e; }
`,
  },
  {
    id: 'crimson-column',
    name: '绯红专栏',
    css: `
.wx-article { color: #352626; font-size: 16px; line-height: 1.88; background: #fffdfb; border-left: 8px solid #7d2027; padding: 20px 22px 20px 24px; }
.wx-article h1, .wx-article h2, .wx-article h3, .wx-article h4 { color: #6f1e26; margin: 1.4em 0 0.7em; line-height: 1.35; font-weight: 800; }
.wx-article h1 { font-size: 1.76em; letter-spacing: 0.01em; }
.wx-article h2 { font-size: 1.26em; position: relative; padding-left: 0.9em; }
.wx-article h2::before { content: ''; position: absolute; left: 0; top: 0.18em; bottom: 0.18em; width: 0.28em; background: #b63544; border-radius: 999px; }
.wx-article h3 { font-size: 1.08em; color: #9c2f3a; }
.wx-article p { margin: 0.95em 0; }
.wx-article strong { color: #831f2a; }
.wx-article a { color: #a92634; text-decoration: none; border-bottom: 1px solid #d0717a; }
.wx-article ul, .wx-article ol { margin: 0.9em 0; padding-left: 1.45em; }
.wx-article li::marker { color: #b43141; font-weight: 700; }
.wx-article blockquote { margin: 1.2em 0; padding: 0.95em 1.05em; background: #fff3f4; border: 1px solid #f2ced2; border-left: 5px solid #b63544; color: #6c3940; border-radius: 12px; }
.wx-article code { font-family: Menlo, Monaco, Consolas, monospace; background: #fde8ea; color: #8f2430; padding: 0.2em 0.45em; border-radius: 5px; }
.wx-article pre { background: #231619; color: #ffe5e8; padding: 1em 1.1em; border-radius: 14px; overflow: auto; }
.wx-article pre code { background: transparent; color: inherit; padding: 0; }
.wx-article table { width: 100%; border-collapse: collapse; margin: 1.2em 0; border-top: 2px solid #8e2834; border-bottom: 2px solid #8e2834; }
.wx-article th, .wx-article td { padding: 0.72em 0.8em; border-bottom: 1px solid #efd5d8; }
.wx-article th { color: #7b222c; background: #fff1f2; }
`,
  },
  {
    id: 'boardroom-slate',
    name: '董事会灰阶',
    css: `
.wx-article { color: #24303b; font-size: 16px; line-height: 1.88; background: #f8fafc; border: 1px solid #d9e1ea; border-radius: 16px; padding: 24px 22px; }
.wx-article h1, .wx-article h2, .wx-article h3, .wx-article h4 { color: #16212b; margin: 1.45em 0 0.7em; line-height: 1.35; font-weight: 800; }
.wx-article h1 { font-size: 1.78em; letter-spacing: 0.02em; }
.wx-article h2 { font-size: 1.24em; display: flex; align-items: center; gap: 0.6em; }
.wx-article h2::before { content: ''; display: inline-block; width: 1.8em; height: 0.22em; border-radius: 999px; background: linear-gradient(90deg, #2b4a67 0%, #7d95aa 100%); }
.wx-article h3 { font-size: 1.08em; color: #34516d; }
.wx-article p { margin: 0.92em 0; text-align: justify; }
.wx-article strong { color: #142537; }
.wx-article hr { border: 0; border-top: 1px solid #d3dce6; margin: 1.8em 0; }
.wx-article a { color: #2e5b86; text-decoration: none; border-bottom: 1px solid #90a8be; }
.wx-article ul, .wx-article ol { margin: 0.9em 0; padding-left: 1.45em; }
.wx-article li::marker { color: #436685; font-weight: 700; }
.wx-article blockquote { margin: 1.2em 0; padding: 1em 1.1em; background: #eef3f7; border-left: 5px solid #607d99; border-radius: 10px; color: #435769; }
.wx-article code { font-family: Menlo, Monaco, Consolas, monospace; background: #e9eef3; color: #244260; padding: 0.2em 0.45em; border-radius: 5px; }
.wx-article pre { background: #1e2933; color: #e6edf4; padding: 1em 1.1em; border-radius: 12px; overflow: auto; }
.wx-article pre code { background: transparent; color: inherit; padding: 0; }
.wx-article table { width: 100%; border-collapse: collapse; margin: 1.2em 0; border: 1px solid #d7e0e8; }
.wx-article th, .wx-article td { padding: 0.72em 0.8em; border-bottom: 1px solid #e2e8ef; }
.wx-article th { background: #edf2f6; color: #27425c; }
`,
  },
  {
    id: 'launch-white',
    name: '发布会白域',
    css: `
.wx-article { color: #17212b; font-size: 16px; line-height: 1.86; background: #ffffff; padding: 8px 2px; }
.wx-article h1, .wx-article h2, .wx-article h3, .wx-article h4 { margin: 1.5em 0 0.72em; line-height: 1.28; font-weight: 800; letter-spacing: -0.01em; }
.wx-article h1 { font-size: 2em; color: #111111; }
.wx-article h2 { font-size: 1.34em; color: #111111; }
.wx-article h3 { font-size: 1.08em; color: #4d5c6d; text-transform: uppercase; letter-spacing: 0.08em; }
.wx-article p { margin: 1em 0; color: #2f3b46; }
.wx-article strong { color: #000000; }
.wx-article hr { border: 0; border-top: 1px solid #e8edf2; margin: 2em 0; }
.wx-article a { color: #0b74ff; text-decoration: none; }
.wx-article ul, .wx-article ol { margin: 0.95em 0; padding-left: 1.5em; }
.wx-article li { margin: 0.38em 0; }
.wx-article li::marker { color: #0b74ff; }
.wx-article blockquote { margin: 1.3em 0; padding: 1.05em 1.1em; background: linear-gradient(180deg, #f6fafe 0%, #eef5fb 100%); border-radius: 16px; color: #37506a; border: 1px solid #dfeaf5; }
.wx-article code { font-family: Menlo, Monaco, Consolas, monospace; background: #f1f5f9; color: #11385f; padding: 0.2em 0.45em; border-radius: 6px; }
.wx-article pre { background: #0f1720; color: #edf4fb; padding: 1em 1.1em; border-radius: 16px; overflow: auto; }
.wx-article pre code { background: transparent; color: inherit; padding: 0; }
.wx-article table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 1.2em 0; overflow: hidden; border-radius: 16px; box-shadow: 0 8px 24px rgba(15, 23, 32, 0.08); }
.wx-article th, .wx-article td { padding: 0.78em 0.82em; border-bottom: 1px solid #edf2f7; background: #ffffff; }
.wx-article th { color: #122131; background: #f8fbfd; font-weight: 700; }
.wx-article tr:last-child td { border-bottom: 0; }
`,
  },
  {
    id: 'archive-chronicle',
    name: '档案纪事',
    css: `
.wx-article { color: #332c22; font-size: 16px; line-height: 1.92; background: #fbf7ef; border: 1px solid #e4dbc9; padding: 24px 22px; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.4); }
.wx-article h1, .wx-article h2, .wx-article h3, .wx-article h4 { color: #54412e; margin: 1.5em 0 0.72em; line-height: 1.35; font-family: Georgia, "Times New Roman", serif; }
.wx-article h1 { font-size: 1.86em; text-align: center; letter-spacing: 0.04em; }
.wx-article h2 { font-size: 1.26em; text-align: center; position: relative; }
.wx-article h2::before, .wx-article h2::after { content: ''; display: inline-block; width: 2.2em; height: 1px; background: #b9a58c; vertical-align: middle; margin: 0 0.65em; }
.wx-article h3 { font-size: 1.08em; color: #7a5a3a; }
.wx-article p { margin: 0.98em 0; text-align: justify; }
.wx-article strong { color: #5f4226; }
.wx-article a { color: #8b5b2d; text-decoration: none; border-bottom: 1px dotted #b48a61; }
.wx-article ul, .wx-article ol { margin: 0.95em 0; padding-left: 1.5em; }
.wx-article li::marker { color: #8d6a42; }
.wx-article blockquote { margin: 1.2em 0; padding: 1em 1.1em; background: #f5ecde; border-left: 4px solid #b08a63; color: #65503c; }
.wx-article code { font-family: Menlo, Monaco, Consolas, monospace; background: #efe4d3; color: #6a4e32; padding: 0.2em 0.45em; border-radius: 4px; }
.wx-article pre { background: #2b231b; color: #f7ebdb; padding: 1em 1.1em; border-radius: 10px; overflow: auto; }
.wx-article pre code { background: transparent; color: inherit; padding: 0; }
.wx-article table { width: 100%; border-collapse: collapse; margin: 1.2em 0; }
.wx-article th, .wx-article td { padding: 0.72em 0.8em; border: 1px solid #decfb8; }
.wx-article th { background: #efe5d5; color: #5a4430; }
`,
  },
  {
    id: 'signal-lab',
    name: '信号实验室',
    css: `
.wx-article { color: #1d2d38; font-size: 16px; line-height: 1.84; background: linear-gradient(180deg, #f7fbfd 0%, #eef6fa 100%); border: 1px solid #d8e7ef; border-radius: 18px; padding: 24px 22px; }
.wx-article h1, .wx-article h2, .wx-article h3, .wx-article h4 { color: #0f516d; margin: 1.45em 0 0.68em; line-height: 1.34; font-weight: 800; }
.wx-article h1 { font-size: 1.78em; }
.wx-article h2 { font-size: 1.24em; padding: 0.35em 0.7em; border-radius: 10px; background: linear-gradient(90deg, #0e5a76 0%, #1488a8 100%); color: #f5fdff; box-shadow: 0 10px 22px rgba(20, 136, 168, 0.18); }
.wx-article h3 { font-size: 1.08em; color: #217191; }
.wx-article p { margin: 0.92em 0; }
.wx-article strong { color: #0f5874; }
.wx-article a { color: #13789c; text-decoration: none; border-bottom: 1px solid #87c6d9; }
.wx-article ul, .wx-article ol { margin: 0.92em 0; padding-left: 1.45em; }
.wx-article li::marker { color: #1492b5; font-weight: 700; }
.wx-article blockquote { margin: 1.2em 0; padding: 1em 1.1em; background: rgba(20, 136, 168, 0.08); border: 1px solid rgba(20, 136, 168, 0.16); border-radius: 14px; color: #3e6072; }
.wx-article code { font-family: Menlo, Monaco, Consolas, monospace; background: #def2f7; color: #0b607d; padding: 0.2em 0.45em; border-radius: 5px; }
.wx-article pre { background: #0f1f28; color: #dbf6ff; padding: 1em 1.1em; border-radius: 14px; overflow: auto; border: 1px solid #183543; }
.wx-article pre code { background: transparent; color: inherit; padding: 0; }
.wx-article table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 1.2em 0; overflow: hidden; border-radius: 14px; border: 1px solid #d4e6ee; }
.wx-article th, .wx-article td { padding: 0.72em 0.8em; border-bottom: 1px solid #e2eef3; background: rgba(255,255,255,0.72); }
.wx-article th { background: #e8f5f9; color: #145c78; }
.wx-article tr:last-child td { border-bottom: 0; }
`,
  },
  {
    id: 'cover-story',
    name: '封面故事',
    css: `
.wx-article { color: #2f2a25; font-size: 16px; line-height: 1.92; background: linear-gradient(180deg, #fffdfa 0%, #f9f2e8 100%); border: 1px solid #eadcc6; padding: 28px 24px; }
.wx-article h1, .wx-article h2, .wx-article h3, .wx-article h4 { margin: 1.45em 0 0.72em; line-height: 1.28; font-weight: 900; }
.wx-article h1 { font-size: 2.02em; color: #16120d; text-transform: uppercase; letter-spacing: 0.06em; text-align: center; }
.wx-article h2 { font-size: 1.34em; color: #8f3f1f; text-align: center; letter-spacing: 0.08em; position: relative; padding-bottom: 0.45em; }
.wx-article h2::after { content: ''; position: absolute; left: 50%; bottom: 0; width: 4.2em; height: 3px; background: linear-gradient(90deg, #ce7a46 0%, #8f3f1f 100%); transform: translateX(-50%); }
.wx-article h3 { font-size: 1.08em; color: #56402d; text-transform: uppercase; letter-spacing: 0.1em; }
.wx-article p { margin: 0.98em 0; text-align: justify; }
.wx-article strong { color: #8a3517; }
.wx-article a { color: #a74c24; text-decoration: none; border-bottom: 1px solid #d79870; }
.wx-article ul, .wx-article ol { margin: 0.95em 0; padding-left: 1.5em; }
.wx-article li::marker { color: #b45d2f; font-weight: 700; }
.wx-article blockquote { margin: 1.25em 0; padding: 1.05em 1.1em; background: #fff6ec; border: 1px solid #f0d8bb; border-radius: 16px; color: #6e5641; box-shadow: 0 14px 28px rgba(191, 134, 85, 0.1); }
.wx-article code { font-family: Menlo, Monaco, Consolas, monospace; background: #fce9d8; color: #8a421a; padding: 0.2em 0.45em; border-radius: 6px; }
.wx-article pre { background: #261913; color: #ffe8db; padding: 1em 1.1em; border-radius: 16px; overflow: auto; }
.wx-article pre code { background: transparent; color: inherit; padding: 0; }
.wx-article table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 1.2em 0; border-radius: 16px; overflow: hidden; border: 1px solid #efdfca; }
.wx-article th, .wx-article td { padding: 0.76em 0.82em; border-bottom: 1px solid #f3e7d7; }
.wx-article th { background: #fbf0e1; color: #734124; }
.wx-article tr:last-child td { border-bottom: 0; }
`,
  },
  {
    id: 'black-gold-note',
    name: '黑金备忘',
    css: `
.wx-article { color: #e7dcc5; font-size: 16px; line-height: 1.88; background: linear-gradient(180deg, #171411 0%, #0f0c09 100%); border: 1px solid #473522; border-radius: 18px; padding: 26px 22px; box-shadow: 0 24px 48px rgba(0, 0, 0, 0.32); }
.wx-article h1, .wx-article h2, .wx-article h3, .wx-article h4 { margin: 1.45em 0 0.7em; line-height: 1.32; font-weight: 800; color: #f8e7ba; }
.wx-article h1 { font-size: 1.84em; letter-spacing: 0.03em; }
.wx-article h2 { font-size: 1.28em; display: inline-block; padding: 0.18em 0.7em; border: 1px solid #8f6a37; border-radius: 999px; background: linear-gradient(90deg, rgba(180,133,63,0.18) 0%, rgba(255,232,181,0.06) 100%); }
.wx-article h3 { font-size: 1.08em; color: #d8b574; }
.wx-article p { margin: 0.94em 0; }
.wx-article strong { color: #ffe8a6; }
.wx-article a { color: #ffd98a; text-decoration: none; border-bottom: 1px solid #9f7a3d; }
.wx-article ul, .wx-article ol { margin: 0.92em 0; padding-left: 1.45em; }
.wx-article li::marker { color: #cfa458; font-weight: 700; }
.wx-article blockquote { margin: 1.2em 0; padding: 1em 1.08em; background: rgba(191, 145, 72, 0.08); border: 1px solid rgba(207, 164, 88, 0.2); border-left: 5px solid #b88a45; border-radius: 14px; color: #d6c2a0; }
.wx-article code { font-family: Menlo, Monaco, Consolas, monospace; background: rgba(233, 193, 112, 0.12); color: #ffe0a0; padding: 0.2em 0.45em; border-radius: 6px; }
.wx-article pre { background: #0a0907; color: #fbe8be; padding: 1em 1.1em; border-radius: 14px; overflow: auto; border: 1px solid #2d2217; }
.wx-article pre code { background: transparent; color: inherit; padding: 0; }
.wx-article table { width: 100%; border-collapse: collapse; margin: 1.2em 0; border: 1px solid #41301d; }
.wx-article th, .wx-article td { padding: 0.74em 0.8em; border-bottom: 1px solid #302416; }
.wx-article th { background: #1c1712; color: #f6dfac; }
`,
  },
  {
    id: 'poster-bloom',
    name: '海报花窗',
    css: `
.wx-article { color: #34283d; font-size: 16px; line-height: 1.88; background: radial-gradient(circle at top left, #fff3db 0%, transparent 32%), radial-gradient(circle at bottom right, #ffd8df 0%, transparent 28%), linear-gradient(180deg, #fff8fa 0%, #f8f3ff 100%); border: 1px solid #eddff1; border-radius: 22px; padding: 26px 22px; }
.wx-article h1, .wx-article h2, .wx-article h3, .wx-article h4 { margin: 1.4em 0 0.7em; line-height: 1.3; font-weight: 900; }
.wx-article h1 { font-size: 1.92em; color: #5d2959; }
.wx-article h2 { font-size: 1.3em; color: #87385c; display: inline-block; padding: 0.18em 0.62em; border-radius: 12px; background: rgba(255,255,255,0.62); box-shadow: 0 8px 18px rgba(184, 110, 135, 0.14); }
.wx-article h3 { font-size: 1.08em; color: #96644f; }
.wx-article p { margin: 0.96em 0; }
.wx-article strong { color: #7b2e52; }
.wx-article a { color: #af4a6f; text-decoration: none; border-bottom: 1px solid #dd9bb0; }
.wx-article ul, .wx-article ol { margin: 0.92em 0; padding-left: 1.45em; }
.wx-article li::marker { color: #c36487; font-weight: 700; }
.wx-article blockquote { margin: 1.2em 0; padding: 1.02em 1.08em; background: rgba(255,255,255,0.62); border: 1px solid #f0d7df; border-radius: 16px; color: #6c4f66; }
.wx-article code { font-family: Menlo, Monaco, Consolas, monospace; background: #f9e6ee; color: #7c3558; padding: 0.2em 0.45em; border-radius: 6px; }
.wx-article pre { background: #2b1f35; color: #f6e9ff; padding: 1em 1.1em; border-radius: 16px; overflow: auto; }
.wx-article pre code { background: transparent; color: inherit; padding: 0; }
.wx-article table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 1.2em 0; overflow: hidden; border-radius: 16px; border: 1px solid #eedde6; }
.wx-article th, .wx-article td { padding: 0.74em 0.8em; border-bottom: 1px solid #f4e8ed; }
.wx-article th { background: rgba(255,255,255,0.8); color: #7b3658; }
.wx-article tr:last-child td { border-bottom: 0; }
`,
  },
  {
    id: 'intel-brief',
    name: '情报简报',
    css: `
.wx-article { color: #1f2f39; font-size: 16px; line-height: 1.84; background: linear-gradient(180deg, #f6fafb 0%, #eef4f7 100%); border: 1px solid #d6e1e6; padding: 24px 22px; }
.wx-article h1, .wx-article h2, .wx-article h3, .wx-article h4 { margin: 1.42em 0 0.68em; line-height: 1.32; font-weight: 800; letter-spacing: 0.01em; }
.wx-article h1 { font-size: 1.8em; color: #15232b; }
.wx-article h2 { font-size: 1.22em; color: #234757; background: linear-gradient(90deg, #dcebf2 0%, transparent 82%); padding: 0.2em 0.45em; border-left: 5px solid #3e7b95; }
.wx-article h3 { font-size: 1.06em; color: #3c6a7d; text-transform: uppercase; letter-spacing: 0.08em; }
.wx-article p { margin: 0.92em 0; }
.wx-article strong { color: #163847; }
.wx-article hr { border: 0; border-top: 1px dashed #bfd2db; margin: 1.8em 0; }
.wx-article a { color: #225d77; text-decoration: none; border-bottom: 1px solid #8bb6c8; }
.wx-article ul, .wx-article ol { margin: 0.92em 0; padding-left: 1.45em; }
.wx-article li::marker { color: #3c7d97; font-weight: 700; }
.wx-article blockquote { margin: 1.2em 0; padding: 0.98em 1.06em; background: #edf4f7; border-left: 4px solid #5b8ca2; color: #526977; }
.wx-article code { font-family: Menlo, Monaco, Consolas, monospace; background: #e4eef2; color: #19475c; padding: 0.2em 0.45em; border-radius: 5px; }
.wx-article pre { background: #121c22; color: #d9ecf4; padding: 1em 1.1em; border-radius: 12px; overflow: auto; }
.wx-article pre code { background: transparent; color: inherit; padding: 0; }
.wx-article table { width: 100%; border-collapse: collapse; margin: 1.2em 0; }
.wx-article th, .wx-article td { padding: 0.72em 0.8em; border: 1px solid #d6e1e6; }
.wx-article th { background: #eaf1f4; color: #2b5262; }
`,
  },
  {
    id: 'viral-longform',
    name: '爆文长卷',
    css: `
.wx-article { color: #2a2a2a; font-size: 16px; line-height: 1.95; background: #fffefc; border: 1px solid #f0e7dd; border-radius: 18px; padding: 26px 22px; box-shadow: 0 18px 40px rgba(73, 49, 28, 0.06); }
.wx-article h1, .wx-article h2, .wx-article h3, .wx-article h4 { margin: 1.5em 0 0.75em; line-height: 1.34; font-weight: 900; }
.wx-article h1 { font-size: 1.88em; color: #1b1b1b; }
.wx-article h2 { font-size: 1.28em; color: #9c3f16; background: linear-gradient(90deg, #ffe2d2 0%, transparent 78%); padding: 0.18em 0.42em; border-left: 5px solid #d9602a; }
.wx-article h3 { font-size: 1.08em; color: #c35324; }
.wx-article p { margin: 1em 0; text-align: justify; }
.wx-article strong { color: #b13f16; }
.wx-article hr { border: 0; border-top: 1px dashed #e7c3b2; margin: 1.9em 0; }
.wx-article a { color: #ca4d20; text-decoration: none; border-bottom: 1px solid #e08a65; }
.wx-article ul, .wx-article ol { margin: 0.95em 0; padding-left: 1.5em; }
.wx-article li { margin: 0.4em 0; }
.wx-article li::marker { color: #d9602a; font-weight: 700; }
.wx-article blockquote { margin: 1.25em 0; padding: 1.05em 1.1em; background: #fff5ef; border-left: 5px solid #eb7b49; border-radius: 14px; color: #704834; }
.wx-article code { font-family: Menlo, Monaco, Consolas, monospace; background: #fee8dd; color: #9b3815; padding: 0.2em 0.45em; border-radius: 6px; }
.wx-article pre { background: #251815; color: #ffebe3; padding: 1em 1.1em; border-radius: 14px; overflow: auto; }
.wx-article pre code { background: transparent; color: inherit; padding: 0; }
.wx-article table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 1.2em 0; border: 1px solid #f2ddd1; border-radius: 14px; overflow: hidden; }
.wx-article th, .wx-article td { padding: 0.76em 0.82em; border-bottom: 1px solid #f7e8df; }
.wx-article th { background: #fff1e8; color: #9b3e18; }
.wx-article tr:last-child td { border-bottom: 0; }
`,
  },
  {
    id: 'talent-deck',
    name: '人才卡册',
    css: `
.wx-article { color: #1d2d3f; font-size: 16px; line-height: 1.86; background: linear-gradient(180deg, #f7fbff 0%, #f1f7fd 100%); border: 1px solid #dbe7f3; border-radius: 18px; padding: 24px 22px; }
.wx-article h1, .wx-article h2, .wx-article h3, .wx-article h4 { margin: 1.45em 0 0.7em; line-height: 1.32; font-weight: 800; }
.wx-article h1 { font-size: 1.8em; color: #122334; }
.wx-article h2 { font-size: 1.24em; color: #154a7a; display: inline-block; padding: 0.2em 0.7em; border-radius: 999px; background: #deefff; }
.wx-article h3 { font-size: 1.08em; color: #2f6b98; }
.wx-article p { margin: 0.94em 0; }
.wx-article strong { color: #0f4c7a; }
.wx-article a { color: #0f73c9; text-decoration: none; border-bottom: 1px solid #94c5ee; }
.wx-article ul, .wx-article ol { margin: 0.92em 0; padding-left: 1.45em; }
.wx-article li::marker { color: #1a81d8; font-weight: 700; }
.wx-article blockquote { margin: 1.2em 0; padding: 1em 1.08em; background: #edf6ff; border: 1px solid #d5eafc; border-left: 5px solid #2790eb; border-radius: 14px; color: #46637d; }
.wx-article code { font-family: Menlo, Monaco, Consolas, monospace; background: #e6f2fd; color: #13517e; padding: 0.2em 0.45em; border-radius: 6px; }
.wx-article pre { background: #132231; color: #e4f2ff; padding: 1em 1.1em; border-radius: 14px; overflow: auto; }
.wx-article pre code { background: transparent; color: inherit; padding: 0; }
.wx-article table { width: 100%; border-collapse: collapse; margin: 1.2em 0; border: 1px solid #d7e7f7; }
.wx-article th, .wx-article td { padding: 0.74em 0.8em; border-bottom: 1px solid #e6eff8; }
.wx-article th { background: #eef6ff; color: #17496f; }
`,
  },
  {
    id: 'weekly-merge',
    name: '周报合流',
    css: `
.wx-article { color: #202a34; font-size: 16px; line-height: 1.82; background-color: #fbfdff; background-image: linear-gradient(rgba(123, 150, 174, 0.08) 1px, transparent 1px); background-size: 100% 28px; border: 1px solid #dbe4ed; border-radius: 16px; padding: 24px 22px; }
.wx-article h1, .wx-article h2, .wx-article h3, .wx-article h4 { margin: 1.4em 0 0.68em; line-height: 1.32; font-weight: 800; }
.wx-article h1 { font-size: 1.78em; color: #15232e; }
.wx-article h2 { font-size: 1.22em; color: #255a86; padding-left: 0.85em; position: relative; }
.wx-article h2::before { content: '#'; position: absolute; left: 0; top: 0; color: #69a2d3; font-weight: 900; }
.wx-article h3 { font-size: 1.06em; color: #4878a3; }
.wx-article p { margin: 0.9em 0; }
.wx-article strong { color: #1f5c8d; }
.wx-article a { color: #1f78c1; text-decoration: none; border-bottom: 1px solid #99c3e6; }
.wx-article ul, .wx-article ol { margin: 0.9em 0; padding-left: 1.45em; }
.wx-article li::marker { color: #4d88bb; font-weight: 700; }
.wx-article blockquote { margin: 1.15em 0; padding: 0.95em 1.02em; background: #f0f7fd; border-left: 4px solid #6aa3d2; border-radius: 10px; color: #486275; }
.wx-article code { font-family: Menlo, Monaco, Consolas, monospace; background: #e9f2fb; color: #174a72; padding: 0.2em 0.45em; border-radius: 5px; }
.wx-article pre { background: #0f1a23; color: #dcecf8; padding: 1em 1.1em; border-radius: 12px; overflow: auto; }
.wx-article pre code { background: transparent; color: inherit; padding: 0; }
.wx-article table { width: 100%; border-collapse: collapse; margin: 1.2em 0; }
.wx-article th, .wx-article td { padding: 0.72em 0.8em; border: 1px solid #dde7ef; }
.wx-article th { background: #eef5fb; color: #23537e; }
`,
  },
  {
    id: 'soft-living',
    name: '柔光生活',
    css: `
.wx-article { color: #4a3f43; font-size: 16px; line-height: 1.92; background: linear-gradient(180deg, #fffaf7 0%, #fff4f2 100%); border: 1px solid #f1e2de; border-radius: 22px; padding: 26px 22px; }
.wx-article h1, .wx-article h2, .wx-article h3, .wx-article h4 { margin: 1.45em 0 0.72em; line-height: 1.3; font-weight: 800; }
.wx-article h1 { font-size: 1.88em; color: #6b4b56; }
.wx-article h2 { font-size: 1.26em; color: #9c6676; display: inline-block; padding: 0.18em 0.68em; border-radius: 999px; background: #fde7ea; }
.wx-article h3 { font-size: 1.08em; color: #b47b84; }
.wx-article p { margin: 0.98em 0; text-align: justify; }
.wx-article strong { color: #9c5a69; }
.wx-article a { color: #c06d82; text-decoration: none; border-bottom: 1px solid #e3a8b5; }
.wx-article ul, .wx-article ol { margin: 0.94em 0; padding-left: 1.45em; }
.wx-article li::marker { color: #d08a9d; font-weight: 700; }
.wx-article blockquote { margin: 1.2em 0; padding: 1em 1.08em; background: rgba(255,255,255,0.68); border: 1px solid #f3dde2; border-radius: 16px; color: #7c646d; box-shadow: 0 10px 22px rgba(219, 173, 181, 0.12); }
.wx-article code { font-family: Menlo, Monaco, Consolas, monospace; background: #fdecef; color: #9b5c70; padding: 0.2em 0.45em; border-radius: 6px; }
.wx-article pre { background: #2f2630; color: #fceef2; padding: 1em 1.1em; border-radius: 16px; overflow: auto; }
.wx-article pre code { background: transparent; color: inherit; padding: 0; }
.wx-article table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 1.2em 0; overflow: hidden; border-radius: 16px; border: 1px solid #f1dfe3; }
.wx-article th, .wx-article td { padding: 0.76em 0.82em; border-bottom: 1px solid #f6e9ec; }
.wx-article th { background: #fff1f3; color: #966474; }
.wx-article tr:last-child td { border-bottom: 0; }
`,
  },
  {
    id: 'marker-note',
    name: '荧光标注',
    css: `
.wx-article { color: #323232; font-size: 16px; line-height: 1.85; }
.wx-article h1, .wx-article h2, .wx-article h3, .wx-article h4 { margin: 1.4em 0 0.7em; line-height: 1.5; font-weight: 700; color: #515151; }
.wx-article h1 { font-size: 1.62em; }
.wx-article h2 {
  font-size: 1.38em;
  display: inline-block;
  padding: 0.12em 0.7em;
  background-image: linear-gradient(0deg, #ffc857 42%, transparent 42%);
  background-repeat: no-repeat;
  background-size: 100% 100%;
}
.wx-article h3 { font-size: 1.14em; border-left: 4px solid #f0a93b; padding-left: 0.58em; }
.wx-article p { margin: 0.9em 0; }
.wx-article a { color: #3d6a91; text-decoration: none; border-bottom: 1px solid #8ea8bf; }
.wx-article ul, .wx-article ol { margin: 0.9em 0; padding-left: 1.45em; }
.wx-article li::marker { color: #c9861f; }
.wx-article blockquote { margin: 1.1em 0; padding: 0.9em 1em; border-left: 4px solid #f0a93b; background: #fff7e7; color: #6f5a35; }
.wx-article code { font-family: Menlo, Monaco, Consolas, monospace; background: #ffefcf; color: #7a5112; padding: 0.2em 0.45em; border-radius: 5px; }
.wx-article pre { background: #232323; color: #f6f6f6; padding: 1em 1.1em; border-radius: 12px; overflow: auto; }
.wx-article pre code { background: transparent; color: inherit; padding: 0; }
.wx-article table { width: 100%; border-collapse: collapse; margin: 1.2em 0; }
.wx-article th, .wx-article td { padding: 0.7em 0.8em; border: 1px solid #e6e6e6; }
.wx-article th { background: #f7f7f7; color: #505050; }
`,
  },
];

const THEME_CARD_META = {
  classic: { desc: '通用排版，公众号常用', cover: 'linear-gradient(140deg, #f7fbff 0%, #e7f4ff 100%)', accent: '#4f78a9' },
  ink: { desc: '纸感卡片，沉稳阅读', cover: 'linear-gradient(140deg, #f8f0df 0%, #fffaf1 100%)', accent: '#8a6335' },
  mint: { desc: '清新轻量，适合教程', cover: 'linear-gradient(140deg, #dcf8ee 0%, #f2fffb 100%)', accent: '#1e8f75' },
  ocean: { desc: '科技感蓝系，信息密集', cover: 'linear-gradient(140deg, #d8ecff 0%, #edf8ff 100%)', accent: '#0f6eb7' },
  sunset: { desc: '温暖橙调，故事分享', cover: 'linear-gradient(140deg, #ffe8d2 0%, #fff6ea 100%)', accent: '#cb6239' },
  'violet-paper': { desc: '柔和纸感，笔记风格', cover: 'linear-gradient(140deg, #f2ecff 0%, #fcf9ff 100%)', accent: '#6c4bc4' },
  'mono-news': { desc: '黑白报刊，严肃表达', cover: 'linear-gradient(140deg, #ececec 0%, #fafafa 100%)', accent: '#2b2b2b' },
  'yanqi-lake': { desc: '分节标题，自动序号', cover: 'linear-gradient(140deg, #d9f0fb 0%, #f5fcff 100%)', accent: '#2584b5' },
  'pine-forest': { desc: '森系自然，简洁柔和', cover: 'linear-gradient(140deg, #dff5e9 0%, #f4fff8 100%)', accent: '#2f765f' },
  aurora: { desc: '青蓝渐变，现代轻盈', cover: 'linear-gradient(140deg, #d7f3ff 0%, #ecfcff 100%)', accent: '#1784ba' },
  'night-city': { desc: '深色霓虹，视觉冲击', cover: 'linear-gradient(140deg, #1f2952 0%, #141a35 100%)', accent: '#7de0ff' },
  'amber-manifesto': { desc: '暖金社论，层次完整', cover: 'linear-gradient(140deg, #f6dfbf 0%, #fff7ea 100%)', accent: '#b56a2f' },
  'obsidian-ledger': { desc: '深色质感，适合专题长文', cover: 'linear-gradient(140deg, #1a2230 0%, #0f131a 100%)', accent: '#67c7ff' },
  'atelier-grid': { desc: '栅格纸张，设计感更强', cover: 'linear-gradient(140deg, #e5eff8 0%, #fbfdff 100%)', accent: '#2a6aa1' },
  'crimson-column': { desc: '专栏风格，标题冲击更强', cover: 'linear-gradient(140deg, #f8d9dc 0%, #fff7f8 100%)', accent: '#a92634' },
  'boardroom-slate': { desc: '商业汇报感，稳重克制', cover: 'linear-gradient(140deg, #e2e8ef 0%, #f8fafc 100%)', accent: '#436685' },
  'launch-white': { desc: '产品发布稿，留白更足', cover: 'linear-gradient(140deg, #f4f8fc 0%, #ffffff 100%)', accent: '#0b74ff' },
  'archive-chronicle': { desc: '档案文献感，适合叙事长文', cover: 'linear-gradient(140deg, #efe4d2 0%, #fbf7ef 100%)', accent: '#8b5b2d' },
  'signal-lab': { desc: '实验室报告，理性但不单调', cover: 'linear-gradient(140deg, #dff2f7 0%, #f7fbfd 100%)', accent: '#1488a8' },
  'cover-story': { desc: '杂志封面感，标题表现更强', cover: 'linear-gradient(140deg, #f5dfc4 0%, #fff8ef 100%)', accent: '#a74c24' },
  'black-gold-note': { desc: '黑金发布稿，贵气但克制', cover: 'linear-gradient(140deg, #241b13 0%, #0f0c09 100%)', accent: '#cfa458' },
  'poster-bloom': { desc: '艺术海报感，适合活动文案', cover: 'linear-gradient(140deg, #ffe5ea 0%, #f8f1ff 100%)', accent: '#af4a6f' },
  'intel-brief': { desc: '冷调信息简报，适合资讯汇总', cover: 'linear-gradient(140deg, #ddeaf0 0%, #f6fafb 100%)', accent: '#3e7b95' },
  'viral-longform': { desc: '适合爆款长文，重点更醒目', cover: 'linear-gradient(140deg, #ffe4d8 0%, #fff8f3 100%)', accent: '#d9602a' },
  'talent-deck': { desc: '招聘 JD / 团队介绍风格', cover: 'linear-gradient(140deg, #e3f1ff 0%, #f7fbff 100%)', accent: '#2790eb' },
  'weekly-merge': { desc: '技术周报与更新汇总', cover: 'linear-gradient(140deg, #e5eef6 0%, #fbfdff 100%)', accent: '#4d88bb' },
  'soft-living': { desc: '生活方式与品牌内容', cover: 'linear-gradient(140deg, #fde8ec 0%, #fff9f8 100%)', accent: '#c06d82' },
  'marker-note': { desc: '黄色荧光笔标题强调风格', cover: 'linear-gradient(140deg, #fff4d8 0%, #fffaf1 100%)', accent: '#d08d2a' },
};

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

const LOCAL_IMAGE_SCHEME = 'local://';
const ASSET_DB_NAME = 'md2wechat-assets';
const ASSET_STORE_NAME = 'images';

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
      <span class="logo">MD2WECHAT</span>
      <button id="editorViewBtn" class="tab-btn active" type="button">编辑器</button>
      <button id="themeViewBtn" class="tab-btn" type="button">主题管理</button>
      <button id="imageAssetsBtn" type="button">文中图片</button>
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
        class="icon-btn"
        href="https://github.com/sszgr/md2wechat"
        target="_blank"
        rel="noreferrer"
        title="GitHub 仓库"
        aria-label="打开 GitHub 仓库"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 0.5C5.65 0.5 0.5 5.65 0.5 12c0 5.08 3.29 9.39 7.86 10.91 0.58 0.11 0.79-0.25 0.79-0.56 0-0.28-0.01-1.02-0.02-2-3.2 0.7-3.88-1.54-3.88-1.54-0.52-1.33-1.28-1.68-1.28-1.68-1.04-0.71 0.08-0.7 0.08-0.7 1.16 0.08 1.76 1.19 1.76 1.19 1.02 1.76 2.68 1.25 3.34 0.95 0.1-0.74 0.4-1.25 0.72-1.54-2.55-0.29-5.23-1.28-5.23-5.7 0-1.26 0.45-2.29 1.19-3.09-0.12-0.29-0.52-1.46 0.11-3.05 0 0 0.97-0.31 3.17 1.18a10.96 10.96 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18 0.63 1.59 0.23 2.76 0.11 3.05 0.74 0.8 1.19 1.83 1.19 3.09 0 4.43-2.68 5.41-5.24 5.69 0.41 0.35 0.77 1.04 0.77 2.1 0 1.52-0.01 2.74-0.01 3.11 0 0.31 0.21 0.68 0.8 0.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35 0.5 12 0.5z"></path>
        </svg>
      </a>
      <div class="wechat-entry" aria-label="微信公众号二维码">
        <span id="wechatToggleBtn" class="icon-btn wechat-icon" title="微信公众号" role="button" tabindex="0" aria-label="打开微信公众号二维码">
          <svg t="1772716456962" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1683" width="200" height="200">
            <path d="M337.387283 341.82659c-17.757225 0-35.514451 11.83815-35.514451 29.595375s17.757225 29.595376 35.514451 29.595376 29.595376-11.83815 29.595376-29.595376c0-18.49711-11.83815-29.595376-29.595376-29.595375zM577.849711 513.479769c-11.83815 0-22.936416 12.578035-22.936416 23.6763 0 12.578035 11.83815 23.676301 22.936416 23.676301 17.757225 0 29.595376-11.83815 29.595376-23.676301s-11.83815-23.676301-29.595376-23.6763zM501.641618 401.017341c17.757225 0 29.595376-12.578035 29.595376-29.595376 0-17.757225-11.83815-29.595376-29.595376-29.595375s-35.514451 11.83815-35.51445 29.595375 17.757225 29.595376 35.51445 29.595376zM706.589595 513.479769c-11.83815 0-22.936416 12.578035-22.936416 23.6763 0 12.578035 11.83815 23.676301 22.936416 23.676301 17.757225 0 29.595376-11.83815 29.595376-23.676301s-11.83815-23.676301-29.595376-23.6763z" fill="#28C445" p-id="1684"></path><path d="M510.520231 2.959538C228.624277 2.959538 0 231.583815 0 513.479769s228.624277 510.520231 510.520231 510.520231 510.520231-228.624277 510.520231-510.520231-228.624277-510.520231-510.520231-510.520231zM413.595376 644.439306c-29.595376 0-53.271676-5.919075-81.387284-12.578034l-81.387283 41.433526 22.936416-71.768786c-58.450867-41.433526-93.965318-95.445087-93.965317-159.815029 0-113.202312 105.803468-201.988439 233.803468-201.98844 114.682081 0 216.046243 71.028902 236.023121 166.473989-7.398844-0.739884-14.797688-1.479769-22.196532-1.479769-110.982659 1.479769-198.289017 85.086705-198.289017 188.67052 0 17.017341 2.959538 33.294798 7.398844 49.572255-7.398844 0.739884-15.537572 1.479769-22.936416 1.479768z m346.265896 82.867052l17.757225 59.190752-63.630058-35.514451c-22.936416 5.919075-46.612717 11.83815-70.289017 11.83815-111.722543 0-199.768786-76.947977-199.768786-172.393063-0.739884-94.705202 87.306358-171.653179 198.289017-171.65318 105.803468 0 199.028902 77.687861 199.028902 172.393064 0 53.271676-34.774566 100.624277-81.387283 136.138728z" fill="#28C445" p-id="1685"></path>
          </svg>
        </span>
        <div id="wechatPopover" class="wechat-popover">
          <img src="/wechat-qrcode.png" alt="微信公众号二维码" />
          <div class="wechat-popover-title">微信公众号：碎碎冰安全</div>
          <div class="wechat-popover-hint">微信内可长按识别二维码关注</div>
        </div>
      </div>
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
      <div class="panel-title panel-title-row">
        <span>主题编辑</span>
        <button id="toggleThemePreviewBtn" type="button">隐藏预览</button>
      </div>
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
    <section id="themePreviewPanel" class="panel theme-preview-panel">
      <div class="panel-title panel-title-row">
        <span>主题预览文章</span>
        <button id="closeThemePreviewBtn" type="button">关闭</button>
      </div>
      <div class="theme-preview-scroll">
        <div id="themePreviewArticleHost" class="theme-preview-article-host"></div>
      </div>
    </section>
  </main>

  <div id="mobileEntryPrompt" class="mobile-entry-prompt hidden">
    <div class="mobile-entry-backdrop"></div>
    <section class="mobile-entry-card">
      <h3>温馨提示</h3>
      <p>建议使用电脑端打开公众号排版工具，以获得更优的编辑与排版体验。</p>
      <p>更多信息，请在微信内长按识别下方二维码，关注公众号「碎碎冰安全」。</p>
      <img src="/wechat-qrcode.png" alt="微信公众号二维码" />
      <button id="mobileEntryContinueBtn" type="button">继续访问</button>
    </section>
  </div>

  <div id="imageAssetsModal" class="modal hidden">
    <div id="imageAssetsBackdrop" class="modal-backdrop"></div>
    <section class="modal-card image-assets-modal">
      <header class="modal-header">
        <h3>文中图片资源</h3>
        <button id="closeImageAssetsBtn" type="button" class="modal-close">关闭</button>
      </header>
      <div class="modal-body">
        <div class="image-assets-table-wrap">
          <table class="image-assets-table">
            <thead>
              <tr>
                <th>资源名称</th>
                <th>资源类型</th>
                <th>资源地址</th>
                <th>预览</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody id="imageRefList"></tbody>
          </table>
        </div>
      </div>
      <input id="imageFileInput" type="file" accept="image/*" hidden />
    </section>
  </div>
`;

const editorViewBtn = document.querySelector('#editorViewBtn');
const themeViewBtn = document.querySelector('#themeViewBtn');
const imageAssetsBtn = document.querySelector('#imageAssetsBtn');
const wechatEntry = document.querySelector('.wechat-entry');
const wechatToggleBtn = document.querySelector('#wechatToggleBtn');
const wechatPopover = document.querySelector('#wechatPopover');
const mobileEntryPrompt = document.querySelector('#mobileEntryPrompt');
const mobileEntryContinueBtn = document.querySelector('#mobileEntryContinueBtn');
const imageAssetsModal = document.querySelector('#imageAssetsModal');
const imageAssetsBackdrop = document.querySelector('#imageAssetsBackdrop');
const closeImageAssetsBtn = document.querySelector('#closeImageAssetsBtn');
const imageFileInput = document.querySelector('#imageFileInput');
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
const imageRefList = document.querySelector('#imageRefList');

const themeList = document.querySelector('#themeList');
const themeNameInput = document.querySelector('#themeNameInput');
const themeCssEditorHost = document.querySelector('#themeCssEditor');
const snippetList = document.querySelector('#snippetList');
const toggleThemePreviewBtn = document.querySelector('#toggleThemePreviewBtn');
const closeThemePreviewBtn = document.querySelector('#closeThemePreviewBtn');
const themePreviewPanel = document.querySelector('#themePreviewPanel');
const themePreviewArticleHost = document.querySelector('#themePreviewArticleHost');
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
let editorView = null;
let pendingImageRefIndex = null;
let assetDbPromise = null;
const previewObjectUrls = new Set();
const modalPreviewObjectUrls = new Set();

let currentView = 'editor';
let managerEditingMode = 'existing';
let managerSelectedThemeId = null;
let customThemes = loadCustomThemes();
let favoriteThemeIds = loadFavoriteThemeIds();
let allThemes = getOrderedThemes([...BUILTIN_THEMES, ...customThemes]);
let inlineLinksEnabled = localStorage.getItem(STORAGE_KEYS.inlineLinks) === '1';
let themePreviewVisible = localStorage.getItem(STORAGE_KEYS.themePreviewVisible) !== '0';
let themePreviewShadow = null;
let themePreviewStyleEl = null;
let themePreviewArticleEl = null;
const missingThemeCoverIds = new Set();

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

function loadFavoriteThemeIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.favoriteThemes);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string' && id) : [];
  } catch {
    return [];
  }
}

function saveFavoriteThemeIds() {
  localStorage.setItem(STORAGE_KEYS.favoriteThemes, JSON.stringify(favoriteThemeIds));
}

function isFavoriteTheme(themeId) {
  return favoriteThemeIds.includes(themeId);
}

function getOrderedThemes(themeList) {
  const indexed = themeList.map((theme, index) => ({ theme, index }));
  indexed.sort((a, b) => {
    const aFav = isFavoriteTheme(a.theme.id) ? 1 : 0;
    const bFav = isFavoriteTheme(b.theme.id) ? 1 : 0;
    if (aFav !== bFav) return bFav - aFav;
    return a.index - b.index;
  });
  return indexed.map((item) => item.theme);
}

function toggleFavoriteTheme(themeId) {
  if (!themeId) return;
  if (isFavoriteTheme(themeId)) {
    favoriteThemeIds = favoriteThemeIds.filter((id) => id !== themeId);
  } else {
    favoriteThemeIds = [themeId, ...favoriteThemeIds.filter((id) => id !== themeId)];
  }
  saveFavoriteThemeIds();
  refreshThemes();
}

function focusThemeCard(themeId) {
  const selector = `.theme-item[data-theme-id="${themeId}"]`;
  const card = themeList.querySelector(selector);
  if (!(card instanceof HTMLElement)) return;
  card.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
  card.classList.remove('promoted');
  window.requestAnimationFrame(() => {
    card.classList.add('promoted');
    window.setTimeout(() => {
      card.classList.remove('promoted');
    }, 700);
  });
}

function saveCustomThemes() {
  localStorage.setItem(STORAGE_KEYS.customThemes, JSON.stringify(customThemes));
}

function getThemeById(themeId) {
  return allThemes.find((t) => t.id === themeId) ?? BUILTIN_THEMES[0];
}

function refreshThemes() {
  allThemes = getOrderedThemes([...BUILTIN_THEMES, ...customThemes]);
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
      EditorView.updateListener.of((update) => {
        if (!update.docChanged) return;
        if (currentView !== 'themes') return;
        renderThemeManagerPreview(update.state.doc.toString());
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

function getThemeCardMeta(theme) {
  if (!theme?.id) {
    return {
      desc: '自定义主题',
      cover: 'linear-gradient(140deg, #e8eef7 0%, #f5f9ff 100%)',
      accent: '#4c78a8',
    };
  }
  return THEME_CARD_META[theme.id] || {
    desc: theme.custom ? '自定义主题' : '内置主题',
    cover: 'linear-gradient(140deg, #e8eef7 0%, #f5f9ff 100%)',
    accent: '#4c78a8',
  };
}

function getThemeCoverUrl(theme) {
  if (!theme?.id) return '';
  if (missingThemeCoverIds.has(theme.id)) return '';
  return `/theme-covers/${theme.id}.svg`;
}

function renderThemeListSelection(selectedId) {
  themeList.querySelectorAll('.theme-item').forEach((item) => {
    const isActive = item.getAttribute('data-theme-id') === selectedId;
    item.classList.toggle('active', isActive);
  });
}

function ensureThemePreviewShadow() {
  if (themePreviewShadow) return;
  themePreviewShadow = themePreviewArticleHost.attachShadow({ mode: 'open' });
  themePreviewShadow.innerHTML = `
    <style>
      :host { display: block; }
      .wx-article {
        min-height: 100%;
        box-sizing: border-box;
        background: #fff;
        padding: 20px;
        border-radius: 12px;
        border: 1px solid #dce5f0;
      }
      .wx-article img { max-width: 100%; height: auto; }
      .wx-article pre.hljs { background: var(--hljs-bg) !important; color: var(--hljs-fg) !important; }
      .wx-article pre { overflow: auto; }
    </style>
    <style id="themePreviewStyle"></style>
    <article class="wx-article"></article>
  `;
  themePreviewStyleEl = themePreviewShadow.querySelector('#themePreviewStyle');
  themePreviewArticleEl = themePreviewShadow.querySelector('.wx-article');
}

function renderThemeManagerPreview(themeCss) {
  ensureThemePreviewShadow();
  if (!themePreviewStyleEl || !themePreviewArticleEl) return;
  themePreviewStyleEl.textContent = themeCss || '';
  themePreviewArticleEl.innerHTML = md.render(THEME_PREVIEW_MD);
}

function renderThemePreviewVisibility() {
  themeManagerViewRoot.classList.toggle('theme-preview-hidden', !themePreviewVisible);
  toggleThemePreviewBtn.textContent = themePreviewVisible ? '隐藏预览' : '显示预览';
  themePreviewPanel.classList.toggle('hidden', !themePreviewVisible);
  localStorage.setItem(STORAGE_KEYS.themePreviewVisible, themePreviewVisible ? '1' : '0');
}

function shouldShowMobileEntryPrompt() {
  try {
    if (window.sessionStorage.getItem(MOBILE_NOTICE_SESSION_KEY) === '1') return false;
  } catch {
    // Ignore sessionStorage access failures and fall back to runtime checks.
  }
  const ua = navigator.userAgent || '';
  const isMobileUa = /Android|iPhone|iPad|iPod|Mobile|HarmonyOS/i.test(ua);
  const isNarrow = window.matchMedia('(max-width: 900px)').matches;
  const isCoarse = window.matchMedia('(pointer: coarse)').matches;
  return isMobileUa || (isNarrow && isCoarse);
}

function openMobileEntryPromptIfNeeded() {
  if (!mobileEntryPrompt) return;
  if (!shouldShowMobileEntryPrompt()) return;
  mobileEntryPrompt.classList.remove('hidden');
}

function closeMobileEntryPrompt() {
  if (!mobileEntryPrompt) return;
  mobileEntryPrompt.classList.add('hidden');
  try {
    window.sessionStorage.setItem(MOBILE_NOTICE_SESSION_KEY, '1');
  } catch {
    // Ignore sessionStorage access failures.
  }
}

function renderThemeList() {
  const selectedId = managerSelectedThemeId || localStorage.getItem(STORAGE_KEYS.selectedTheme) || BUILTIN_THEMES[0].id;
  themeList.innerHTML = allThemes
    .map((theme) => {
      const activeClass = theme.id === selectedId ? 'active' : '';
      const meta = getThemeCardMeta(theme);
      const favoriteClass = isFavoriteTheme(theme.id) ? 'active' : '';
      const favoriteLabel = isFavoriteTheme(theme.id) ? '取消加星' : '加星';
      const coverUrl = getThemeCoverUrl(theme);
      const coverImageHtml = coverUrl
        ? `<img class="theme-cover-image" data-theme-id="${theme.id}" src="${escapeHtml(coverUrl)}" alt="${escapeHtml(theme.name)}" loading="lazy" />`
        : '';
      return `
        <button class="theme-item ${activeClass}" data-theme-id="${theme.id}" type="button">
          <span class="theme-cover" style="--cover-bg:${meta.cover};--cover-accent:${meta.accent}">
            ${coverImageHtml}
            <span class="theme-favorite-btn ${favoriteClass}" data-theme-id="${theme.id}" role="button" aria-label="${favoriteLabel}" title="${favoriteLabel}">★</span>
            <span class="theme-cover-tag">${theme.custom ? '自定义' : '内置'}</span>
            <span class="theme-cover-title">${escapeHtml(theme.name)}</span>
            <span class="theme-cover-line"></span>
            <span class="theme-cover-line short"></span>
          </span>
          <span class="theme-item-meta">
            <span class="theme-item-name">${escapeHtml(theme.name)}</span>
            <span class="theme-item-desc">${escapeHtml(meta.desc)}</span>
          </span>
        </button>
      `;
    })
    .join('');
}

function applyTheme(themeId) {
  const theme = getThemeById(themeId);
  themeStyleTag.textContent = theme.css;
  localStorage.setItem(STORAGE_KEYS.selectedTheme, theme.id);
  themeSelect.value = theme.id;
}

function isLocalImageUrl(url) {
  return typeof url === 'string' && url.startsWith(LOCAL_IMAGE_SCHEME);
}

function getLocalImageId(url) {
  if (!isLocalImageUrl(url)) return '';
  return url.slice(LOCAL_IMAGE_SCHEME.length).trim();
}

function generateLocalImageId() {
  const rand = Math.random().toString(36).slice(2, 8);
  return `img-${Date.now()}-${rand}`;
}

function getAssetDb() {
  if (assetDbPromise) return assetDbPromise;
  if (!window.indexedDB) {
    return Promise.reject(new Error('当前浏览器不支持 IndexedDB'));
  }
  assetDbPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(ASSET_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ASSET_STORE_NAME)) {
        db.createObjectStore(ASSET_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB 初始化失败'));
  });
  return assetDbPromise;
}

async function putImageAsset(assetId, blob) {
  const db = await getAssetDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(ASSET_STORE_NAME, 'readwrite');
    tx.objectStore(ASSET_STORE_NAME).put(blob, assetId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('保存图片失败'));
  });
}

async function getImageAsset(assetId) {
  const db = await getAssetDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ASSET_STORE_NAME, 'readonly');
    const req = tx.objectStore(ASSET_STORE_NAME).get(assetId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error || new Error('读取图片失败'));
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('图片转换失败'));
    reader.readAsDataURL(blob);
  });
}

function revokePreviewObjectUrls() {
  previewObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  previewObjectUrls.clear();
}

function revokeModalPreviewObjectUrls() {
  modalPreviewObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  modalPreviewObjectUrls.clear();
}

function replaceMarkdownRange(from, to, insert) {
  if (!editorView) return;
  editorView.dispatch({
    changes: { from, to, insert },
    selection: { anchor: from + insert.length },
  });
  const value = editorView.state.doc.toString();
  currentMarkdown = value;
  saveMarkdown(value);
  renderPreview(value);
  editorView.focus();
}

function parseMarkdownImages(markdownText) {
  const list = [];
  const regex = /!\[([^\]]*)\]\(([^)\n]+)\)/g;
  let match = regex.exec(markdownText);
  while (match) {
    const whole = match[0];
    const alt = match[1] ?? '';
    const innerRaw = (match[2] ?? '').trim();
    let urlToken = innerRaw;
    let suffix = '';

    if (innerRaw.startsWith('<')) {
      const closing = innerRaw.indexOf('>');
      if (closing > 0) {
        urlToken = innerRaw.slice(0, closing + 1);
        suffix = innerRaw.slice(closing + 1).trim();
      }
    } else {
      const firstSpace = innerRaw.search(/\s/);
      if (firstSpace > 0) {
        urlToken = innerRaw.slice(0, firstSpace);
        suffix = innerRaw.slice(firstSpace).trim();
      }
    }

    const normalizedUrl = urlToken.startsWith('<') && urlToken.endsWith('>')
      ? urlToken.slice(1, -1)
      : urlToken;

    list.push({
      alt,
      raw: whole,
      from: match.index,
      to: match.index + whole.length,
      urlToken,
      normalizedUrl,
      suffix,
      isLocal: isLocalImageUrl(normalizedUrl),
      localId: getLocalImageId(normalizedUrl),
    });
    match = regex.exec(markdownText);
  }
  return list;
}

async function fillModalLocalPreviews() {
  const rows = Array.from(imageRefList.querySelectorAll('tr[data-local-id]'));
  for (const row of rows) {
    const localId = row.dataset.localId;
    if (!localId) continue;
    const img = row.querySelector('img[data-preview-kind="local"]');
    if (!(img instanceof HTMLImageElement)) continue;
    try {
      const blob = await getImageAsset(localId);
      if (!blob) {
        img.alt = '资源缺失';
        continue;
      }
      const objectUrl = URL.createObjectURL(blob);
      modalPreviewObjectUrls.add(objectUrl);
      img.src = objectUrl;
    } catch (error) {
      console.error(error);
    }
  }
}

function renderImageRefList(markdownText) {
  revokeModalPreviewObjectUrls();
  const images = parseMarkdownImages(markdownText);
  if (images.length === 0) {
    imageRefList.innerHTML = '<tr><td class="image-ref-empty" colspan="5">当前 Markdown 没有图片引用</td></tr>';
    return;
  }

  imageRefList.innerHTML = images
    .map((item, index) => {
      const name = item.alt || `图片 ${index + 1}`;
      const shownUrl = item.isLocal ? `${LOCAL_IMAGE_SCHEME}${item.localId}` : (item.normalizedUrl || '(空链接)');
      const type = item.isLocal ? '本地资源' : '外部链接';
      const previewTriggerLabel = '查看';
      const remoteSrc = item.isLocal ? '' : item.normalizedUrl;
      return `
        <tr ${item.isLocal ? `data-local-id="${escapeHtml(item.localId)}"` : ''}>
          <td>${escapeHtml(name)}</td>
          <td>${type}</td>
          <td class="image-address-cell">${escapeHtml(shownUrl)}</td>
          <td>
            <span class="preview-hover">
              <span class="preview-trigger">${previewTriggerLabel}</span>
              <span class="preview-popover">
                <img data-preview-kind="${item.isLocal ? 'local' : 'remote'}" src="${escapeHtml(remoteSrc)}" alt="${escapeHtml(name)}" />
              </span>
            </span>
          </td>
          <td>
            <button class="image-ref-btn" type="button" data-image-index="${index}">上传/更新图片</button>
          </td>
        </tr>
      `;
    })
    .join('');
  void fillModalLocalPreviews();
}

async function resolvePreviewLocalImages() {
  const images = Array.from(preview.querySelectorAll('img[src]'));
  for (const img of images) {
    const rawSrc = (img.getAttribute('src') || '').trim();
    const assetId = getLocalImageId(rawSrc);
    if (!assetId) continue;
    try {
      const blob = await getImageAsset(assetId);
      if (!blob) continue;
      const objectUrl = URL.createObjectURL(blob);
      previewObjectUrls.add(objectUrl);
      img.setAttribute('src', objectUrl);
      img.dataset.localAssetId = assetId;
    } catch (error) {
      console.error(error);
    }
  }
}

function renderPreview(markdownText) {
  revokePreviewObjectUrls();
  preview.innerHTML = md.render(markdownText);
  renderImageRefList(markdownText);
  void resolvePreviewLocalImages();
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

function openImageAssetsModal() {
  renderImageRefList(currentMarkdown);
  imageAssetsModal.classList.remove('hidden');
}

function closeImageAssetsModal() {
  imageAssetsModal.classList.add('hidden');
  revokeModalPreviewObjectUrls();
}

function closeWechatPopover() {
  wechatEntry.classList.remove('open');
  wechatToggleBtn.setAttribute('aria-expanded', 'false');
}

function toggleWechatPopover() {
  const willOpen = !wechatEntry.classList.contains('open');
  wechatEntry.classList.toggle('open', willOpen);
  wechatToggleBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
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

async function convertLocalImagesForCopy(rootEl) {
  const images = Array.from(rootEl.querySelectorAll('img[src]'));
  for (const img of images) {
    const rawSrc = (img.getAttribute('src') || '').trim();
    const assetId = img.dataset.localAssetId || getLocalImageId(rawSrc);
    if (!assetId) continue;
    try {
      const blob = await getImageAsset(assetId);
      if (!blob) continue;
      const dataUrl = await blobToDataUrl(blob);
      img.setAttribute('src', dataUrl);
    } catch (error) {
      console.error(error);
    }
  }
}

async function buildCopyHtml() {
  const cloned = preview.cloneNode(true);
  toInlineStyles(preview, cloned);
  normalizeCopyDom(cloned);
  await convertLocalImagesForCopy(cloned);
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
  const html = await buildCopyHtml();
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
  const nextCss = mode === 'new' ? NEW_THEME_TEMPLATE : theme.css;
  setThemeCssValue(nextCss);
  renderThemeManagerPreview(nextCss);

  const editable = mode === 'new' || theme.custom;
  saveThemeBtn.textContent = mode === 'new' ? '创建主题' : '保存主题';
  deleteThemeBtn.disabled = !theme.custom || mode === 'new';
  themeNameInput.readOnly = false;
  setThemeCssEditable(editable);

  const selectedId = managerSelectedThemeId || localStorage.getItem(STORAGE_KEYS.selectedTheme) || BUILTIN_THEMES[0].id;
  if (themeList.children.length === 0) {
    renderThemeList();
  } else {
    renderThemeListSelection(selectedId);
  }
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
  favoriteThemeIds = favoriteThemeIds.filter((id) => id !== themeId);
  saveFavoriteThemeIds();
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
renderThemePreviewVisibility();
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

editorView = new EditorView({
  state: editorState,
  parent: document.querySelector('#editor'),
});

renderPreview(currentMarkdown);
selectThemeInManager(localStorage.getItem(STORAGE_KEYS.selectedTheme) || BUILTIN_THEMES[0].id);
renderInlineLinksButton();
openMobileEntryPromptIfNeeded();
loadHighlightAssets(getInitialCodeThemeId(), () => {
  renderPreview(currentMarkdown);
});

editorViewBtn.addEventListener('click', () => openView('editor'));
themeViewBtn.addEventListener('click', () => {
  openView('themes');
  selectThemeInManager(managerSelectedThemeId || themeSelect.value);
});
imageAssetsBtn.addEventListener('click', () => {
  openImageAssetsModal();
});
wechatToggleBtn.addEventListener('click', (event) => {
  event.stopPropagation();
  toggleWechatPopover();
});
wechatToggleBtn.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  toggleWechatPopover();
});
wechatPopover.addEventListener('click', (event) => {
  event.stopPropagation();
});
closeImageAssetsBtn.addEventListener('click', () => {
  closeImageAssetsModal();
});
imageAssetsBackdrop.addEventListener('click', () => {
  closeImageAssetsModal();
});
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  closeWechatPopover();
  if (imageAssetsModal.classList.contains('hidden')) return;
  closeImageAssetsModal();
});
document.addEventListener('click', (event) => {
  if (wechatEntry.contains(event.target)) return;
  closeWechatPopover();
});

imageFileInput.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    if (pendingImageRefIndex == null) {
      window.alert('请先打开“文中图片”弹窗并点击对应资源的“上传/更新图片”');
      return;
    }

    const images = parseMarkdownImages(currentMarkdown);
    const target = images[pendingImageRefIndex];
    if (!target) {
      window.alert('目标图片引用已变化，请重新点击“上传/更新图片”');
      return;
    }

    const nextAssetId = generateLocalImageId();
    await putImageAsset(nextAssetId, file);
    const nextUrl = `${LOCAL_IMAGE_SCHEME}${nextAssetId}`;

    const wrappedUrl = (target.urlToken.startsWith('<') && target.urlToken.endsWith('>'))
      ? `<${nextUrl}>`
      : nextUrl;
    const nextInner = target.suffix ? `${wrappedUrl} ${target.suffix}` : wrappedUrl;
    const nextRaw = `![${target.alt}](${nextInner})`;
    replaceMarkdownRange(target.from, target.to, nextRaw);
  } catch (error) {
    console.error(error);
    window.alert('上传图片失败，请稍后重试');
  } finally {
    pendingImageRefIndex = null;
    imageFileInput.value = '';
  }
});

imageRefList.addEventListener('click', (event) => {
  const target = event.target.closest('.image-ref-btn');
  if (!(target instanceof HTMLElement)) return;
  const imageIndex = Number(target.dataset.imageIndex);
  if (!Number.isInteger(imageIndex) || imageIndex < 0) return;
  pendingImageRefIndex = imageIndex;
  imageFileInput.click();
});

window.addEventListener('beforeunload', () => {
  revokePreviewObjectUrls();
  revokeModalPreviewObjectUrls();
});

themeSelect.addEventListener('change', () => {
  applyTheme(themeSelect.value);
  renderThemeListSelection(themeSelect.value);
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
  const favoriteBtn = event.target.closest('.theme-favorite-btn');
  if (favoriteBtn instanceof HTMLElement) {
    event.preventDefault();
    event.stopPropagation();
    const themeId = favoriteBtn.dataset.themeId;
    if (!themeId) return;
    const wasFavorite = isFavoriteTheme(themeId);
    toggleFavoriteTheme(themeId);
    if (!wasFavorite) {
      focusThemeCard(themeId);
    }
    return;
  }
  const target = event.target.closest('.theme-item');
  if (!(target instanceof HTMLElement)) return;
  const themeId = target.dataset.themeId;
  if (!themeId) return;
  selectThemeInManager(themeId);
});

themeList.addEventListener('error', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLImageElement) || !target.classList.contains('theme-cover-image')) return;
  const themeId = target.dataset.themeId;
  if (themeId) {
    missingThemeCoverIds.add(themeId);
  }
  target.remove();
}, true);

newThemeBtn.addEventListener('click', () => {
  managerSelectedThemeId = null;
  managerEditingMode = 'new';
  themeNameInput.value = '';
  setThemeCssValue(NEW_THEME_TEMPLATE);
  renderThemeManagerPreview(NEW_THEME_TEMPLATE);
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
  renderThemeManagerPreview(getThemeCssValue());
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

toggleThemePreviewBtn.addEventListener('click', () => {
  themePreviewVisible = !themePreviewVisible;
  renderThemePreviewVisibility();
});

closeThemePreviewBtn.addEventListener('click', () => {
  themePreviewVisible = false;
  renderThemePreviewVisibility();
});

mobileEntryContinueBtn.addEventListener('click', () => {
  closeMobileEntryPrompt();
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
