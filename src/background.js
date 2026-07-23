// Sidebar Interceptor - background service worker / 事件页
// 拦截新标签/新窗口跳转，改在源标签右侧侧边栏加载
// MV3 service worker 会挂起，内存状态不保；用 chrome.storage.session 持久化 pending/handled

const PENDING_KEY = "si-pending";
const HANDLED_KEY = "si-handled";
// 记录待处理的新标签：tabId -> { openerTabId }
const pending = new Map();
// 已处理过的新标签，避免 onBeforeNavigate 与 onCreated 重复处理
const handled = new Set();
let stateReady = false;

// 启动时从 session 恢复状态（SW 挂起重启不丢）
(async () => {
  try {
    const r = await chrome.storage.session.get([PENDING_KEY, HANDLED_KEY]);
    if (r[PENDING_KEY] && typeof r[PENDING_KEY] === "object") {
      for (const [k, v] of Object.entries(r[PENDING_KEY])) pending.set(Number(k), v);
    }
    if (Array.isArray(r[HANDLED_KEY])) {
      for (const id of r[HANDLED_KEY]) handled.add(id);
    }
  } catch (_) {}
  stateReady = true;
})();

function persistPending() {
  try {
    const obj = {};
    for (const [k, v] of pending) obj[k] = v;
    chrome.storage.session.set({ [PENDING_KEY]: obj });
  } catch (_) {}
}
function persistHandled() {
  try { chrome.storage.session.set({ [HANDLED_KEY]: Array.from(handled) }); } catch (_) {}
}

const BLANK = /^(about:blank|about:newtab|chrome:\/\/.*|edge:\/\/.*|chrome-extension:\/\/.*|edge-extension:\/\/.*)$/i;

function isBlank(url) {
  return !url || BLANK.test(url);
}

// 来源标签必须是可注入 content script 的普通 http(s) 页面，否则跳过拦截
async function isInterceptableTab(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab) return false;
    if (tab.id === chrome.tabs.TAB_ID_NONE) return false;
    const u = tab.url || "";
    return /^https?:///i.test(u);
  } catch (_) { return false; }
}

chrome.tabs.onCreated.addListener((tab) => {
  const url = tab.pendingUrl || tab.url || "";
  if (isBlank(url)) {
    if (tab.id != null) pending.set(tab.id, { openerTabId: tab.openerTabId });
    persistPending();
    return;
  }
  if (handled.has(tab.id)) return;
  handled.add(tab.id);
  persistHandled();
  tryIntercept(tab.id, tab.openerTabId, url);
});

chrome.webNavigation.onBeforeNavigate.addListener((d) => {
  if (d.frameId !== 0) return;
  const p = pending.get(d.tabId);
  if (!p) return;
  if (isBlank(d.url)) return;
  if (handled.has(d.tabId)) return;
  handled.add(d.tabId);
  pending.delete(d.tabId);
  persistHandled();
  chrome.tabs.get(d.tabId, (tab) => {
    persistPending();
    const opener = (tab && tab.openerTabId != null) ? tab.openerTabId : p.openerTabId;
    tryIntercept(d.tabId, opener, d.url);
  });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  pending.delete(tabId);
  handled.delete(tabId);
  persistPending();
  persistHandled();
});

// 先尝试在源标签开侧边栏，成功后才关闭新标签；失败则保留新标签正常导航
async function tryIntercept(tabId, openerTabId, url) {
  if (openerTabId == null) return; // 无来源，不拦截
  if (isBlank(url)) return;
  // 目标必须是普通网页，非 http(s) 不拦截
  if (!/^https?:\/\//i.test(url)) return;
  // 来源页不是可拦截的普通网页(如 chrome://、about:、扩展页)，跳过，正常打开新标签
  if (!(await isInterceptableTab(openerTabId))) return;
  const ok = await openInSidebar(openerTabId, url);
  if (ok) {
    try { await chrome.tabs.remove(tabId); } catch (e) {}
  }
  // 失败则不关新标签，让它正常加载，避免链接丢失
}

async function openInSidebar(tabId, url) {
  // 先尝试直接发消息（content script 可能已注入）
  try {
    const resp = await chrome.tabs.sendMessage(tabId, { type: "SIDEBAR_OPEN", url });
    if (resp && resp.ok) return true;
  } catch (e) {}
  // content script 尚未注入，手动注入再发
  try {
    await chrome.scripting.insertCSS({ target: { tabId }, files: ["src/sidebar.css"] });
    await chrome.scripting.executeScript({ target: { tabId }, files: ["src/sidebar.js"] });
    const resp = await chrome.tabs.sendMessage(tabId, { type: "SIDEBAR_OPEN", url });
    if (resp && resp.ok) return true;
  } catch (e) {}
  return false;
}
