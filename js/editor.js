import {
  saveUniverseJson,
  downloadJson,
  pickJsonFile,
  clearUniverseJsonOverride
} from "./storage.js";

let rootEl = null;
let isOpen = false;
let lastHookedApp = null;

function getApp() {
  return window.__APP__;
}

function getU() {
  return window.__APP__?.getUniverse?.();
}

function getCatalogTypes() {
  const c = window.__APP__?.getCatalog?.();
  const types = c?.types ? Object.keys(c.types) : [];
  // fallback to your canonical list if catalog missing
  return types.length ? types : [
    "Story","Crucible","Gambit","Patrol","Adventure","Lost Sector","Strike","Raid",
    "Arena","Dungeon","Flashpoint","Challenge","Bounty","Public Event","World Event","Other events",
    "Landing Zone","Vendor"
  ];
}

function commit({ rerender = true } = {}) {
  // Prefer app.save if available (keeps your app as the source of truth)
  const app = getApp();
  if (app?.save) {
    app.save({ rerender });
    toast("Saved");
    return;
  }

  // fallback (older builds)
  const u = getU();
  if (!u) return;
  saveUniverseJson(u);
  if (rerender) app?.render?.();
  toast("Saved");
}

function ensureUi() {
  if (rootEl) return;

  rootEl = document.createElement("div");
  rootEl.id = "editorWindow";
  rootEl.style.position = "fixed";
  rootEl.style.left = "14px";
  rootEl.style.top = "74px";
  rootEl.style.width = "480px";
  rootEl.style.maxHeight = "82vh";
  rootEl.style.zIndex = "9998";
  rootEl.style.border = "1px solid rgba(255,255,255,.18)";
  rootEl.style.borderRadius = "14px";
  rootEl.style.background = "rgba(11,16,32,.92)";
  rootEl.style.backdropFilter = "blur(10px)";
  rootEl.style.boxShadow = "0 18px 60px rgba(0,0,0,.55)";
  rootEl.style.overflow = "hidden";
  rootEl.hidden = true;

  rootEl.innerHTML = `
    <div id="edDragBar" style="display:flex; justify-content:space-between; align-items:center; padding:10px 10px; border-bottom:1px solid rgba(255,255,255,.12); font-family:ui-monospace; letter-spacing:.12em; font-size:12px; cursor:move;">
      <div>EDITOR</div>
      <div style="display:flex; gap:8px;">
        <button class="btn ghost" id="edClose">Close</button>
      </div>
    </div>

    <div style="padding:10px; display:flex; gap:8px; flex-wrap:wrap; border-bottom:1px solid rgba(255,255,255,.10);">
      <button class="btn" id="edExport">Export JSON</button>
      <button class="btn" id="edImport">Import JSON</button>
      <button class="btn ghost" id="edSaveLocal">Save Local</button>
      <button class="btn ghost" id="edClearLocal">Clear Local</button>
    </div>

    <div style="padding:10px; overflow:auto; max-height:70vh;">
      <div style="font-family:ui-monospace; font-size:11px; color:rgba(255,255,255,.72);">Selected:</div>
      <pre id="edSelected" style="margin:8px 0 12px; padding:10px; border:1px solid rgba(255,255,255,.12); border-radius:12px; background:rgba(0,0,0,.25); color:rgba(255,255,255,.85); white-space:pre-wrap;"></pre>
      
      <details open>
      <summary style="cursor:pointer; font-family:var(--mono); letter-spacing:.10em; font-size:12px; color:rgba(255,255,255,.85);">
        Labels on this page
      </summary>

      <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn ghost" id="edAddLabel">Add Label</button>
      </div>

      <div id="edLabelList" style="margin-top:10px; display:flex; flex-direction:column; gap:8px;"></div>
    </details>

    <div style="height:12px;"></div>

      <details open>
        <summary style="cursor:pointer; font-family:var(--mono); letter-spacing:.10em; font-size:12px; color:rgba(255,255,255,.85);">
          Nodes on this page
        </summary>
        <div id="edNodeList" style="margin-top:10px; display:flex; flex-direction:column; gap:8px;"></div>
      </details>

      <div style="height:12px;"></div>

      <details open>
        <summary style="cursor:pointer; font-family:var(--mono); letter-spacing:.10em; font-size:12px; color:rgba(255,255,255,.85);">
          Quick edit (selected node)
        </summary>

        <div id="edForm" style="margin-top:10px; display:grid; grid-template-columns: 120px 1fr; gap:8px 10px; align-items:center;">

          <div style="color:rgba(255,255,255,.6); font-family:ui-monospace; font-size:11px;">name</div>
          <input id="fName" />

          <div style="color:rgba(255,255,255,.6); font-family:ui-monospace; font-size:11px;">type</div>
          <select id="fType"></select>

          <div style="color:rgba(255,255,255,.6); font-family:ui-monospace; font-size:11px;">subtitle</div>
          <input id="fSubtitle" />

          <div class="rowLabel" data-kind="label">text</div>
          <input id="fLabelText" data-kind="label" />

          <div class="rowLabel" data-kind="label">boxed</div>
          <input id="fLabelBoxed" type="checkbox" data-kind="label" />

          <div style="color:rgba(255,255,255,.6); font-family:ui-monospace; font-size:11px;">subtext</div>
          <input id="fSubtext" />

          <div style="color:rgba(255,255,255,.6); font-family:ui-monospace; font-size:11px;">portrait</div>
          <input id="fPortrait" placeholder="assets/tool/devrim.png" />

          <div style="color:rgba(255,255,255,.6); font-family:ui-monospace; font-size:11px;">description</div>
          <textarea id="fDesc" rows="3"></textarea>

          <div style="color:rgba(255,255,255,.6); font-family:ui-monospace; font-size:11px;">enemies</div>
          <input id="fEnemies" placeholder="Fallen, Hive, Cabal" />

          <div style="color:rgba(255,255,255,.6); font-family:ui-monospace; font-size:11px;">bosses</div>
          <input id="fBosses" placeholder="Sepiks Prime, Kell Echo" />

          <div style="color:rgba(255,255,255,.6); font-family:ui-monospace; font-size:11px;">x</div>
          <input id="fX" type="number" />

          <div style="color:rgba(255,255,255,.6); font-family:ui-monospace; font-size:11px;">y</div>
          <input id="fY" type="number" />

          <div style="color:rgba(255,255,255,.6); font-family:ui-monospace; font-size:11px;">size</div>
          <input id="fSize" type="number" />

          <div style="color:rgba(255,255,255,.6); font-family:ui-monospace; font-size:11px;">enabled</div>
          <input id="fEnabled" type="checkbox" />
        </div>

        <div style="display:flex; gap:8px; margin-top:10px;">
          <button class="btn" id="edApply">Apply</button>
          <button class="btn ghost" id="edDelete">Delete Node</button>
          <button class="btn ghost" id="edAddNode">Add Node</button>
        </div>
      </details>

      <div style="height:12px;"></div>

      <details>
        <summary style="cursor:pointer; font-family:var(--mono); letter-spacing:.10em; font-size:12px; color:rgba(255,255,255,.85);">
          Solar System (Director bodies)
        </summary>

        <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn ghost" id="solAddBody">Add Body</button>
        </div>

        <div id="solList" style="margin-top:10px; display:flex; flex-direction:column; gap:10px;"></div>
      </details>

      <div style="height:12px;"></div>

      <details>
        <summary style="cursor:pointer; font-family:var(--mono); letter-spacing:.10em; font-size:12px; color:rgba(255,255,255,.85);">
          Locations (Director)
        </summary>

        <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn ghost" id="locAdd">Add Location</button>
        </div>

        <div id="locList" style="margin-top:10px; display:flex; flex-direction:column; gap:10px;"></div>
      </details>

      <div style="margin-top:14px; color:rgba(255,255,255,.55); font-size:12px; line-height:1.35;">
        Save Local persists edits in your browser. Export creates a file you can commit into
        <span style="font-family:ui-monospace">/data/universe.json</span>.
      </div>
    </div>
  `;

  // Style inputs/selects/textarea
  rootEl.querySelectorAll("textarea").forEach(el => {
    el.style.width = "100%";
    el.style.padding = "8px 10px";
    el.style.borderRadius = "10px";
    el.style.border = "1px solid rgba(255,255,255,.14)";
    el.style.background = "rgba(255,255,255,.06)";
    el.style.color = "rgba(255,255,255,.9)";
    el.style.outline = "none";
    el.style.resize = "vertical";
  });


  // Populate type select from catalog
  const typeSel = rootEl.querySelector("#fType");
  const types = getCatalogTypes();
  typeSel.innerHTML = types.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("");

  document.body.appendChild(rootEl);

  // Buttons
  rootEl.querySelector("#edClose").onclick = () => toggle(false);
  rootEl.querySelector("#edExport").onclick = () => downloadJson("universe.json", window.__APP__.getUniverse());
  rootEl.querySelector("#edImport").onclick = async () => {
    const { json } = await pickJsonFile();
    window.__APP__.setUniverse(json, { rerender: true });
    commit({ rerender: true });
  };
  rootEl.querySelector("#edSaveLocal").onclick = () => {
    // ensure persisted even if app.save missing
    const u = window.__APP__.getUniverse();
    saveUniverseJson(u);
    toast("Saved to localStorage");
  };
  rootEl.querySelector("#edClearLocal").onclick = () => {
    clearUniverseJsonOverride();
    toast("Cleared localStorage (reload to re-fetch file)");
  };

  rootEl.querySelector("#edApply").onclick = applyEdits;
  rootEl.querySelector("#edDelete").onclick = deleteNode;
  rootEl.querySelector("#edAddNode").onclick = addNode;
  rootEl.querySelector("#edAddLabel").onclick = addLabel;

  rootEl.querySelector("#solAddBody").onclick = addSolBody;
  rootEl.querySelector("#locAdd").onclick = addLocation;

  makeDraggable(rootEl, rootEl.querySelector("#edDragBar"));
}

function makeDraggable(winEl, handleEl) {
  let dragging = false;
  let sx = 0, sy = 0, ox = 0, oy = 0;

  handleEl.addEventListener("mousedown", (e) => {
    dragging = true;
    sx = e.clientX; sy = e.clientY;
    const rect = winEl.getBoundingClientRect();
    ox = rect.left; oy = rect.top;
    e.preventDefault();
  });

  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const nx = ox + (e.clientX - sx);
    const ny = oy + (e.clientY - sy);
    winEl.style.left = `${Math.max(8, Math.min(window.innerWidth - 80, nx))}px`;
    winEl.style.top  = `${Math.max(56, Math.min(window.innerHeight - 40, ny))}px`;
  });

  window.addEventListener("mouseup", () => { dragging = false; });
}

function attachSelectionHook() {
  const app = window.__APP__;
  if (!app || app === lastHookedApp) return;

  lastHookedApp = app;
  const prev = app.onSelection;

  app.onSelection = (sel) => {
    try { prev?.(sel); } catch {}
    if (isOpen) refresh();
  };
}

function toggle(force) {
  ensureUi();
  isOpen = typeof force === "boolean" ? force : !isOpen;
  rootEl.hidden = !isOpen;

  attachSelectionHook();
  if (isOpen) refresh();
}

function refresh() {
  attachSelectionHook();

  const app = window.__APP__;
  if (!app) return;

  const sel = app.getSelection();
  rootEl.querySelector("#edSelected").textContent = JSON.stringify(sel, null, 2);

  renderNodeList();
  renderLabelList();
  renderSolList();
  renderLocationList();

  const form = rootEl.querySelector("#edForm");
  const isActivity = sel?.kind === "activity";
  const isLabel = sel?.kind === "label";

  form.style.opacity = (isActivity || isLabel) ? "1" : ".45";
  form.querySelectorAll("input, select").forEach(i => (i.disabled = !(isActivity || isLabel)));

  // Show/hide label-specific inputs (if you used data-kind)
  form.querySelectorAll("[data-kind='label']").forEach(el => {
    el.style.display = isLabel ? "" : "none";
  });
  form.querySelectorAll("[data-kind='activity']").forEach(el => {
    el.style.display = isActivity ? "" : "none";
  });

  if (isActivity) {
    const { node } = findSelectedNode();
    rootEl.querySelector("#fName").value = node.name || "";
    rootEl.querySelector("#fType").value = node.type || "Patrol";
    rootEl.querySelector("#fX").value = Number(node.x ?? 0);
    rootEl.querySelector("#fY").value = Number(node.y ?? 0);
    rootEl.querySelector("#fSize").value = Number(node.size ?? 22);
    rootEl.querySelector("#fDesc").value = node.description || "";
    rootEl.querySelector("#fEnemies").value = Array.isArray(node.enemies) ? node.enemies.join(", ") : (node.enemies || "");
    rootEl.querySelector("#fBosses").value = Array.isArray(node.bosses) ? node.bosses.join(", ") : (node.bosses || "");
    rootEl.querySelector("#fEnabled").checked = node.enabled !== false;
    return;
  }

  if (isLabel) {
    const { label } = findSelectedLabel();
    rootEl.querySelector("#fX").value = Number(label.x ?? 0);
    rootEl.querySelector("#fY").value = Number(label.y ?? 0);
    rootEl.querySelector("#fLabelText").value = label.text || "";
    rootEl.querySelector("#fLabelBoxed").checked = !!label.boxed;
    return;
  }
}

function getCurrentPlanet() {
  const sel = window.__APP__?.getSelection();
  const u = window.__APP__?.getUniverse();
  if (!u) return null;
  const planetId = sel?.planetId;
  if (!planetId) return null;
  return u.planets.find(p => p.id === planetId) || null;
}

/* ---------------- Nodes list + quick edit ---------------- */

function renderNodeList() {
  const list = rootEl.querySelector("#edNodeList");
  const planet = getCurrentPlanet();
  const sel = window.__APP__.getSelection();

  if (!planet) {
    list.innerHTML = `<div style="color:rgba(255,255,255,.55); font-size:12px;">Open a location to see its nodes.</div>`;
    return;
  }

  const nodes = planet.nodes || [];
  if (!nodes.length) {
    list.innerHTML = `<div style="color:rgba(255,255,255,.55); font-size:12px;">No nodes yet.</div>`;
    return;
  }

  list.innerHTML = nodes.map(n => {
    const active = sel?.kind === "activity" && sel.nodeId === n.id;
    return `
      <button class="btn ${active ? "" : "ghost"}" data-node="${escapeHtml(n.id)}" style="text-align:left;">
        <div style="font-family:var(--mono); font-size:11px; letter-spacing:.08em; opacity:.9;">
          ${escapeHtml(n.name || n.id)}
        </div>
        <div style="font-size:12px; color:rgba(255,255,255,.6)">
          ${escapeHtml(n.type)} · ${n.enabled === false ? "disabled" : "active"}
          ${n.subtitle ? " · " + escapeHtml(n.subtitle) : ""}
        </div>
      </button>
    `;
  }).join("");

  list.querySelectorAll("button[data-node]").forEach(btn => {
    btn.addEventListener("click", () => {
      const nodeId = btn.getAttribute("data-node");
      window.__APP__.setSelection({ kind: "activity", planetId: planet.id, nodeId });
      refresh();
    });
  });
}

function renderLabelList() {
  const list = rootEl.querySelector("#edLabelList");
  const planet = getCurrentPlanet();
  const sel = window.__APP__?.getSelection?.();

  if (!planet) {
    list.innerHTML = `<div style="color:rgba(255,255,255,.55); font-size:12px;">Open a location to see its labels.</div>`;
    return;
  }

  planet.labels ??= [];
  const labels = planet.labels;

  if (!labels.length) {
    list.innerHTML = `<div style="color:rgba(255,255,255,.55); font-size:12px;">No labels yet.</div>`;
    return;
  }

  list.innerHTML = labels.map(l => {
    const active = sel?.kind === "label" && sel.labelId === l.id;
    return `
      <button class="btn ${active ? "" : "ghost"}" data-label="${escapeHtml(l.id)}" style="text-align:left;">
        <div style="font-family:var(--mono); font-size:11px; letter-spacing:.08em; opacity:.9;">
          ${escapeHtml(l.text || l.id)}
        </div>
        <div style="font-size:12px; color:rgba(255,255,255,.6)">
          x:${Number(l.x ?? 0)} · y:${Number(l.y ?? 0)} · boxed:${l.boxed ? "yes" : "no"}
        </div>
      </button>
    `;
  }).join("");

  list.querySelectorAll("button[data-label]").forEach(btn => {
    btn.addEventListener("click", () => {
      const labelId = btn.getAttribute("data-label");
      window.__APP__.setSelection({ kind: "label", planetId: planet.id, labelId });
      refresh();
    });
  });
}

function findSelectedNode() {
  const sel = window.__APP__.getSelection();
  const u = window.__APP__.getUniverse();
  const planet = u.planets.find(p => p.id === sel.planetId);
  const node = (planet.nodes || []).find(n => n.id === sel.nodeId);
  return { planet, node, sel };
}

function findSelectedLabel() {
  const sel = window.__APP__.getSelection();
  const u = window.__APP__.getUniverse();
  const planet = u.planets.find(p => p.id === sel.planetId);
  planet.labels ??= [];
  const label = planet.labels.find(l => l.id === sel.labelId);
  return { planet, label, sel };
}

function applyEdits() {
  const sel = window.__APP__.getSelection();
  if (!sel) return;

  if (sel.kind === "activity") {
    const { node } = findSelectedNode();
    node.name = rootEl.querySelector("#fName").value.trim();
    node.type = rootEl.querySelector("#fType").value.trim() || node.type;
    node.x = Number(rootEl.querySelector("#fX").value);
    node.y = Number(rootEl.querySelector("#fY").value);
    node.size = Number(rootEl.querySelector("#fSize").value);
    node.description = rootEl.querySelector("#fDesc").value;
    node.enemies = parseCsv(rootEl.querySelector("#fEnemies").value);
    node.bosses  = parseCsv(rootEl.querySelector("#fBosses").value);
    node.enabled = rootEl.querySelector("#fEnabled").checked;

    commit({ rerender: true, toastMsg: "Saved node" });
    refresh();
    return;
  }

  if (sel.kind === "label") {
    const { label } = findSelectedLabel();
    if (!label) return;

    label.text = rootEl.querySelector("#fLabelText").value.trim();
    label.x = Number(rootEl.querySelector("#fX").value);
    label.y = Number(rootEl.querySelector("#fY").value);
    label.boxed = rootEl.querySelector("#fLabelBoxed").checked;

    commit({ rerender: true, toastMsg: "Saved label" });
    refresh();
    return;
  }
}

function deleteNode() {
  const sel = window.__APP__.getSelection();
  if (sel?.kind !== "activity") return;

  const u = window.__APP__.getUniverse();
  const planet = u.planets.find(p => p.id === sel.planetId);
  const idx = (planet.nodes || []).findIndex(n => n.id === sel.nodeId);
  if (idx >= 0) planet.nodes.splice(idx, 1);

  window.__APP__.setSelection({ kind: "planet", planetId: planet.id });
  commit({ rerender: true });
  refresh();
  toast("Deleted node");
}

function addNode() {
  const planet = getCurrentPlanet();
  if (!planet) return;

  const types = getCatalogTypes();
  const defaultType =
    types.includes("Patrol") ? "Patrol" :
    types.includes("Landing Zone") ? "Landing Zone" :
    types.includes("Vendor") ? "Vendor" :
    (types[0] || "Patrol");

  const newId = `node_${Math.random().toString(16).slice(2, 8)}`;
  planet.nodes ??= [];
  planet.nodes.push({
    id: newId,
    type: defaultType,
    name: "New Node",

    // new fields
    subtitle: "",
    subtext: "",
    description: "",
    portrait: "",

    x: 200,
    y: 200,
    size: 22,
    enabled: true
  });

  window.__APP__.setSelection({ kind: "activity", planetId: planet.id, nodeId: newId });
  commit({ rerender: true, toastMsg: "Added node" });
  refresh();
}

function addLabel() {
  const planet = getCurrentPlanet();
  if (!planet) return;

  planet.labels ??= [];
  const id = `lbl_${Math.random().toString(16).slice(2, 8)}`;

  planet.labels.push({
    id,
    text: "New Label",
    x: 200,
    y: 200,
    boxed: false
  });

  window.__APP__.setSelection({ kind: "label", planetId: planet.id, labelId: id });
  commit({ rerender: true, toastMsg: "Added label" });
  refresh();
}

/* ---------------- Locations + Solar system (unchanged core) ---------------- */

function ensureSolSystem(u) {
  if (!u.solSystem) u.solSystem = { bodies: [] };
  if (!Array.isArray(u.solSystem.bodies)) u.solSystem.bodies = [];
}

function renderSolList() {
  const u = window.__APP__.getUniverse();
  ensureSolSystem(u);

  const sol = u.solSystem.bodies;
  const planets = u.planets || [];
  const solList = rootEl.querySelector("#solList");

  if (!sol.length) {
    solList.innerHTML = `<div style="color:rgba(255,255,255,.55); font-size:12px;">No bodies. Add one.</div>`;
    return;
  }

  solList.innerHTML = sol.map((b, idx) => {
    const locs = (b.locations || []).map(id => planets.find(p => p.id === id)).filter(Boolean);
    const locText = locs.length ? locs.map(p => p.name).join(", ") : "none";

    return `
      <div style="border:1px solid rgba(255,255,255,.12); border-radius:12px; padding:10px; background:rgba(0,0,0,.18);">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
          <div>
            <div style="font-family:var(--mono); font-size:11px; letter-spacing:.08em; color:rgba(255,255,255,.9);">
              ${escapeHtml(b.label)} <span style="opacity:.55">(${escapeHtml(b.key)})</span>
            </div>
            <div style="font-size:12px; color:rgba(255,255,255,.6)">kind: ${escapeHtml(b.kind)} · locations: ${escapeHtml(locText)}</div>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <button class="btn ghost" data-sol-up="${idx}">↑</button>
            <button class="btn ghost" data-sol-down="${idx}">↓</button>
            <button class="btn ghost" data-sol-edit="${idx}">Edit</button>
            <button class="btn ghost" data-sol-del="${idx}">Remove</button>
          </div>
        </div>

        <div data-sol-editor="${idx}" style="display:none; margin-top:10px; border-top:1px solid rgba(255,255,255,.10); padding-top:10px;">
          <div style="display:grid; grid-template-columns: 110px 1fr; gap:8px 10px; align-items:center;">
            <div style="color:rgba(255,255,255,.6); font-family:ui-monospace; font-size:11px;">label</div>
            <input data-sol-label="${idx}" value="${escapeHtml(b.label)}" />

            <div style="color:rgba(255,255,255,.6); font-family:ui-monospace; font-size:11px;">key</div>
            <input data-sol-key="${idx}" value="${escapeHtml(b.key)}" />

            <div style="color:rgba(255,255,255,.6); font-family:ui-monospace; font-size:11px;">kind</div>
            <select data-sol-kind="${idx}">
              ${["star","planet","moon"].map(k => `<option value="${k}" ${b.kind===k?"selected":""}>${k}</option>`).join("")}
            </select>

            <div style="color:rgba(255,255,255,.6); font-family:ui-monospace; font-size:11px;">icon (png)</div>
            <input data-sol-icon="${idx}" value="${escapeHtml(b.icon || "")}" placeholder="./images/bodies/venus.png or https://..." />

            <div style="color:rgba(255,255,255,.6); font-family:ui-monospace; font-size:11px;">color</div>
            <input data-sol-color="${idx}" value="${escapeHtml(b.color || "#78BEFF")}" placeholder="#78BEFF" />

            <div style="color:rgba(255,255,255,.6); font-family:ui-monospace; font-size:11px;">size (0=auto)</div>
            <input type="number" data-sol-size="${idx}" value="${Number(b.size ?? 0)}" />


            <div style="color:rgba(255,255,255,.6); font-family:ui-monospace; font-size:11px;">add location</div>
            <select data-sol-addloc="${idx}">
              <option value="">(pick)</option>
              ${planets.map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)} (${escapeHtml(p.id)})</option>`).join("")}
            </select>
          </div>

          <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
            ${(b.locations||[]).map(id => {
              const p = planets.find(pp => pp.id === id);
              return `<button class="btn ghost" data-sol-rmloc="${idx}" data-loc="${escapeHtml(id)}">remove: ${escapeHtml(p?.name || id)}</button>`;
            }).join("")}
          </div>

          <div style="margin-top:10px; display:flex; gap:8px;">
            <button class="btn" data-sol-save="${idx}">Save Body</button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  solList.querySelectorAll("[data-sol-del]").forEach(b => b.addEventListener("click", () => {
    const idx = Number(b.getAttribute("data-sol-del"));
    u.solSystem.bodies.splice(idx, 1);
    commit({ rerender: true });
    refresh();
  }));

  solList.querySelectorAll("[data-sol-up]").forEach(b => b.addEventListener("click", () => {
    const idx = Number(b.getAttribute("data-sol-up"));
    if (idx <= 0) return;
    const arr = u.solSystem.bodies;
    [arr[idx-1], arr[idx]] = [arr[idx], arr[idx-1]];
    commit({ rerender: true });
    refresh();
  }));

  solList.querySelectorAll("[data-sol-down]").forEach(b => b.addEventListener("click", () => {
    const idx = Number(b.getAttribute("data-sol-down"));
    const arr = u.solSystem.bodies;
    if (idx >= arr.length - 1) return;
    [arr[idx+1], arr[idx]] = [arr[idx], arr[idx+1]];
    commit({ rerender: true });
    refresh();
  }));

  solList.querySelectorAll("[data-sol-edit]").forEach(b => b.addEventListener("click", () => {
    const idx = Number(b.getAttribute("data-sol-edit"));
    const ed = solList.querySelector(`[data-sol-editor="${idx}"]`);
    ed.style.display = (ed.style.display === "none") ? "block" : "none";
  }));

  solList.querySelectorAll("[data-sol-save]").forEach(btn => btn.addEventListener("click", () => {
    const idx = Number(btn.getAttribute("data-sol-save"));
    const body = u.solSystem.bodies[idx];

    body.label = solList.querySelector(`[data-sol-label="${idx}"]`).value.trim() || body.label;
    body.key   = solList.querySelector(`[data-sol-key="${idx}"]`).value.trim() || body.key;
    body.kind  = solList.querySelector(`[data-sol-kind="${idx}"]`).value;

    body.icon  = solList.querySelector(`[data-sol-icon="${idx}"]`).value.trim();
    body.color = solList.querySelector(`[data-sol-color="${idx}"]`).value.trim() || body.color;

    const sizeVal = Number(solList.querySelector(`[data-sol-size="${idx}"]`).value);
    body.size = Number.isFinite(sizeVal) ? Math.max(0, Math.round(sizeVal)) : 0;


    const addSel = solList.querySelector(`[data-sol-addloc="${idx}"]`);
    const newLoc = addSel.value;
    if (newLoc) {
      body.locations = body.locations || [];
      if (!body.locations.includes(newLoc)) body.locations.push(newLoc);
      addSel.value = "";
    }

    commit({ rerender: true });
    refresh();
  }));

  solList.querySelectorAll("[data-sol-rmloc]").forEach(btn => btn.addEventListener("click", () => {
    const idx = Number(btn.getAttribute("data-sol-rmloc"));
    const loc = btn.getAttribute("data-loc");
    const body = u.solSystem.bodies[idx];
    body.locations = (body.locations || []).filter(x => x !== loc);
    commit({ rerender: true });
    refresh();
  }));

  solList.querySelectorAll("input, select").forEach(el => {
    el.style.width = "100%";
    el.style.padding = "8px 10px";
    el.style.borderRadius = "10px";
    el.style.border = "1px solid rgba(255,255,255,.14)";
    el.style.background = "rgba(255,255,255,.06)";
    el.style.color = "rgba(255,255,255,.9)";
    el.style.outline = "none";
  });
}

function addSolBody() {
  const u = window.__APP__.getUniverse();
  ensureSolSystem(u);

  u.solSystem.bodies.push({
    key: `body_${Math.random().toString(16).slice(2, 6)}`,
    label: "New Body",
    kind: "planet",
    locations: [],

    // NEW:
    icon: "",     // path or url to png
    color: "#78BEFF",
    size: 0       // 0 = auto (star/planet defaults)
  });

  window.__APP__.render();
  commit({ toastMsg: "Added body" });
  refresh();
}

function renderLocationList() {
  const u = window.__APP__.getUniverse();
  u.solSystem ??= { bodies: [] };

  const bodies = u.solSystem.bodies || [];
  const list = rootEl.querySelector("#locList");

  const locs = (u.planets || []).slice().sort((a, b) => {
    const an = (a.name || a.id || "").toLowerCase();
    const bn = (b.name || b.id || "").toLowerCase();
    return an.localeCompare(bn);
  });

  if (!locs.length) {
    list.innerHTML = `<div style="color:rgba(255,255,255,.55); font-size:12px;">No locations.</div>`;
    return;
  }

  const bodyOptionsBase = [
    `<option value="">(none)</option>`,
    ...bodies.map(b => `<option value="${escapeHtml(b.key)}">${escapeHtml(b.label)} (${escapeHtml(b.key)})</option>`)
  ].join("");

  list.innerHTML = locs.map((p, idx) => {
    const d = p.director || {};
    const bodyKey = d.bodyKey || "";
    const orbital = !!d.orbital;

    const body = bodies.find(b => b.key === bodyKey);
    const isLinked = !!(body && Array.isArray(body.locations) && body.locations.includes(p.id));

    // Build options with selected attribute (more robust than .replace)
    const bodyOptions = [
      `<option value="" ${bodyKey === "" ? "selected" : ""}>(none)</option>`,
      ...bodies.map(b => `<option value="${escapeHtml(b.key)}" ${b.key === bodyKey ? "selected" : ""}>${escapeHtml(b.label)} (${escapeHtml(b.key)})</option>`)
    ].join("");

    return `
      <div style="border:1px solid rgba(255,255,255,.12); border-radius:12px; padding:10px; background:rgba(0,0,0,.18);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
          <div style="min-width:0;">
            <div style="font-family:var(--mono); font-size:11px; letter-spacing:.08em; color:rgba(255,255,255,.9);">
              ${escapeHtml(p.name || p.id)} <span style="opacity:.55">(${escapeHtml(p.id)})</span>
            </div>
            <div style="font-size:12px; color:rgba(255,255,255,.6);">
              body: ${escapeHtml(bodyKey || "none")} · orbital: ${orbital ? "yes" : "no"} · linked: ${isLinked ? "yes" : "no"}
            </div>
          </div>

          <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end;">
            <button class="btn" data-loc-open="${escapeHtml(p.id)}">Open</button>
            <button class="btn ghost" data-loc-edit="${idx}">Edit</button>
            <button class="btn ghost" data-loc-del="${escapeHtml(p.id)}">Remove</button>
          </div>
        </div>

        <div data-loc-editor="${idx}" style="display:none; margin-top:10px; border-top:1px solid rgba(255,255,255,.10); padding-top:10px;">
          <div style="display:grid; grid-template-columns: 110px 1fr; gap:8px 10px; align-items:center;">
            <div style="color:rgba(255,255,255,.6); font-family:ui-monospace; font-size:11px;">name</div>
            <input data-loc-name="${idx}" value="${escapeHtml(p.name || "")}" />

            <div style="color:rgba(255,255,255,.6); font-family:ui-monospace; font-size:11px;">subtitle</div>
            <input data-loc-sub="${idx}" value="${escapeHtml(p.subtitle || "")}" />

            <div style="color:rgba(255,255,255,.6); font-family:ui-monospace; font-size:11px;">map.image</div>
            <input data-loc-mapimg="${idx}" value="${escapeHtml(p.map?.image || "")}" placeholder="https://... or ./images/..." />

            <div style="color:rgba(255,255,255,.6); font-family:ui-monospace; font-size:11px;">map.width</div>
            <input type="number" data-loc-mapw="${idx}" value="${Number(p.map?.width ?? 0)}" placeholder="0 = auto" />

            <div style="color:rgba(255,255,255,.6); font-family:ui-monospace; font-size:11px;">map.height</div>
            <input type="number" data-loc-maph="${idx}" value="${Number(p.map?.height ?? 0)}" placeholder="0 = auto" />

            <div style="color:rgba(255,255,255,.6); font-family:ui-monospace; font-size:11px;">id</div>
            <input data-loc-id="${idx}" value="${escapeHtml(p.id)}" />

            <div style="color:rgba(255,255,255,.6); font-family:ui-monospace; font-size:11px;">bodyKey</div>
            <select data-loc-body="${idx}" class="sel-body">
              ${bodyOptions}
            </select>

            <div style="color:rgba(255,255,255,.6); font-family:ui-monospace; font-size:11px;">orbital</div>
            <input type="checkbox" data-loc-orb="${idx}" ${orbital ? "checked" : ""} />

            <div style="color:rgba(255,255,255,.6); font-family:ui-monospace; font-size:11px;">stackOrder</div>
            <input type="number" data-loc-order="${idx}" value="${Number(d.stackOrder ?? 0)}" />

            <div style="color:rgba(255,255,255,.6); font-family:ui-monospace; font-size:11px;">link to body</div>
            <button class="btn ghost" data-loc-link="${idx}">${isLinked ? "Unlink" : "Link"}</button>
          </div>

          <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
            <button class="btn" data-loc-save="${idx}">Save</button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  list.querySelectorAll("[data-loc-open]").forEach(btn => btn.addEventListener("click", () => {
    const id = btn.getAttribute("data-loc-open");
    window.__APP__.setSelection({ kind: "planet", planetId: id });
    window.__APP__.setRoute?.({ page: "location", planetId: id });
    window.__APP__.render?.();
    refresh();
  }));

  list.querySelectorAll("[data-loc-edit]").forEach(btn => btn.addEventListener("click", () => {
    const idx = Number(btn.getAttribute("data-loc-edit"));
    const ed = list.querySelector(`[data-loc-editor="${idx}"]`);
    ed.style.display = (ed.style.display === "none") ? "block" : "none";
  }));

  list.querySelectorAll("[data-loc-del]").forEach(btn => btn.addEventListener("click", () => {
    const id = btn.getAttribute("data-loc-del");
    deleteLocationById(id);
    commit({ rerender: true, toastMsg: "Removed location" });
    refresh();
  }));

  list.querySelectorAll("[data-loc-link]").forEach(btn => btn.addEventListener("click", () => {
    const idx = Number(btn.getAttribute("data-loc-link"));
    const p = locs[idx];
    const newBody = list.querySelector(`[data-loc-body="${idx}"]`).value;

    p.director ??= {};
    p.director.bodyKey = newBody;

    toggleLinkLocationToBody(u, p.id, newBody);
    commit({ rerender: true, toastMsg: "Updated links" });
    refresh();
  }));

  list.querySelectorAll("[data-loc-save]").forEach(btn => btn.addEventListener("click", () => {
    const idx = Number(btn.getAttribute("data-loc-save"));
    const p = locs[idx];

    const newName = list.querySelector(`[data-loc-name="${idx}"]`).value.trim();
    const newSub  = list.querySelector(`[data-loc-sub="${idx}"]`).value.trim();
    const newId   = list.querySelector(`[data-loc-id="${idx}"]`).value.trim();
    const newBody = list.querySelector(`[data-loc-body="${idx}"]`).value;
    const newOrder = Number(list.querySelector(`[data-loc-order="${idx}"]`).value);
    const newOrb   = list.querySelector(`[data-loc-orb="${idx}"]`).checked;

    if (newId && newId !== p.id) renameLocationId(u, p.id, newId);

    const p2 = (u.planets || []).find(x => x.id === (newId || p.id));
    if (!p2) return;

    p2.name = newName;
    p2.subtitle = newSub;

    p2.director ??= {};
    p2.director.bodyKey = newBody;
    p2.director.orbital = !!newOrb;
    p2.director.stackOrder = Number.isFinite(newOrder) ? newOrder : 0;

    const mapImg = list.querySelector(`[data-loc-mapimg="${idx}"]`).value.trim();
    const mapW   = Number(list.querySelector(`[data-loc-mapw="${idx}"]`).value);
    const mapH   = Number(list.querySelector(`[data-loc-maph="${idx}"]`).value);

    p2.map ??= { image: "", width: 0, height: 0 };
    p2.map.image = mapImg;
    p2.map.width  = Number.isFinite(mapW) && mapW > 0 ? Math.round(mapW) : 0;
    p2.map.height = Number.isFinite(mapH) && mapH > 0 ? Math.round(mapH) : 0;

    if (newBody) {
      ensureBodyHasLocation(u, newBody, p2.id);
      removeLocationFromOtherBodies(u, newBody, p2.id);
    } else {
      removeLocationFromAllBodies(u, p2.id);
    }

    commit({ rerender: true, toastMsg: "Saved location" });
    refresh();
  }));

  list.querySelectorAll("input, select").forEach(styleField);
}

function styleField(el) {
  el.style.width = "100%";
  el.style.padding = "8px 10px";
  el.style.borderRadius = "10px";
  el.style.border = "1px solid rgba(255,255,255,.14)";
  el.style.background = "rgba(255,255,255,.06)";
  el.style.color = "rgba(255,255,255,.9)";
  el.style.outline = "none";
}

function addLocation() {
  const u = window.__APP__.getUniverse();
  u.solSystem ??= { bodies: [] };

  const id = `loc_${Math.random().toString(16).slice(2, 8)}`;
  u.planets ??= [];
  u.planets.push({
    id,
    name: "New Location",
    subtitle: "",
    map: { image: "", width: 3000, height: 2000 },
    nodes: [],
    director: { bodyKey: "", orbital: false, stackOrder: 0 }
  });

  commit({ rerender: true });
  refresh();
  toast("Added location");
}

/* ---------------- misc ---------------- */

function parseCsv(s) {
  return String(s || "")
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

window.__EDITOR__ = { toggle };

// keep trying to hook after app boots
setInterval(() => {
  if (!window.__APP__) return;
  attachSelectionHook();
}, 500);