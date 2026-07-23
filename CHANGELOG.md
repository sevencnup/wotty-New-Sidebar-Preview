# 更新版本记录

## v0.1.0 - 2026-07-23
- 初始版本
- 实现核心拦截：监听 `chrome.tabs.onCreated` 与 `chrome.webNavigation.onBeforeNavigate`，识别带 `openerTabId` 的新标签跳转
- 关闭新标签并向源标签注入侧边栏 iframe 加载目标 URL
- 通过 `declarativeNetRequest` 移除 `X-Frame-Options` / `Content-Security-Policy` 等响应头，允许 iframe 嵌入
- 侧边栏 UI：滑出动画、后退/前进/刷新/新标签打开/关闭，以及关闭态的展开按钮
- content script 与 background 通过 `SIDEBAR_OPEN` 消息通信，未注入时自动补注入
