const SITES_KEY = "si-enabled-sites";
const toggle = document.getElementById("toggle");
const curHost = document.getElementById("curHost");
const sitesEl = document.getElementById("sites");
const emptyEl = document.getElementById("empty");
const verEl = document.getElementById("ver");

async function getSites() {
  const r = await chrome.storage.local.get(SITES_KEY);
  return new Set(r[SITES_KEY] || []);
}
async function setSites(s) {
  await chrome.storage.local.set({ [SITES_KEY]: Array.from(s) });
}

function renderSites(sites) {
  sitesEl.innerHTML = "";
  if (sites.size === 0) { emptyEl.style.display = ""; return; }
  emptyEl.style.display = "none";
  const arr = Array.from(sites).sort();
  for (const h of arr) {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.className = "h";
    span.textContent = h;
    const del = document.createElement("span");
    del.className = "del";
    del.textContent = "✕";
    del.title = "移除";
    del.addEventListener("click", async () => {
      const s = await getSites();
      s.delete(h);
      await setSites(s);
      renderSites(s);
      if (h === curHost.textContent) { toggle.checked = false; }
    });
    li.append(span, del);
    sitesEl.append(li);
  }
}

(async () => {
  try {
    const d = chrome.runtime.getManifest();
    verEl.textContent = "v" + d.version;
  } catch (_) {}
  const tab = await chrome.tabs.query({ active: true, currentWindow: true });
  let host = "";
  if (tab && tab[0] && tab[0].url) {
    try { host = new URL(tab[0].url).hostname; } catch (_) {}
  }
  curHost.textContent = host || "—";
  if (!host) { toggle.disabled = true; }
  const sites = await getSites();
  toggle.checked = sites.has(host);
  renderSites(sites);

  toggle.addEventListener("change", async () => {
    const s = await getSites();
    if (toggle.checked) s.add(host); else s.delete(host);
    await setSites(s);
    renderSites(s);
    // 通知 background 刷新当前标签按钮状态
    try {
      const t = await chrome.tabs.query({ active: true, currentWindow: true });
      if (t && t[0]) {
        await chrome.tabs.reload(t[0].id);
      }
    } catch (_) {}
  });
})();
