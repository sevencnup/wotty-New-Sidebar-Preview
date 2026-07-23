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
