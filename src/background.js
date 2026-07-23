// Sidebar Interceptor - background service worker
// 拦截新标签/新窗口跳转，改在源标签右侧侧边栏加载

// 记录待处理的新标签：tabId -> { openerTabId }
const pending = new Map();

const BLANK = /^(about:blank|about:newtab|chrome:\/\/.*|edge:\/\/.*|chrome-extension:\/\/.*|edge-extension:\/\/.*)$/i;

function isBlank(url) {
  return !url || BLANK.test(url);
}

// 用户主动开的新标签（点+号、Ctrl+T、从其它扩展打开）没有 openerTabId，
// 因此只有存在 openerTabId 的跳转才视为"由当前页触发"并拦截。
chrome.tabs.onCreated.addListener(async (tab) => {
  const url = tab.pendingUrl || tab.url || "";
  if (isBlank(url)) {
    // 暂存，等待首次真实导航
    if (tab.openerTabId != null || tab.id != null) {
      pending.set(tab.id, { openerTabId: tab.openerTabId });
    }
    return;
  }
  await tryIntercept(tab.id, tab.openerTabId, url);
});

// 兜底：onCreated 时 url 还是 about:blank 的情况
chrome.webNavigation.onBeforeNavigate.addListener((d) => {
  if (d.frameId !== 0) return;
  const p = pending.get(d.tabId);
  if (!p) return;
  if (isBlank(d.url)) return; // 继续等待真实导航
  pending.delete(d.tabId);
  chrome.tabs.get(d.tabId, async (tab) => {
    const opener = (tab && tab.openerTabId != null) ? tab.openerTabId : p.openerTabId;
    await tryIntercept(d.tabId, opener, d.url);
  });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  pending.delete(tabId);
});

async function tryIntercept(tabId, openerTabId, url) {
  if (openerTabId == null) return; // 无来源，不拦截
  if (isBlank(url)) return;
  // 关闭刚创建的新标签
  try {
    await chrome.tabs.remove(tabId);
  } catch (e) {
    // 可能已被关闭
  }
  // 通知源标签显示侧边栏
  await openInSidebar(openerTabId, url);
}

async function openInSidebar(tabId, url) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: "SIDEBAR_OPEN", url });
    return;
  } catch (e) {
    // content script 可能尚未注入（如页面先于扩展加载），手动注入
  }
  try {
    await chrome.scripting.insertCSS({ target: { tabId }, files: ["src/sidebar.css"] });
    await chrome.scripting.executeScript({ target: { tabId }, files: ["src/sidebar.js"] });
    await chrome.tabs.sendMessage(tabId, { type: "SIDEBAR_OPEN", url });
  } catch (e) {
    // 源标签为受保护页面（chrome://、应用商店等），无法注入，跳过
  }
}
