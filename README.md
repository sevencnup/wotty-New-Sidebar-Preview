# Sidebar Interceptor 新页跳转拦截侧边栏

一个 Chrome / Edge 浏览器扩展（Manifest V3）。把浏览器中**所有**"打开新标签页 / 新窗口"的跳转拦截下来，改为在当前页右侧滑出一个侧边栏，用 iframe 加载目标页面。

## 功能
- 拦截由当前页触发的 `window.open`、`target="_blank"`、`location` 跳转等新标签行为
- 关闭被打开的新标签，改在源页面右侧侧边栏 iframe 中加载
- 通过 `declarativeNetRequest` 移除 `X-Frame-Options` / `Content-Security-Policy(frame-ancestors)`，让目标页面能在 iframe 中显示
- 侧边栏带：后退 / 前进 / 刷新 / 在新标签打开 / 关闭
- 关闭后保留一个"展开"按钮可随时拉回
- 历史记录在侧边栏内维护（不污染浏览器历史）

## 安装
1. 打开 `chrome://extensions`（Edge: `edge://extensions`）
2. 打开右上角"开发者模式"
3. 点击"加载已解压的扩展程序"，选择本目录 `sidebar-interceptor`
4. 正常浏览网页即可，点击任何"在新标签打开"的链接会变成右侧滑出侧边栏

> 受浏览器保护页面（`chrome://`、扩展商店、`about:` 等）无法注入侧边栏，这类新标签跳转不拦截。

## 安装 - Firefox（永久，不用每次重装）

> 火狐稳定版强制要签名扩展，临时扩展关浏览器即失效。两种永久方案：

### 方案 A：Developer / Nightly / ESR 版永久装未签名扩展（自用最省事）
1. 装 [Firefox Developer Edition](https://www.mozilla.org/firefox/developer/) 或 Nightly / ESR（稳定版不支持关签名校验）
2. 地址栏 `about:config` → 搜 `xpinstall.signatures.required` → 双击改为 `false`
3. 用本目录已打包的 `sidebar-interceptor-v0.1.27.xpi`，拖进 `about:addons` 即永久安装
4. 重启浏览器扩展仍在，无需重装

### 方案 B：提交 AMO 签名（稳定版可用，需审核）
1. 注册 [addons.mozilla.org](https://addons.mozilla.org/developers/) 开发者账号，生成 API key/secret
2. `npx web-ext sign --api-key=XXX --api-secret=YYY` 生成签名版 xpi
3. 签名后的 xpi 可在火狐稳定版永久安装

### 方案 C：临时加载（关浏览器失效，仅调试用）
`about:debugging#/runtime/this-firefox` → 「加载临时附加组件」→ 选 `manifest.json`


## 技术原理
- `chrome.tabs.onCreated` + `chrome.webNavigation.onBeforeNavigate`：捕获新标签及其来源 `openerTabId`
- 关闭新标签，向源标签发送 `SIDEBAR_OPEN` 消息
- content script 注入侧边栏 DOM 与 iframe
- `declarativeNetRequest` 在 sub_frame 资源上移除阻止嵌套的响应头

## 说明 / 限制
- 部分站点即便去掉响应头仍会做 JS 层 `top != self` 自检导致跳白/重定向，属站点行为
- 下载、文件类 URL 无法在 iframe 中展示，会表现为空白
- 该插件作用于整个浏览器，但仅对可注入 content script 的页面生效

## 版本
见 [CHANGELOG.md](./CHANGELOG.md)
