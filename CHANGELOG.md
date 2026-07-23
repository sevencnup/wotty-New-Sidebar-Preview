## v0.1.32 - 2026-07-23
- 再次修复分界线箭头重叠：按钮各外移 24px，◀ 在分界线左侧、▶ 在分界线右侧，中间留 12px 间隙

## v0.1.31 - 2026-07-23
- 修复分界线左右箭头按钮重叠：◀ 放分界线左侧(left:-12px)，▶ 放分界线右侧(right:-12px)

## v0.1.30 - 2026-07-23
- 分界线(splitter)上新增左右箭头按钮：◀ 把右侧页扔到左边，▶ 把左侧页扔到右边
- 箭头是左右交换功能的可视化入口，点一下即互换两侧页面
- 点击箭头不触发拖拽，拖拽仍可正常调整宽度

## v0.1.29 - 2026-07-23
- 新增左右交换功能：侧边栏顶栏 ⇄ 按钮，右侧当前页与左侧主标签页互换
- 解决右侧越点越深、左侧始终停在第一页无法继续交互的问题
- 点 ⇄ 后：右侧页扔到左边主标签继续操作，左边原页扔到右侧侧边栏，可反复交换
- background 新增 SWAP 消息处理：导航主标签到右侧页，加载完后注入侧边栏加载左侧页

## v0.1.28 - 2026-07-23
- 新增 Firefox 永久安装说明(README)：Developer/Nightly/ESR 关签名校验装 xpi，或 AMO 签名装稳定版
- 打包 sidebar-interceptor-v0.1.27.xpi 安装包，拖进 about:addons 即永久安装

## v0.1.27 - 2026-07-23
- 新增火狐(Firefox)兼容：manifest 加 background.scripts + browser_specific_settings.gecko
- 修复关闭一次侧边栏后拦截失效、需重载扩展的 bug
- 根因：MV3 service worker 30秒空闲挂起，pending/handled 内存状态丢失
- 将 pending/handled 持久化到 chrome.storage.session，SW 挂起重启状态完整恢复

## v0.1.26 - 2026-07-23
- 新增全局默认快捷键功能：可修改全局默认关闭键，未单独设置快捷键的网站统一用全局默认
- 快捷键解析优先级：域名自定义 > 全局默认 > 硬编码 Esc
- 侧边栏顶栏新增 ⚙ 按钮：点击后录入按键设为全局默认(Esc=恢复默认Esc / Backspace=禁用)
- 原 ⌨ 按钮仍设置当前域名快捷键，单站点自定义优先于全局默认
- 全局默认禁用(false)时未单独设置的网站不能用快捷键关闭，只能点 ✕

## v0.1.25 - 2026-07-23
- 站点根路径不拦截：点 logo 回首页(xxx.com/ 或 xxx.com，/ 后无内容)照常在当前页打开
- / 后带内容的分页(xxx.com/xxx)才拦截进侧边栏
- 修复点左上角 logo 被误拦进侧边栏的问题
## v0.1.24 - 2026-07-23
- 明确快捷键优先级：设过自定义快捷键的网站，Esc 一律失效(主页与 iframe 内都不关侧边栏)
- 这些网站只能用设的自定义键关侧边栏，Esc 完全归网站
- 未设快捷键的网站仍用默认 Esc 关(冒泡阶段、网站优先)
## v0.1.23 - 2026-07-23
- 恢复默认 Esc 关闭侧边栏（之前过度修正为默认不响应）
- 默认 Esc 走冒泡阶段，让网站优先：网站用 Esc 关图片(defaultPrevented)时侧边栏不关，没冲突时 Esc 关侧边栏
- 冲突的网站仍可单独设自定义快捷键避开 Esc
- iframe 内不再绑 Esc，确保 iframe 网页的 Esc 归网站
## v0.1.22 - 2026-07-23
- 改善侧边栏内无法用自定义快捷键关闭：iframe load 后把焦点拉回主页
- 同域 iframe 尝试绑定自定义快捷键监听(跨域跳过)
- 说明：跨域 iframe 内按键受浏览器限制主页收不到，故优先靠拉回焦点解决
## v0.1.21 - 2026-07-23
- 彻底修复按 Esc 关图片时连带关侧边栏的问题
- 根因：rebuildFrame 给 iframe contentWindow 绑了无条件 ESC 监听，抢先 preventDefault+hide
- 删除该 iframe 内 ESC 监听，Esc 完全归网站(关图片等)
- 读取存储时过滤掉误存的 Esc 快捷键，Esc 不作关侧边栏键
- 未设快捷键时 Esc 不响应，只能点 ✕ 或自定义快捷键关
## v0.1.20 - 2026-07-23
- 彻底解决 Esc 与网站冲突：默认不再用 Esc 关闭侧边栏
- 默认只能点 ✕ 关闭，或按 ⌨ 设置自定义快捷键(如 Alt+W)关闭
- 网站 Esc 归网站(关图片等)，绝不连带关侧边栏
- 自定义快捷键仍尊重网站：网站已 defaultPrevented 该键则不关
- 需 Esc 关闭的站点可单独把 Esc 设为该站快捷键
## v0.1.19 - 2026-07-23
- 修复 Esc 与网站关图片冲突：网站用 Esc 关图片时不再连带关侧边栏
- 默认 Esc 改为冒泡阶段监听，并检查 defaultPrevented：网站已消费 Esc 就不关侧边栏
- 自定义快捷键同样尊重网站：若网站消费了该键则不关
- 禁用快捷键(false)完全不响应
## v0.1.18 - 2026-07-23
- 修复设了自定义快捷键后 Esc 仍会误关侧边栏的竞态 bug
- 根因：快捷键异步从 chrome.storage 读取，完成前 closeShortcut 为 null 走默认 Esc 分支
- 改为 localStorage 同步缓存优先读，注入即拿到正确设置
- 加 shortcutLoaded 守卫：读取完成前任何快捷键都不响应，彻底消除竞态
- 设置/清除/禁用时同步写 localStorage 与 chrome.storage 两份
## v0.1.17 - 2026-07-23
- 快捷键设置加入彻底禁用入口：点⌨后按 Backspace/Delete 禁用快捷键关闭
- Esc 仍为恢复默认 Esc 关闭
- 设置提示语明确三种操作，时长延至 1.6s
- 修复不能删除已设快捷键的问题
## v0.1.16 - 2026-07-23
- 新增自定义关闭快捷键功能，解决与网站 ESC 冲突
- 侧边栏顶栏新增 ⌨ 按钮：点按后录入任意快捷键组合作为关闭键
- 按域名独立保存快捷键；按 Esc 则清除自定义、恢复默认 Esc 关闭
- ESC 被网站占用的站点可单独设其它键(如 Alt+W)专关侧边栏，互不冲突
## v0.1.15 - 2026-07-23
- 新增来源页不可拦截识别：来源标签非 http(s) 页面(如 chrome://、about:、扩展页)则跳过拦截
- 新增目标 URL 校验：非 http(s) 目标不拦截，避免 javascript:/data: 等被误拦
- 受保护来源页点链接会正常打开新标签，不再尝试注入导致闪烁失败
## v0.1.14 - 2026-07-23
- 修复点链接"闪烁一下永远打不开"的严重问题
- 根因：先关闭新标签再发消息开侧边栏，若消息/注入失败链接就丢失了
- 改为：先确认侧边栏成功打开才关闭新标签，失败则保留新标签正常导航
- 加 handled 去重，避免 onCreated 与 onBeforeNavigate 重复处理同一新标签
- openInSidebar 发消息失败会自动注入 content script 再重试
## v0.1.13 - 2026-07-23
- 修复鼠标焦点在侧边栏 iframe 内时按 ESC 无法关闭的问题
- iframe load 后把焦点拉回外层主页，确保外层 keydown 监听能收到 ESC
- 同域 iframe 尝试在其 contentWindow 上也监听 ESC(跨域被安全限制跳过)
## v0.1.12 - 2026-07-23
- 修复打开侧边栏时"先到中间宽度再缩回设置宽度"的闪动
- 根因：ensureHost 用 CSS 默认 45vw 先显示，异步 loadWidth 再覆盖
- 改为 openUrl 中先 await loadWidth 宽度就绪再 show
- 侧边栏出场动画改为淡入(不滑动)，iframe 加载完再显示内容，减少白屏闪现
## v0.1.11 - 2026-07-23
- 调整滚动隔离策略：去掉打开时锁定主页 overflow，恢复主页可正常滚动
- iframe 为独立文档，鼠标在哪边滚哪边，天然独立
- 保留 overscroll-behavior:contain 和 wheel 冒泡阻止，防止侧边栏滚到底穿透到主页
## v0.1.10 - 2026-07-23
- 修复侧边栏滚动条控制主页滚动的问题
- 删除 #si-sidebar-host 误留的 all: revert，避免布局被重置
- 侧边栏打开时锁定主页滚动(overflow:hidden)，关闭时恢复
- host 加 overscroll-behavior:contain 防止滚动穿透
- 捕获阶段阻止侧边栏内 wheel 事件冒泡到主页
## v0.1.9 - 2026-07-23
- 侧边栏宽度改为按域名独立保存
- 存储 key 改为 "si-sidebar-width@<域名>"，每个网站各自记忆宽度
- 切换网站时自动恢复该站上次宽度，互不影响
## v0.1.8 - 2026-07-23
- 新增按 ESC 关闭侧边栏
- 捕获阶段监听 keydown，ESC 时触发淡出销毁
## v0.1.7 - 2026-07-23
- 关闭动画改为原地淡出消失，不再向右滑动收回
- hide 时不再移除 si-open，避免触发右滑过渡
- CSS 调整 .si-fadeout 优先级，强制 transform:none + opacity 渐降
## v0.1.6 - 2026-07-23
- 关闭改为淡出销毁：不再滑回右侧、不再保留展开按钮
- 点击✕后侧边栏向右淡出+透明度渐降，260ms 后从 DOM 移除并清空状态
- 下次打开重新构建侧边栏
## v0.1.5 - 2026-07-23
- 修复拖拽松开后仍跟随鼠标移动：iframe 吞掉 mouseup 导致监听未移除
- mousemove/mouseup 改挂 window 捕获阶段，拖拽时禁用 iframe pointer-events
- 防止 splitter 重复绑定事件
## v0.1.4 - 2026-07-23
- 修复拖拽无法改变宽度：CSS 中 width/max-width/min-width 的 !important 覆盖了 JS 设的 inline 宽度
- 去掉这三处 !important，JS 改用 setProperty(...,important) 接管宽度
- splitter 移到 host 内左缘(6px)并提高层级，拖拽时高亮反馈
- 加 e.stopPropagation 防止拖拽误触发链接拦截
## v0.1.3 - 2026-07-23
- 侧边栏支持自定义宽度：左侧拖拽条拖动调整，参考 liunxdo 插件实现
- 宽度持久化改用 chrome.storage.local，跨所有域名全局永久保存
- 宽度限制：最小 280px，最大 92% 视窗宽度
- 窗口 resize 时自动约束宽度不越界
## v0.1.2 - 2026-07-23
- 修复打开新页面时旧页面残留/缓存闪现问题
- openUrl/后退/前进/刷新改为每次销毁重建 iframe，彻底清除旧页面状态(bfcache)
- 历史栈数组保持不变，导航不受影响
## v0.1.1 - 2026-07-23
- 新增同标签页链接点击拦截：左键点击普通 <a> 链接改为侧边栏打开，保留当前页
- 自动跳过：已阻止默认事件、非左键、带修饰键(Ctrl/Shift/Meta/Alt)、target=_blank/new、纯页内锚点(#hash)、非 http(s) 协议
- 新标签跳转拦截(background)保持不变
- 注意：JS 主动 location.href= 跳转属浏览器扩展不可拦截项，不做强行回拉以免破坏原页面状态
# 更新版本记录

## v0.1.0 - 2026-07-23
- 初始版本
- 实现核心拦截：监听 `chrome.tabs.onCreated` 与 `chrome.webNavigation.onBeforeNavigate`，识别带 `openerTabId` 的新标签跳转
- 关闭新标签并向源标签注入侧边栏 iframe 加载目标 URL
- 通过 `declarativeNetRequest` 移除 `X-Frame-Options` / `Content-Security-Policy` 等响应头，允许 iframe 嵌入
- 侧边栏 UI：滑出动画、后退/前进/刷新/新标签打开/关闭，以及关闭态的展开按钮
- content script 与 background 通过 `SIDEBAR_OPEN` 消息通信，未注入时自动补注入
