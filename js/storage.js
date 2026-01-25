const UNIVERSE_KEY = "destiny_universe_json_v1";
const CATALOG_KEY  = "destiny_activities_catalog_json_v1";

const UNIVERSE_PATH = "./data/universe.json";
const CATALOG_PATH  = "./data/activities_catalog.json";

/* -------------------- Universe -------------------- */
export async function loadUniverseJson({ allowLocalOverride = false, bustCache = true } = {}) {
  // 1) localStorage override (optional)
  if (allowLocalOverride) {
    const raw = localStorage.getItem(UNIVERSE_KEY);
    if (raw) return JSON.parse(raw);
  } else {
    // If override exists but we are ignoring it, warn so it’s obvious.
    if (localStorage.getItem(UNIVERSE_KEY)) {
      console.warn(
        `[storage] localStorage has ${UNIVERSE_KEY} but allowLocalOverride=false, using packaged ${UNIVERSE_PATH}`
      );
    }
  }

  const url = bustCache ? `${UNIVERSE_PATH}?v=${Date.now()}` : UNIVERSE_PATH;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${UNIVERSE_PATH} (${res.status})`);
  return await res.json();
}

export function saveUniverseJson(universe) {
  localStorage.setItem(UNIVERSE_KEY, JSON.stringify(universe, null, 2));
}

export function clearUniverseJsonOverride() {
  localStorage.removeItem(UNIVERSE_KEY);
}

/* -------------------- Activity Catalog -------------------- */
export async function loadActivitiesCatalog({ allowLocalOverride = false, bustCache = true } = {}) {
  if (allowLocalOverride) {
    const raw = localStorage.getItem(CATALOG_KEY);
    if (raw) return JSON.parse(raw);
  }

  const url = bustCache ? `${CATALOG_PATH}?v=${Date.now()}` : CATALOG_PATH;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${CATALOG_PATH} (${res.status})`);
  const json = await res.json();

  // Normalize expected shape
  if (!json || typeof json !== "object") {
    throw new Error("activities_catalog.json is not a valid JSON object");
  }
  if (!json.types || typeof json.types !== "object") {
    json.types = {};
  }
  return json;
}

export function saveActivitiesCatalog(catalog) {
  localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog, null, 2));
}

export function clearActivitiesCatalogOverride() {
  localStorage.removeItem(CATALOG_KEY);
}

/* -------------------- Combined loader -------------------- */
export async function loadAllData({
  allowUniverseLocalOverride = false,
  allowCatalogLocalOverride = false,
  bustCache = true
} = {}) {
  const [universe, catalog] = await Promise.all([
    loadUniverseJson({ allowLocalOverride: allowUniverseLocalOverride, bustCache }),
    loadActivitiesCatalog({ allowLocalOverride: allowCatalogLocalOverride, bustCache })
  ]);
  return { universe, catalog };
}

/* -------------------- File helpers -------------------- */
export function downloadJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

export async function pickJsonFile() {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return reject(new Error("No file selected"));
      const text = await file.text();
      resolve({ file, json: JSON.parse(text) });
    };
    input.click();
  });
}

/* -------------------- Theme resolver -------------------- */
export function getThemeFromCatalog(catalog, type) {
  const t = catalog?.types?.[type];
  if (t) return t;
  return { color: "#9AA6B2", icon: "•", label: type || "Unknown" };
}
