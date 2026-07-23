# 开发文档：左右页面交换功能

> 创建日期：2026-07-23
> 版本目标：v0.1.29

## 一、问题

右侧侧边栏越点越深时，左边主标签页始终停在第一次打开的页面，无法跟随交互。
用户希望在右侧深挖到某页后，能把右侧当前页"扔"到左边主标签页继续操作，
左边原来的页扔到右侧侧边栏，可来回交换，实现左右两侧都能往深层交互。

## 二、功能目标

新增"左右交换"按钮：点击后
- 右侧侧边栏当前页 → 左边主标签页（导航过去）
- 左边主标签页原页面 → 右侧侧边栏（iframe 加载）
- 可反复点击，两侧页面互换，各自继续往下点

## 三、设计方案

### 3.1 通信流程

sidebar(content script) 收集：
- `sidebarUrl` = iframe.src（右侧当前页）
- `leftUrl` = location.href（左侧主标签当前页）

向 background 发 `SWAP` 消息：`{ type: "SWAP", sidebarUrl, leftUrl }`

background 收到后：
1. `chrome.tabs.update(tabId, { url: sidebarUrl })` 把主标签导航到右侧页
2. 等导航完成（`chrome.tabs.onUpdated` complete）
3. 注入 sidebar.js/css，发 `SIDEBAR_OPEN` 消息加载 leftUrl 到侧边栏
4. sidebar 收到 SIDEBAR_OPEN 后先 hide 当前侧边栏再 openUrl(leftUrl)

### 3.2 sender.tabId

content script 发消息时 `sender.tab.id` 即主标签 id，background 用它导航。

### 3.3 边界

- sidebarUrl 为空/about:blank 时不交换
- leftUrl 非 http(s) 时仍允许（导航到 sidebarUrl 后主标签就是正常页）
- 交换后侧边栏历史栈清空，只装 leftUrl 单页

## 四、实现步骤

1. `background.js`：新增 `chrome.runtime.onMessage` 处理 SWAP
2. `sidebar.js`：新增 `swapWithLeft()` 函数 + ⇄ 按钮
3. 更新 `manifest.json` 版本 → 0.1.29
4. 更新 `CHANGELOG.md` + 根 `VERSION.md`
5. 推送 GitHub
