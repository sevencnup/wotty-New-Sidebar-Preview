// Sidebar Interceptor - content script
// 在当前页注入右侧滑出侧边栏，用 iframe 加载被拦截的目标 URL

(() => {
  if (window.__SIDEBAR_INTERCEPTOR__) return;
  window.__SIDEBAR_INTERCEPTOR__ = true;

  const HOST_ID = "si-sidebar-host";
  let host = null;
  let frame = null;
  let openerBtn = null;
  let history = [];
  let historyIndex = -1;

  function ensureHost() {
    if (host && document.getElementById(HOST_ID)) return host;
    host = document.createElement("div");
    host.id = HOST_ID;

    const bar = document.createElement("div");
    bar.className = "si-bar";

    // 控件
    const back = mkBtn("←", "后退", backHistory);
    const fwd = mkBtn("→", "前进", fwdHistory);
    const reload = mkBtn("⟳", "刷新", () => { if (frame) frame.src = frame.src; });
    const openBtn = mkBtn("⤢", "在新标签打开", () => { if (frame && frame.src) window.open(frame.src, "_blank"); });
    const close = mkBtn("✕", "关闭", hide);

    const urlBox = document.createElement("input");
    urlBox.className = "si-url";
    urlBox.type = "text";
    urlBox.readOnly = true;
    urlBox.placeholder = "目标页面地址";

    const title = document.createElement("span");
    title.className = "si-title";
    title.textContent = "侧边栏";

    bar.append(title, back, fwd, reload, urlBox, openBtn, close);
    host.append(bar);

    frame = document.createElement("iframe");
    frame.className = "si-frame";
    frame.setAttribute("allow", "clipboard-read; clipboard-write; popup; fullscreen");
    host.append(frame);

    openerBtn = document.createElement("button");
    openerBtn.className = "si-opener";
    openerBtn.textContent = "◀";
    openerBtn.title = "展开侧边栏";
    openerBtn.addEventListener("click", () => {
      if (frame.src) show();
      else openerBtn.classList.remove("si-visible");
    });
    host.append(openerBtn);

    document.documentElement.appendChild(host);
    return host;
  }

  function mkBtn(glyph, title, onClick) {
    const b = document.createElement("button");
    b.className = "si-btn";
    b.textContent = glyph;
    b.title = title;
    b.addEventListener("click", onClick);
    return b;
  }

  function openUrl(url) {
    ensureHost();
    history = history.slice(0, historyIndex + 1);
    history.push(url);
    historyIndex = history.length - 1;
    frame.src = url;
    const urlBox = host.querySelector(".si-url");
    if (urlBox) urlBox.value = url;
    show();
  }

  function show() {
    ensureHost();
    host.classList.add("si-open");
    openerBtn.classList.remove("si-visible");
  }

  function hide() {
    ensureHost();
    host.classList.remove("si-open");
    if (frame && frame.src) openerBtn.classList.add("si-visible");
  }

  function backHistory() {
    if (historyIndex <= 0) return;
    historyIndex--;
    frame.src = history[historyIndex];
    const urlBox = host.querySelector(".si-url");
    if (urlBox) urlBox.value = history[historyIndex];
  }

  function fwdHistory() {
    if (historyIndex >= history.length - 1) return;
    historyIndex++;
    frame.src = history[historyIndex];
    const urlBox = host.querySelector(".si-url");
    if (urlBox) urlBox.value = history[historyIndex];
  }

  // 拦截 iframe 内部打开的新窗口(部分站点用 window.open / target=_blank)
  // 顶层页面通过 chrome.tabs.onCreated 拦截，这里补强 iframe 内跳转
  window.addEventListener("message", (e) => {
    if (e.data && e.data.__si_open === true && e.data.url) {
      openUrl(e.data.url);
    }
  });

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.type === "SIDEBAR_OPEN" && msg.url) {
      openUrl(msg.url);
      sendResponse && sendResponse({ ok: true });
    }
    return true;
  });
})();
