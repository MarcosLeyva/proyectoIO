const MAX = 5;

export function saveHistory(module, label, input) {
  const key = `io-history-${module}`;
  const list = getHistory(module);
  list.unshift({ label, input, ts: Date.now() });
  localStorage.setItem(key, JSON.stringify(list.slice(0, MAX)));
}

export function getHistory(module) {
  try { return JSON.parse(localStorage.getItem(`io-history-${module}`) || "[]"); }
  catch { return []; }
}

export function clearHistory(module) {
  localStorage.removeItem(`io-history-${module}`);
}

/** Renders a history dropdown button + panel. onLoad(input) is called when user picks an item. */
export function historyWidget(module, onLoad) {
  const list = getHistory(module);
  if (!list.length) return "";

  const id = `hist-${module}`;
  const items = list.map((h, i) => `
    <button class="hist-item" data-idx="${i}"
      style="display:flex;align-items:center;gap:8px;width:100%;padding:8px 12px;
             background:none;border:none;cursor:pointer;text-align:left;
             font-size:12.5px;color:var(--text-primary);font-family:inherit;
             transition:background .1s;"
      onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background='none'">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
      <span style="flex:1;">${h.label}</span>
      <span style="font-size:11px;color:var(--text-muted);">${timeAgo(h.ts)}</span>
    </button>`).join("");

  setTimeout(() => {
    const panel = document.getElementById(id);
    if (!panel) return;
    panel.querySelectorAll(".hist-item").forEach(btn => {
      btn.addEventListener("click", () => {
        onLoad(list[+btn.dataset.idx].input);
        panel.style.display = "none";
      });
    });
    // Close on outside click
    document.addEventListener("click", e => {
      if (!panel.contains(e.target) && !e.target.closest(`[data-hist-toggle="${module}"]`))
        panel.style.display = "none";
    }, { once: false });
  }, 50);

  return `
    <div style="position:relative;display:inline-block;">
      <button data-hist-toggle="${module}"
        onclick="document.getElementById('${id}').style.display=document.getElementById('${id}').style.display==='none'?'block':'none'"
        style="display:flex;align-items:center;gap:5px;background:var(--surface);
               border:1.5px solid var(--border);border-radius:6px;padding:6px 11px;
               font-size:12px;color:var(--text-secondary);cursor:pointer;font-family:inherit;"
        data-tooltip="Ver problemas recientes">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        Recientes
      </button>
      <div id="${id}" style="display:none;position:absolute;top:calc(100% + 6px);right:0;
           background:var(--surface);border:1.5px solid var(--border);border-radius:8px;
           box-shadow:var(--shadow-lg);min-width:260px;z-index:50;overflow:hidden;">
        <div style="padding:8px 12px 6px;font-size:10.5px;font-weight:600;
                    color:var(--text-muted);text-transform:uppercase;letter-spacing:.07em;
                    border-bottom:1px solid var(--border-soft);">Historial</div>
        ${items}
      </div>
    </div>`;
}

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60)  return "ahora";
  if (diff < 3600) return `${Math.floor(diff/60)}m`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h`;
  return `${Math.floor(diff/86400)}d`;
}
