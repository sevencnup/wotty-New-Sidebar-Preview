# 开发文档

## 目标
做一个作用于整个浏览器（而非特定页面）的扩展，把所有"打开新标签页/新窗口"的跳转拦截下来，改为在当前页右侧滑出侧边栏显示目标页面。

## 开发步骤

### 1. 架构设计
- MV3 扩展，三层：
  - `background.js`（service worker）：拦截新标签
  - `sidebar.js`（content script）：注入侧边栏 DOM
  - `rules/frame_rules.json`（declarativeNetRequest）：解除 iframe 嵌入限制

### 2. 拦截策略
- 用 `chrome.tabs.onCreated` 捕获新标签，从 `tab.openerTabId` 得到来源标签
- 仅拦截有 `openerTabId` 的跳转（即由某页面触发），跳过用户手动开的新标签（Ctrl+T、+号）
- `onCreated` 时 url 可能仍为 `about:blank`，用 `webNavigation.onBeforeNavigate` 兜底等到真实 url 再处理
- 关闭新标签 → 向源标签发 `SIDEBAR_OPEN` 消息

### 3. 侧边栏注入
- content script 注入 `#si-sidebar-host`：顶栏（控件 + URL 显示）+ iframe
- 滑出用 `transform: translateX` + transition
- 关闭后保留一个 ◀ 展开按钮
- 历史栈在侧边栏内维护，后退/前进只切 iframe.src

### 4. iframe 嵌入限制
- 很多站点用 `X-Frame-Options: DENY/SAMEORIGIN` 或 CSP `frame-ancestors` 禁止被 iframe
- 用 `declarativeNetRequest` 在 `sub_frame` 资源上 remove 这些响应头
- 仍可能被站点 JS 层 `top != self` 自检拦截，属站点行为，非扩展问题

### 5. 通信
- background → content: `chrome.tabs.sendMessage` 发 `SIDEBAR_OPEN`
- 若源标签 content script 尚未注入，background 用 `chrome.scripting` 手动注入再发送

### 6. 已知限制
- `chrome://` / 扩展商店 / `about:` 等受保护页无法注入侧边栏
- 下载类 URL 无法在 iframe 显示
- 站点 JS 层反嵌套检测无法统一绕过

### 7. 后续可迭代
- 开关：临时关闭拦截
- 白名单：某些域名不拦截
- 侧边栏宽度可拖拽
- 多侧边栏堆叠（多个被拦截页面）
