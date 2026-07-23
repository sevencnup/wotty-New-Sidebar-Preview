// Sidebar Interceptor - content script
// 在当前页注入右侧滑出侧边栏，用 iframe 加载被拦截的目标 URL

(() => {
  if (window.__SIDEBAR_INTERCEPTOR__) return;
  window.__SIDEBAR_INTERCEPTOR__ = true;

  // 自定义关闭快捷键：域名自定义 > 全局默认 > 硬编码 Esc
  const SHORTCUT_KEY = "si-sidebar-close-shortcut";
  const GLOBAL_KEY = "@__global__";
  // 域名级快捷键：undefined=未设置(回退全局) / null=Esc / {key...} / false=禁用
  let domainShortcut = undefined;
  // 全局默认快捷键：undefined=未设置(回退Esc) / null=Esc / {key...} / false=禁用
  let globalShortcut = undefined;
  let shortcutLoaded = false;
  const sk = SHORTCUT_KEY + "@" + (location.hostname || "default");
  const gsk = SHORTCUT_KEY + GLOBAL_KEY;
  // 规范化：Esc 视作 null(Esc 默认)，其余对象原样，false 原样
  function normShortcut(v) {
    if (v === false) return false;
    if (v && typeof v === "object") return v.key === "Escape" ? null : v;
    return v;
  }
  // 同步优先从 localStorage 读域名+全局，避免异步竞态
  try {
    const ls = localStorage.getItem(sk);
    if (ls === "false") { domainShortcut = false; }
    else if (ls) { domainShortcut = normShortcut(JSON.parse(ls)); }
    const gls = localStorage.getItem(gsk);
    if (gls === "false") { globalShortcut = false; }
    else if (gls) { globalShortcut = normShortcut(JSON.parse(gls)); }
  } catch (_) {}
  // 再用 chrome.storage.local 跨设备同步(覆盖 localStorage)
  (async () => {
    try {
      const r = await chrome.storage.local.get([sk, gsk]);
      if (sk in r) {
        domainShortcut = normShortcut(r[sk]);
        try { localStorage.setItem(sk, domainShortcut === false ? "false" : JSON.stringify(domainShortcut)); } catch (_) {}
      }
      if (gsk in r) {
        globalShortcut = normShortcut(r[gsk]);
        try { localStorage.setItem(gsk, globalShortcut === false ? "false" : JSON.stringify(globalShortcut)); } catch (_) {}
      }
      shortcutLoaded = true;
    } catch (_) { shortcutLoaded = true; }
  })();
  // 解析有效快捷键：域名自定义 > 全局默认 > null(Esc)
  // 返回 null=走默认Esc分支 / false=禁用 / {key...}=自定义键
  function effectiveShortcut() {
    if (domainShortcut !== undefined) return domainShortcut;
    if (globalShortcut !== undefined) return globalShortcut;
    return null;
  }

  function matchShortcut(e) {
    if (!shortcutLoaded) return false; // 读取完成前不响应
    const sc = effectiveShortcut();
    if (sc === false) return false; // 已禁用
    if (!sc) return false; // null/未设置走 Esc 分支，不在此匹配
    if (sc.key === "Escape") return false; // Esc 不作匹配键(走默认 Esc 分支)
    const keyOk = (sc.key && sc.key.toLowerCase() === e.key.toLowerCase());
    const modOk = !!sc.ctrl === e.ctrlKey && !!sc.alt === e.altKey && !!sc.shift === e.shiftKey && !!sc.meta === e.metaKey;
    return keyOk && modOk;
  }

  // 快捷键关闭侧边栏
  // - 有效快捷键为 {key...}：捕获阶段响应；网站已 defaultPrevented 该键则不关
  // - 有效快捷键为 null(域名/全局均未设自定义)：默认 Esc，冒泡阶段最后触发，尊重网站
  // - 有效快捷键为 false(禁用)：完全不响应
  document.addEventListener("keydown", (e) => {
    if (!host) return;
    const sc = effectiveShortcut();
    if (sc === false) return; // 已禁用
    if (sc && typeof sc === "object") {
      // 自定义快捷键：捕获阶段抢先，但网站已消费则跳过
      if (e.defaultPrevented) return;
      if (matchShortcut(e)) {
        e.preventDefault();
        e.stopPropagation();
        hide();
      }
    } else {
      // 默认 Esc：冒泡阶段最后触发，尊重网站
      if (e.key !== "Escape") return;
      if (e.defaultPrevented) return; // 网站已用 Esc 关图片等，不关侧边栏
      if (e.cancelable) e.preventDefault();
      hide();
    }
  }, false);

  // 设置关闭快捷键：点按钮后监听下一次按键录入
  // 设置本域名关闭快捷键：点按钮后监听下一次按键录入
  function setShortcut() {
    ensureHost();
    const urlBox = host.querySelector(".si-url");
    const tip = urlBox || { value: "" };
    const oldVal = tip.value;
    tip.value = "按快捷键=设置本站 / Esc=恢复默认Esc / Backspace=彻底禁用";
    const onKey = (e) => {
      e.preventDefault();
      e.stopPropagation();
      document.removeEventListener("keydown", onKey, true);
      shortcutLoaded = true;
      if (e.key === "Backspace" || e.key === "Delete") {
        // 彻底禁用本站快捷键，只能用 ✕ 关闭
        domainShortcut = false;
        try { localStorage.setItem(sk, "false"); } catch (_) {}
        try { chrome.storage.local.set({ [sk]: false }); } catch (_) {}
        tip.value = "已禁用本站快捷键关闭";
      } else if (e.key === "Escape") {
        // Esc = 清除自定义，回退到全局默认或 Esc
        domainShortcut = undefined;
        try { localStorage.removeItem(sk); } catch (_) {}
        try { chrome.storage.local.remove(sk); } catch (_) {}
        tip.value = "已恢复：跟随全局默认";
      } else {
        domainShortcut = { key: e.key, ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey, meta: e.metaKey };
        try { localStorage.setItem(sk, JSON.stringify(domainShortcut)); } catch (_) {}
        try { chrome.storage.local.set({ [sk]: domainShortcut }); } catch (_) {}
        const parts = [];
        if (e.ctrlKey) parts.push("Ctrl");
        if (e.altKey) parts.push("Alt");
        if (e.shiftKey) parts.push("Shift");
        if (e.metaKey) parts.push("Meta");
        parts.push(e.key.toUpperCase());
        tip.value = "已设置本站：" + parts.join("+") + " 关闭";
      }
      setTimeout(() => { tip.value = oldVal; }, 1600);
    };
    document.addEventListener("keydown", onKey, true);
  }

  // 设置全局默认快捷键：所有未单独设置的网站统一用此键
  function setGlobalShortcut() {
    ensureHost();
    const urlBox = host.querySelector(".si-url");
    const tip = urlBox || { value: "" };
    const oldVal = tip.value;
    tip.value = "[全局] 按键=设默认 / Esc=默认Esc / Backspace=默认禁用";
    const onKey = (e) => {
      e.preventDefault();
      e.stopPropagation();
      document.removeEventListener("keydown", onKey, true);
      shortcutLoaded = true;
      if (e.key === "Backspace" || e.key === "Delete") {
        // 全局默认禁用：未单独设置的网站不能用快捷键关闭
        globalShortcut = false;
        try { localStorage.setItem(gsk, "false"); } catch (_) {}
        try { chrome.storage.local.set({ [gsk]: false }); } catch (_) {}
        tip.value = "已禁用全局默认快捷键";
      } else if (e.key === "Escape") {
        // Esc = 全局默认恢复为 Esc
        globalShortcut = null;
        try { localStorage.setItem(gsk, "null"); } catch (_) {}
        try { chrome.storage.local.set({ [gsk]: null }); } catch (_) {}
        tip.value = "全局默认已恢复：Esc 关闭";
      } else {
        globalShortcut = { key: e.key, ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey, meta: e.metaKey };
        try { localStorage.setItem(gsk, JSON.stringify(globalShortcut)); } catch (_) {}
        try { chrome.storage.local.set({ [gsk]: globalShortcut }); } catch (_) {}
        const parts = [];
        if (e.ctrlKey) parts.push("Ctrl");
        if (e.altKey) parts.push("Alt");
        if (e.shiftKey) parts.push("Shift");
        if (e.metaKey) parts.push("Meta");
        parts.push(e.key.toUpperCase());
        tip.value = "全局默认已设：" + parts.join("+") + " 关闭";
      }
      setTimeout(() => { tip.value = oldVal; }, 1600);
    };
    document.addEventListener("keydown", onKey, true);
  }

  // 阻止侧边栏滚轮事件冒泡到主页，避免滚动穿透
  // 左右交换：右侧侧边栏当前页 ⇄ 左边主标签页
  // 点一下把右侧页扔到左边主标签，左边原页扔到右侧侧边栏
  function swapWithLeft() {
    if (!frame || !frame.src) return;
    const sidebarUrl = frame.src;
    // about:blank 不交换
    if (/^about:blank$/i.test(sidebarUrl)) return;
    const leftUrl = location.href;
    // 发 SWAP 给 background：主标签导航到 sidebarUrl，侧边栏加载 leftUrl
    try {
      chrome.runtime.sendMessage(
        { type: "SWAP", sidebarUrl, leftUrl },
        (resp) => {
          // 交换成功后本侧 sidebar 会被主标签导航重置；先本地隐藏
          if (resp && resp.ok) { hide(); }
        }
      );
    } catch (_) {}
  }

  document.addEventListener("wheel", (e) => {
    if (!host) return;
    if (host.contains(e.target)) {
      e.stopPropagation();
    }
  }, true);

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
    const reload = mkBtn("⟳", "刷新", () => { if (frame && frame.src) rebuildFrame(frame.src); });
    const openBtn = mkBtn("⤢", "在新标签打开", () => { if (frame && frame.src) window.open(frame.src, "_blank"); });
    const close = mkBtn("✕", "关闭", hide);
    const swapBtn = mkBtn("\u21c4", "左右交换：右侧页与左侧主标签互换", swapWithLeft);
    const keyBtn = mkBtn("⌨", "设置关闭快捷键", setShortcut);
    const globalBtn = mkBtn("\u2699", "设置全局默认快捷键", setGlobalShortcut);

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
    splitter.title = "拖拽调整宽度 / 点箭头左右互换";

    // 分界线上的左右交换箭头
    const swapLeft = document.createElement("button");
    swapLeft.className = "si-swap-arrow si-swap-left";
    swapLeft.innerHTML = "&#9664;";
    swapLeft.title = "右侧页扔到左边";
    swapLeft.addEventListener("click", (e) => { e.stopPropagation(); e.preventDefault(); swapWithLeft(); });

    const swapRight = document.createElement("button");
    swapRight.className = "si-swap-arrow si-swap-right";
    swapRight.innerHTML = "&#9654;";
    swapRight.title = "左侧页扔到右边";
    swapRight.addEventListener("click", (e) => { e.stopPropagation(); e.preventDefault(); swapWithLeft(); });

    splitter.append(swapLeft, swapRight);
    bar.append(title, back, fwd, reload, urlBox, openBtn, swapBtn, keyBtn, globalBtn, close);
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
      if (frame.src) show();
      else openerBtn.classList.remove("si-visible");
    });
    host.append(openerBtn);

    document.documentElement.appendChild(host);

    initResize();
    loadWidth();
    return host;
  }

  // ===== 可拖拽宽度 + localStorage 永久保存 =====
  const MIN_W = 280;
  const MAX_W_RATIO = 0.92;
  // 按域名存储宽度，key = "si-sidebar-width@<host>"
  function widthKey() { return "si-sidebar-width@" + (location.hostname || "default"); }
  function maxW() { return Math.round(window.innerWidth * MAX_W_RATIO); }
  function clampW(w) { return Math.min(Math.max(w, MIN_W), maxW()); }
  function applyW(w) {
    ensureHost();
    host.style.setProperty("width", w + "px", "important");
  }
  async function loadWidth() {
    let w;
    try {
      const key = widthKey();
      const r = await chrome.storage.local.get(key);
      w = parseFloat(r[key]);
    } catch (_) { w = NaN; }
    if (!Number.isFinite(w)) w = Math.round(window.innerWidth * 0.45);
    applyW(clampW(w));
  }
  function persistWidth() {
    const w = parseFloat(getComputedStyle(host).width);
    if (Number.isFinite(w)) chrome.storage.local.set({ [widthKey()]: Math.round(w) });
  }
  function initResize() {
    ensureHost();
    let startX = 0, startW = 0;
    const splitter = host.querySelector(".si-splitter");
    if (splitter.__siBound) return;
    splitter.__siBound = true;
    splitter.addEventListener("mousedown", (e) => {
      if (e.target.classList.contains("si-swap-arrow")) return; // 点箭头不拖拽
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
    function onMove(e) {
      applyW(clampW(startW - (e.clientX - startX)));
    }
    function onUp() {
      splitter.classList.remove("si-dragging");
      document.body.style.userSelect = "";
      if (frame) frame.style.pointerEvents = "";
      window.removeEventListener("mousemove", onMove, true);
      window.removeEventListener("mouseup", onUp, true);
      persistWidth();
    }
  }
  window.addEventListener("resize", () => { applyW(clampW(parseFloat(getComputedStyle(host).width))); });

  function mkBtn(glyph, title, onClick) {
    const b = document.createElement("button");
    b.className = "si-btn";
    b.textContent = glyph;
    b.title = title;
    b.addEventListener("click", onClick);
    return b;
  }

  async function openUrl(url) {
    ensureHost();
    history = history.slice(0, historyIndex + 1);
    history.push(url);
    historyIndex = history.length - 1;
    rebuildFrame(url);
    const urlBox = host.querySelector(".si-url");
    if (urlBox) urlBox.value = url;
    await loadWidth(); // 宽度就绪后再显示，避免先宽后窄闪动
    show();
  }

  // 每次销毁重建 iframe，避免旧页面残留/缓存闪现
  function rebuildFrame(url) {
    if (frame && frame.parentNode) frame.parentNode.removeChild(frame);
    frame = document.createElement("iframe");
    frame.className = "si-frame";
    frame.setAttribute("allow", "clipboard-read; clipboard-write; popup; fullscreen");
    // 先不透明，加载完成后由 load 事件统一处理，避免白屏闪现
    frame.style.opacity = "0";
    frame.style.transition = "opacity 0.18s ease";
    frame.addEventListener("load", () => {
      frame.style.opacity = "1";
      // 尝试在 iframe 内监听自定义快捷键(同域可行)；Esc 不绑，归网站
      try {
        const cw = frame.contentWindow;
        if (cw) {
          cw.addEventListener("keydown", (e) => {
            if (e.key === "Escape") return; // Esc 归网站
            if (matchShortcut(e)) {
              e.preventDefault();
              e.stopPropagation();
              hide();
            }
          }, true);
        }
      } catch (_) {} // 跨域会抛错，跳过
      // 把焦点拉回主页，确保自定义快捷键能被主页监听收到
      try { window.focus(); } catch (_) {}
    });
    // 兜底：超时强制显示，避免某些页面不触发 load
    setTimeout(() => { if (frame) frame.style.opacity = "1"; }, 1500);
    frame.src = url || "about:blank";
    host.append(frame);
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
    host = null;
    frame = null;
    openerBtn = null;
    history = [];
    historyIndex = -1;
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

  // 同标签页链接点击拦截：左键点击普通链接改为侧边栏打开，保留当前页
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    let a = e.target;
    if (!a || a.nodeType !== 1) return;
    if (a.tagName !== "A") a = a.closest ? a.closest("a") : null;
    if (!a || !a.href) return;
    let u;
    try { u = new URL(a.href); } catch (_) { return; }
    if (u.protocol !== "http:" && u.protocol !== "https:") return;
    if (u.origin === location.origin && u.pathname === location.pathname && u.search === location.search && u.hash) return;
    // 站点根路径(xxx.com/ 或 xxx.com，/ 后无内容)不拦截，属站内首页导航
    const rootPath = u.pathname === "/" || u.pathname === "";
    if (rootPath && !u.search) return;
    const tgt = (a.target || "").toLowerCase();
    if (tgt === "_blank" || tgt === "_new") return;
    e.preventDefault();
    e.stopPropagation();
    openUrl(a.href);
  }, true);
  // 拦截 iframe 内部打开的新窗口(部分站点用 window.open / target=_blank)
  // 顶层页面通过 chrome.tabs.onCreated 拦截，这里补强 iframe 内跳转
  window.addEventListener("message", (e) => {
    if (e.data && e.data.__si_open === true && e.data.url) {
      openUrl(e.data.url);
    }
  });

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.type === "SIDEBAR_OPEN" && msg.url) {
      if (host) hide(); // 清理旧侧边栏，确保干净加载
      openUrl(msg.url);
      sendResponse && sendResponse({ ok: true });
    }
    return true;
  });
})();
