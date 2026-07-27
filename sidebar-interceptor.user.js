// ==UserScript==
// @name         Sidebar Interceptor - 侧边栏预览
// @namespace    https://github.com/sevencnup/sidebar-interceptor
// @version      0.2.2
// @description  拦截页面内新标签跳转，改为右侧滑出侧边栏预览。轻量油猴版，无需安装扩展。
// @author       sevencnup
// @match        *://*/*
// @grant        unsafeWindow
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_openInTab
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @run-at       document-start
// @noframes
// ==/UserScript==

(() => {
  if (window.__SI_USERSCRIPT__) return;
  window.__SI_USERSCRIPT__ = true;

  // ===== 存储 =====
  const SITES_KEY = "si-sites";
  const WIDTH_PREFIX = "si-w@";
  const SHORTCUT_PREFIX = "si-sk@";

  function getSites() {
    try { return new Set(JSON.parse(GM_getValue(SITES_KEY, "[]"))); } catch (_) { return new Set(); }
  }
  function saveSites(sites) {
    GM_setValue(SITES_KEY, JSON.stringify([...sites]));
  }
  function siteEnabled() {
    return getSites().has(location.hostname);
  }
  function toggleSite() {
    const sites = getSites();
    if (sites.has(location.hostname)) sites.delete(location.hostname);
    else sites.add(location.hostname);
    saveSites(sites);
    return sites.has(location.hostname);
  }

  // ===== 快捷键存储 =====
  const skKey = SHORTCUT_PREFIX + location.hostname;
  const gskKey = SHORTCUT_PREFIX + "@__global__";
  let domainShortcut = GM_getValue(skKey, undefined);
  let globalShortcut = GM_getValue(gskKey, undefined);
  let shortcutReady = true;

  function effectiveShortcut() {
    if (domainShortcut !== undefined) return domainShortcut;
    if (globalShortcut !== undefined) return globalShortcut;
    return null; // 默认 Esc
  }

  function matchShortcut(e) {
    const sc = effectiveShortcut();
    if (sc === false) return false;
    if (!sc || typeof sc !== "object") return false;
    const keyOk = sc.key && sc.key.toLowerCase() === e.key.toLowerCase();
    return keyOk && !!sc.ctrl === e.ctrlKey && !!sc.alt === e.altKey && !!sc.shift === e.shiftKey && !!sc.meta === e.metaKey;
  }

  // ===== CSS =====
  GM_addStyle(`
#si-userscript-host {
  position: fixed !important; top: 0 !important; right: 0 !important;
  height: 100vh !important; width: 45vw; max-width: 92vw; min-width: 280px;
  z-index: 2147483647 !important;
  display: flex !important; flex-direction: column !important;
  opacity: 0 !important; transform: translateX(20px) !important;
  transition: opacity 0.2s ease-out, transform 0.2s ease-out !important;
  box-shadow: -8px 0 28px rgba(0,0,0,0.28) !important;
  background: #fff !important;
  font-family: -apple-system,Segoe UI,Roboto,sans-serif !important;
  color: #222 !important;
  pointer-events: auto !important;
}
#si-userscript-host.si-open { opacity: 1 !important; transform: translateX(0) !important; }
#si-userscript-host.si-fadeout {
  opacity: 0 !important; transform: none !important;
  transition: opacity 0.26s ease-in !important; pointer-events: none !important;
}
#si-userscript-host .si-bar {
  display: flex !important; align-items: center !important; gap: 5px !important;
  padding: 8px 10px !important; background: #f5f5f7 !important;
  border-bottom: 1px solid #e3e3e6 !important; height: 44px !important; flex: 0 0 auto !important;
}
#si-userscript-host .si-title {
  font-size: 13px !important; font-weight: 600 !important; color: #333 !important;
  margin-right: 4px !important; white-space: nowrap !important;
}
#si-userscript-host .si-btn {
  min-width: 30px !important; height: 28px !important; padding: 0 8px !important;
  border: 1px solid #d8d8dd !important; border-radius: 6px !important;
  background: #fff !important; cursor: pointer !important;
  font-size: 13px !important; color: #333 !important; transition: background 0.15s !important;
}
#si-userscript-host .si-btn:hover { background: #ececf0 !important; }
#si-userscript-host .si-btn.si-active { background: #dde !important; border-color: #88a !important; }
#si-userscript-host .si-url {
  flex: 1 1 auto !important; min-width: 60px !important; height: 28px !important;
  border: 1px solid #d8d8dd !important; border-radius: 6px !important; padding: 0 8px !important;
  font-size: 12px !important; color: #555 !important; background: #fff !important;
}
#si-userscript-host .si-frame {
  flex: 1 1 auto !important; border: none !important; width: 100% !important; background: #fff !important;
}
#si-userscript-host .si-splitter {
  position: absolute !important; left: 0 !important; top: 0 !important;
  width: 6px !important; height: 100% !important; cursor: col-resize !important;
  background: rgba(120,130,150,0.25) !important; z-index: 10 !important;
}
#si-userscript-host .si-splitter:hover,
#si-userscript-host .si-splitter.si-dragging { background: rgba(70,90,220,0.6) !important; }
#si-userscript-host .si-opener {
  position: fixed !important; top: 50% !important; right: 0 !important;
  transform: translateY(-50%) !important;
  width: 22px !important; height: 64px !important;
  border: 1px solid #d8d8dd !important; border-right: none !important;
  border-radius: 8px 0 0 8px !important; background: #fff !important;
  box-shadow: -4px 0 10px rgba(0,0,0,0.15) !important;
  cursor: pointer !important; font-size: 13px !important; color: #555 !important;
  display: none !important; z-index: 2147483646 !important;
}
#si-userscript-host .si-opener.si-visible { display: flex !important; align-items: center !important; justify-content: center !important; }
#si-userscript-host .si-fallback {
  position: absolute !important; inset: 44px 0 0 0 !important; display: none !important;
  flex-direction: column !important; align-items: center !important; justify-content: center !important;
  gap: 14px !important; background: #f7f8fa !important; text-align: center !important;
  padding: 24px !important; z-index: 20 !important;
}
#si-userscript-host .si-fallback-tip {
  font-size: 13px !important; color: #555 !important; line-height: 1.6 !important; max-width: 320px !important;
}
#si-userscript-host .si-fallback-btn {
  padding: 8px 18px !important; border: 1px solid #22a06b !important;
  border-radius: 6px !important; background: #22a06b !important;
  color: #fff !important; font-size: 13px !important; cursor: pointer !important;
}
#si-userscript-host .si-fallback-btn:hover { background: #1c8c5c !important; }

/* 设置面板 */
#si-panel-overlay {
  position: fixed !important; inset: 0 !important; z-index: 2147483645 !important;
  background: rgba(0,0,0,0.35) !important; display: none !important;
  align-items: center !important; justify-content: center !important;
}
#si-panel-overlay.show { display: flex !important; }
#si-panel {
  width: 290px !important; max-height: 80vh !important;
  background: #fff !important; border-radius: 12px !important;
  box-shadow: 0 8px 32px rgba(0,0,0,0.22) !important;
  font-family: -apple-system,Segoe UI,Roboto,sans-serif !important;
  font-size: 13px !important; color: #222 !important;
  overflow: hidden !important; display: flex !important; flex-direction: column !important;
}
#si-panel .sp-header {
  display: flex !important; align-items: baseline !important; justify-content: space-between !important;
  padding: 14px 16px 10px !important;
}
#si-panel .sp-title { font-weight: 600 !important; font-size: 15px !important; }
#si-panel .sp-ver { color: #999 !important; font-size: 11px !important; }
#si-panel .sp-ver a { color: #999 !important; text-decoration: none !important; }
#si-panel .sp-row {
  display: flex !important; align-items: center !important; justify-content: space-between !important;
  padding: 10px 16px !important; border: 1px solid #e3e3e6 !important;
  border-radius: 8px !important; margin: 0 12px !important; background: #f7f8fa !important;
}
#si-panel .sp-row .info { min-width: 0 !important; }
#si-panel .sp-row .label { color: #888 !important; font-size: 11px !important; margin-bottom: 2px !important; }
#si-panel .sp-row .host { font-weight: 600 !important; word-break: break-all !important; }
#si-panel .sp-section { padding: 12px 16px !important; flex: 1 1 auto !important; overflow-y: auto !important; }
#si-panel .sp-section .label { color: #888 !important; font-size: 11px !important; margin-bottom: 6px !important; }
#si-panel .sp-list { list-style: none !important; margin: 0 !important; padding: 0 !important; }
#si-panel .sp-list li {
  display: flex !important; align-items: center !important; justify-content: space-between !important;
  padding: 6px 8px !important; border-bottom: 1px solid #f0f0f2 !important;
}
#si-panel .sp-list li .h { word-break: break-all !important; flex: 1 1 auto !important; min-width: 0 !important; }
#si-panel .sp-list li .del { color: #d33 !important; cursor: pointer !important; font-size: 16px !important; line-height: 1 !important; padding: 0 4px !important; flex: 0 0 auto !important; }
#si-panel .sp-list li .del:hover { color: #a00 !important; }
#si-panel .sp-empty { color: #aaa !important; font-size: 12px !important; padding: 8px 0 !important; }
#si-panel .sp-actions { padding: 10px 16px !important; border-top: 1px solid #f0f0f2 !important; text-align: center !important; }
#si-panel .sp-close-btn {
  padding: 6px 24px !important; border: 1px solid #ddd !important; border-radius: 6px !important;
  background: #fff !important; cursor: pointer !important; font-size: 13px !important; color: #555 !important;
}
#si-panel .sp-close-btn:hover { background: #f5f5f5 !important; }

/* toggle switch */
#si-panel .sp-switch { position: relative !important; display: inline-block !important; width: 40px !important; height: 22px !important; flex: 0 0 auto !important; }
#si-panel .sp-switch input { opacity: 0 !important; width: 0 !important; height: 0 !important; }
#si-panel .sp-slider { position: absolute !important; cursor: pointer !important; inset: 0 !important; background: #ccc !important; border-radius: 22px !important; transition: .2s !important; }
#si-panel .sp-slider:before { content: "" !important; position: absolute !important; height: 16px !important; width: 16px !important; left: 3px !important; top: 3px !important; background: #fff !important; border-radius: 50% !important; transition: .2s !important; }
#si-panel input:checked + .sp-slider { background: #22a06b !important; }
#si-panel input:checked + .sp-slider:before { transform: translateX(18px) !important; }

/* 悬浮按钮 */
#si-userscript-toggle {
  position: fixed !important; bottom: 12px !important; right: 12px !important;
  width: 36px !important; height: 36px !important;
  border-radius: 50% !important; border: none !important;
  background: rgba(34,160,107,0.85) !important;
  color: #fff !important; font-size: 18px !important; line-height: 36px !important;
  text-align: center !important; cursor: pointer !important;
  z-index: 2147483644 !important; user-select: none !important;
  box-shadow: 0 2px 10px rgba(0,0,0,0.25) !important;
  transition: background 0.2s, transform 0.15s !important;
}
#si-userscript-toggle:hover { transform: scale(1.1) !important; }
#si-userscript-toggle.off { background: rgba(0,0,0,0.45) !important; }
  `);

  // ===== DOM =====
  const HOST_ID = "si-userscript-host";
  let host = null, frame = null, openerBtn = null;
  let history = [], historyIndex = -1;

  function ensureHost() {
    if (host && document.getElementById(HOST_ID)) return host;
    host = document.createElement("div");
    host.id = HOST_ID;

    const bar = document.createElement("div");
    bar.className = "si-bar";

    const back = mkBtn("←", "后退", backHistory);
    const fwd = mkBtn("→", "前进", fwdHistory);
    const reload = mkBtn("⟳", "刷新", () => { if (frame && frame.src) rebuildFrame(frame.src); });
    const openBtn = mkBtn("⤢", "在新标签打开", () => { if (frame && frame.src) GM_openInTab(frame.src, { active: true }); });
    const close = mkBtn("✕", "关闭", hide);

    const urlBox = document.createElement("input");
    urlBox.className = "si-url";
    urlBox.type = "text";
    urlBox.readOnly = true;
    urlBox.placeholder = "目标页面地址";

    const title = document.createElement("span");
    title.className = "si-title";
    title.textContent = "侧边栏";

    const splitter = document.createElement("div");
    splitter.className = "si-splitter";
    splitter.title = "拖拽调整宽度";

    const shortcutBtn = mkBtn("⌨", "设置关闭快捷键", setShortcut);
    const globalBtn = mkBtn("⚙", "设置全局默认快捷键", setGlobalShortcut);

    bar.append(title, back, fwd, reload, urlBox, openBtn, shortcutBtn, globalBtn, close);
    host.append(bar);
    host.append(splitter);

    frame = document.createElement("iframe");
    frame.className = "si-frame";
    frame.setAttribute("allow", "clipboard-read; clipboard-write; popup; fullscreen");
    host.append(frame);

    openerBtn = document.createElement("button");
    openerBtn.className = "si-opener";
    openerBtn.textContent = "◀";
    openerBtn.title = "展开侧边栏";
    openerBtn.addEventListener("click", () => {
      if (frame && frame.src && !/^about:blank$/i.test(frame.src)) show();
      else openerBtn.classList.remove("si-visible");
    });
    host.append(openerBtn);

    document.documentElement.appendChild(host);

    initResize();
    loadWidth();
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

  // ===== 可拖拽宽度 =====
  const MIN_W = 280;
  const MAX_W_RATIO = 0.92;
  function widthKey() { return WIDTH_PREFIX + location.hostname; }
  function maxW() { return Math.round(window.innerWidth * MAX_W_RATIO); }
  function clampW(w) { return Math.min(Math.max(w, MIN_W), maxW()); }
  function applyW(w) {
    ensureHost();
    host.style.setProperty("width", w + "px", "important");
  }
  function loadWidth() {
    let w = parseFloat(GM_getValue(widthKey(), ""));
    if (!Number.isFinite(w) || w < MIN_W || w > maxW()) w = Math.round(window.innerWidth * 0.45);
    applyW(clampW(w));
  }
  function persistWidth() {
    const w = parseFloat(getComputedStyle(host).width);
    if (Number.isFinite(w)) GM_setValue(widthKey(), Math.round(w));
  }
  function initResize() {
    ensureHost();
    let startX = 0, startW = 0;
    const splitter = host.querySelector(".si-splitter");
    if (splitter.__siBound) return;
    splitter.__siBound = true;
    splitter.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      splitter.classList.add("si-dragging");
      startX = e.clientX;
      startW = parseFloat(getComputedStyle(host).width) || host.offsetWidth;
      document.body.style.userSelect = "none";
      if (frame) frame.style.pointerEvents = "none";
      window.addEventListener("mousemove", onMove, true);
      window.addEventListener("mouseup", onUp, true);
    });
    function onMove(e) { applyW(clampW(startW - (e.clientX - startX))); }
    function onUp() {
      splitter.classList.remove("si-dragging");
      document.body.style.userSelect = "";
      if (frame) frame.style.pointerEvents = "";
      window.removeEventListener("mousemove", onMove, true);
      window.removeEventListener("mouseup", onUp, true);
      persistWidth();
    }
  }
  window.addEventListener("resize", () => { if (host) applyW(clampW(parseFloat(getComputedStyle(host).width))); });

  // ===== 快捷键设置 =====
  function setShortcut() {
    ensureHost();
    const urlBox = host.querySelector(".si-url");
    const oldVal = urlBox.value;
    urlBox.value = "按快捷键=设置本站 / Esc=恢复默认 / Backspace=禁用";
    const onKey = (e) => {
      e.preventDefault();
      e.stopPropagation();
      document.removeEventListener("keydown", onKey, true);
      if (e.key === "Backspace" || e.key === "Delete") {
        domainShortcut = false;
        GM_setValue(skKey, false);
        urlBox.value = "已禁用本站快捷键关闭";
      } else if (e.key === "Escape") {
        domainShortcut = undefined;
        GM_deleteValue(skKey);
        urlBox.value = "已恢复：跟随全局默认";
      } else {
        domainShortcut = { key: e.key, ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey, meta: e.metaKey };
        GM_setValue(skKey, domainShortcut);
        const parts = [];
        if (e.ctrlKey) parts.push("Ctrl");
        if (e.altKey) parts.push("Alt");
        if (e.shiftKey) parts.push("Shift");
        if (e.metaKey) parts.push("Meta");
        parts.push(e.key.toUpperCase());
        urlBox.value = "已设置本站：" + parts.join("+") + " 关闭";
      }
      setTimeout(() => { urlBox.value = oldVal; }, 1600);
    };
    document.addEventListener("keydown", onKey, true);
  }

  function setGlobalShortcut() {
    ensureHost();
    const urlBox = host.querySelector(".si-url");
    const oldVal = urlBox.value;
    urlBox.value = "[全局] 按键=设默认 / Esc=默认Esc / Backspace=默认禁用";
    const onKey = (e) => {
      e.preventDefault();
      e.stopPropagation();
      document.removeEventListener("keydown", onKey, true);
      if (e.key === "Backspace" || e.key === "Delete") {
        globalShortcut = false;
        GM_setValue(gskKey, false);
        urlBox.value = "已禁用全局默认快捷键";
      } else if (e.key === "Escape") {
        globalShortcut = null;
        GM_setValue(gskKey, null);
        urlBox.value = "全局默认已恢复：Esc 关闭";
      } else {
        globalShortcut = { key: e.key, ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey, meta: e.metaKey };
        GM_setValue(gskKey, globalShortcut);
        const parts = [];
        if (e.ctrlKey) parts.push("Ctrl");
        if (e.altKey) parts.push("Alt");
        if (e.shiftKey) parts.push("Shift");
        if (e.metaKey) parts.push("Meta");
        parts.push(e.key.toUpperCase());
        urlBox.value = "全局默认已设：" + parts.join("+") + " 关闭";
      }
      setTimeout(() => { urlBox.value = oldVal; }, 1600);
    };
    document.addEventListener("keydown", onKey, true);
  }

  // ===== 生命周期 =====
  function openUrl(url) {
    ensureHost();
    history = history.slice(0, historyIndex + 1);
    history.push(url);
    historyIndex = history.length - 1;
    rebuildFrame(url);
    const urlBox = host.querySelector(".si-url");
    if (urlBox) urlBox.value = url;
    show();
  }

  function rebuildFrame(url) {
    if (frame && frame.parentNode) frame.parentNode.removeChild(frame);
    frame = document.createElement("iframe");
    frame.className = "si-frame";
    frame.setAttribute("allow", "clipboard-read; clipboard-write; popup; fullscreen");
    frame.style.opacity = "0";
    frame.style.transition = "opacity 0.18s ease";
    frame.addEventListener("load", () => {
      frame.style.opacity = "1";
      try { window.focus(); } catch (_) {}
    });
    setTimeout(() => { if (frame) frame.style.opacity = "1"; }, 1500);

    let loaded = false;
    let failTimer = null;
    frame.addEventListener("load", () => {
      loaded = true;
      if (failTimer) { clearTimeout(failTimer); failTimer = null; }
      frame.style.opacity = "1";
      try {
        const doc = frame.contentDocument;
        if (doc && (!doc.body || doc.body.children.length === 0) && !doc.title) showFallback(url);
        else removeFallback();
      } catch (_) { removeFallback(); }
    });
    failTimer = setTimeout(() => { if (!loaded) showFallback(url); }, 8000);
    frame.src = url || "about:blank";
    host.append(frame);
  }

  function showFallback(url) {
    ensureHost();
    let fb = host.querySelector(".si-fallback");
    if (!fb) {
      fb = document.createElement("div");
      fb.className = "si-fallback";
      const tip = document.createElement("div");
      tip.className = "si-fallback-tip";
      tip.textContent = "该网站无法在侧边栏内加载（可能需要登录或禁止嵌入）";
      const btn = document.createElement("button");
      btn.className = "si-fallback-btn";
      btn.textContent = "在新标签打开";
      btn.addEventListener("click", () => { GM_openInTab(url, { active: true }); hide(); });
      fb.append(tip, btn);
      host.append(fb);
    }
    fb.style.display = "flex";
  }

  function removeFallback() {
    if (!host) return;
    const fb = host.querySelector(".si-fallback");
    if (fb) fb.style.display = "none";
  }

  function show() {
    ensureHost();
    host.classList.remove("si-fadeout");
    host.classList.add("si-open");
    if (openerBtn) openerBtn.classList.remove("si-visible");
  }

  function hide() {
    if (!host) return;
    const old = host;
    old.classList.add("si-fadeout");
    setTimeout(() => { if (old.parentNode) old.parentNode.removeChild(old); }, 260);
    host = null; frame = null; openerBtn = null;
    history = []; historyIndex = -1;
  }

  function backHistory() {
    if (historyIndex <= 0) return;
    historyIndex--;
    rebuildFrame(history[historyIndex]);
    const urlBox = host.querySelector(".si-url");
    if (urlBox) urlBox.value = history[historyIndex];
  }

  function fwdHistory() {
    if (historyIndex >= history.length - 1) return;
    historyIndex++;
    rebuildFrame(history[historyIndex]);
    const urlBox = host.querySelector(".si-url");
    if (urlBox) urlBox.value = history[historyIndex];
  }

  // ===== Esc / 快捷键关闭 =====
  document.addEventListener("keydown", (e) => {
    if (!host) return;
    const sc = effectiveShortcut();
    if (sc === false) return;
    if (sc && typeof sc === "object") {
      if (e.defaultPrevented) return;
      if (matchShortcut(e)) {
        e.preventDefault();
        e.stopPropagation();
        hide();
      }
    } else {
      if (e.key !== "Escape") return;
      if (e.defaultPrevented) return;
      if (e.cancelable) e.preventDefault();
      hide();
    }
  }, false);

  // 阻止侧边栏滚轮冒泡
  document.addEventListener("wheel", (e) => {
    if (!host) return;
    if (host.contains(e.target)) e.stopPropagation();
  }, true);

  function shouldOpenInSidebar(u) {
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    if (u.origin === location.origin && u.pathname === location.pathname && u.search === location.search && u.hash) return false;
    const rootPath = u.pathname === "/" || u.pathname === "";
    if (rootPath && !u.search) return false;
    return true;
  }

  // ===== 链接拦截 =====
  document.addEventListener("click", (e) => {
    if (!siteEnabled()) return;
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    let a = e.target;
    if (!a || a.nodeType !== 1) return;
    if (a.tagName !== "A") a = a.closest ? a.closest("a") : null;
    if (!a || !a.href) return;
    let u;
    try { u = new URL(a.href, location.href); } catch (_) { return; }
    if (!shouldOpenInSidebar(u)) return;
    a.removeAttribute("target");
    e.preventDefault();
    e.stopImmediatePropagation();
    openUrl(u.href);
  }, true);

  // ===== window.open 拦截 =====
  function patchWindowOpen(win) {
    if (!win || win.__SI_WINDOW_OPEN_PATCHED__) return;
    win.__SI_WINDOW_OPEN_PATCHED__ = true;
    const rawWindowOpen = win.open;
    win.open = function(url, target, features) {
      if (siteEnabled() && typeof url === "string") {
        try {
          const u = new URL(url, location.href);
          if (shouldOpenInSidebar(u)) {
            openUrl(u.href);
            return null;
          }
        } catch (_) {}
      }
      return rawWindowOpen.call(win, url, target, features);
    };
  }
  patchWindowOpen(window);
  try { patchWindowOpen(unsafeWindow); } catch (_) {}

  // ===== 设置面板 =====
  function createPanel() {
    // 遮罩层
    const overlay = document.createElement("div");
    overlay.id = "si-panel-overlay";
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closePanel();
    });

    const panel = document.createElement("div");
    panel.id = "si-panel";

    // 头部
    const header = document.createElement("div");
    header.className = "sp-header";
    const titleSpan = document.createElement("span");
    titleSpan.className = "sp-title";
    titleSpan.textContent = "Sidebar Interceptor";
    const verSpan = document.createElement("span");
    verSpan.className = "sp-ver";
    verSpan.innerHTML = '油猴版 v0.2.2 <a href="https://github.com/sevencnup/sidebar-interceptor" target="_blank">GitHub</a>';
    header.append(titleSpan, verSpan);

    // 当前站点行
    const row = document.createElement("div");
    row.className = "sp-row";
    const info = document.createElement("div");
    info.className = "info";
    const labelDiv = document.createElement("div");
    labelDiv.className = "label";
    labelDiv.textContent = "当前站点";
    const hostDiv = document.createElement("div");
    hostDiv.className = "host";
    hostDiv.textContent = location.hostname || "—";
    info.append(labelDiv, hostDiv);

    const switchLabel = document.createElement("label");
    switchLabel.className = "sp-switch";
    const toggleInput = document.createElement("input");
    toggleInput.type = "checkbox";
    toggleInput.checked = siteEnabled();
    const slider = document.createElement("span");
    slider.className = "sp-slider";
    switchLabel.append(toggleInput, slider);

    toggleInput.addEventListener("change", () => {
      toggleSite();
      updateToggleBtn();
      renderSiteList();
    });

    row.append(info, switchLabel);

    // 已启用站点列表
    const section = document.createElement("div");
    section.className = "sp-section";
    const secLabel = document.createElement("div");
    secLabel.className = "label";
    secLabel.textContent = "已启用站点";
    const listEl = document.createElement("ul");
    listEl.className = "sp-list";
    const emptyEl = document.createElement("div");
    emptyEl.className = "sp-empty";
    emptyEl.textContent = "暂无启用站点";
    section.append(secLabel, listEl, emptyEl);

    function renderSiteList() {
      listEl.innerHTML = "";
      const sites = getSites();
      if (sites.size === 0) { emptyEl.style.display = ""; return; }
      emptyEl.style.display = "none";
      const arr = [...sites].sort();
      for (const h of arr) {
        const li = document.createElement("li");
        const span = document.createElement("span");
        span.className = "h";
        span.textContent = h;
        const del = document.createElement("span");
        del.className = "del";
        del.textContent = "✕";
        del.title = "移除";
        del.addEventListener("click", () => {
          const s = getSites();
          s.delete(h);
          saveSites(s);
          renderSiteList();
          if (h === location.hostname) {
            toggleInput.checked = false;
            updateToggleBtn();
          }
        });
        li.append(span, del);
        listEl.append(li);
      }
    }

    // 关闭按钮
    const actions = document.createElement("div");
    actions.className = "sp-actions";
    const closeBtn = document.createElement("button");
    closeBtn.className = "sp-close-btn";
    closeBtn.textContent = "关闭";
    closeBtn.addEventListener("click", closePanel);
    actions.append(closeBtn);

    panel.append(header, row, section, actions);
    overlay.append(panel);
    document.documentElement.appendChild(overlay);

    function openPanel() {
      toggleInput.checked = siteEnabled();
      renderSiteList();
      overlay.classList.add("show");
    }
    function closePanel() { overlay.classList.remove("show"); }

    return { overlay, open: openPanel, close: closePanel, renderList: renderSiteList };
  }

  // ===== 悬浮按钮 / 菜单入口 =====
  let panelCtrl = null;
  let toggleBtn = null;

  function openSettingsPanel() {
    if (!panelCtrl) panelCtrl = createPanel();
    panelCtrl.open();
  }

  function toggleCurrentSite() {
    const on = toggleSite();
    updateToggleBtn();
    if (panelCtrl) panelCtrl.renderList();
    alert("Sidebar Interceptor 已" + (on ? "启用" : "停用") + "当前站点：" + location.hostname);
  }

  function registerMenus() {
    if (typeof GM_registerMenuCommand !== "function") return;
    GM_registerMenuCommand("打开设置面板", openSettingsPanel);
    GM_registerMenuCommand((siteEnabled() ? "停用" : "启用") + "当前站点：" + location.hostname, toggleCurrentSite);
    GM_registerMenuCommand("查看项目 GitHub", () => GM_openInTab("https://github.com/sevencnup/sidebar-interceptor", { active: true }));
  }

  function createToggleBtn() {
    toggleBtn = document.createElement("button");
    toggleBtn.id = "si-userscript-toggle";
    updateToggleBtn();
    toggleBtn.addEventListener("click", () => {
      if (!panelCtrl) {
        panelCtrl = createPanel();
      }
      panelCtrl.open();
    });
    document.documentElement.appendChild(toggleBtn);
  }

  function updateToggleBtn() {
    if (!toggleBtn) return;
    const on = siteEnabled();
    toggleBtn.innerHTML = on ? "◉" : "◎";
    toggleBtn.title = "Sidebar Interceptor: " + (on ? "已启用" : "已停用") + "\n点击打开设置面板";
    if (on) toggleBtn.classList.remove("off");
    else toggleBtn.classList.add("off");
  }

  // ===== 初始化 =====
  function init() {
    if (window !== window.top) return;
    const proto = location.protocol;
    if (proto !== "http:" && proto !== "https:") return;
    registerMenus();
    if (GM_getValue("si-show-floating-button", true)) createToggleBtn();
    console.log("[Sidebar Interceptor] 油猴版已加载，当前网站：" + (siteEnabled() ? "已启用" : "已停用") + "，可从油猴菜单打开设置");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
