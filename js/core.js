"use strict";

const DATA_URL = "data/destiny_pve_archive.json";

const state = {
  destinations: [],
  allActivities: [],
  activeTab: "destinations",
  activeDestinationId: null,
  activeLocationDestinationId: null,

  _destinationsPan: { x: 0, y: 0 },
  _locationPan: { x: 0, y: 0 }
};

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  loadDataFromFile();
});


// ---------------------- Tabs ----------------------

function initTabs() {
  const tabButtons = document.querySelectorAll(".top-tab-button");

  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      setActiveTab(tab);
    });
  });

  setActiveTab("destinations");
}

function setActiveTab(tab) {
  if (!["destinations", "locations"].includes(tab)) {
    tab = "destinations";
  }
  state.activeTab = tab;

  const tabButtons = document.querySelectorAll(".top-tab-button");
  tabButtons.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });

  const pages = {
    destinations: document.getElementById("page-destinations"),
    locations: document.getElementById("page-locations")
  };

  Object.entries(pages).forEach(([key, el]) => {
    if (!el) return;
    el.classList.toggle("visible", key === tab);
    el.classList.toggle("hidden", key !== tab);
  });

  if (tab === "destinations") {
    if (typeof renderDestinationsView === "function") renderDestinationsView();
  } else if (tab === "locations") {
    if (typeof renderLocationsView === "function") renderLocationsView();
  }
}


// ---------------------- Data loading ----------------------

async function loadDataFromFile() {
  try {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    if (json && Array.isArray(json.destinations)) {
      state.destinations = json.destinations;
    } else {
      console.warn("destiny_pve_archive.json did not contain destinations[]");
      state.destinations = [];
    }
  } catch (err) {
    console.error("Failed to fetch destiny_pve_archive.json:", err);
    state.destinations = [];
  }

  normalizeDestinations();
  rebuildAllActivities();

  if (!state.activeDestinationId && state.destinations.length > 0) {
    state.activeDestinationId = state.destinations[0].id;
  }
  if (!state.activeLocationDestinationId && state.destinations.length > 0) {
    state.activeLocationDestinationId = state.destinations[0].id;
  }

  if (state.activeTab === "destinations") {
    if (typeof renderDestinationsView === "function") renderDestinationsView();
  } else {
    if (typeof renderLocationsView === "function") renderLocationsView();
  }
}

function normalizeDestinations() {
  const dests = state.destinations || [];

  dests.forEach(dest => {
    if (!dest.position) dest.position = { x: 50, y: 50 };
    dest.position.x = clampInt(dest.position.x ?? 50, 0, 100);
    dest.position.y = clampInt(dest.position.y ?? 50, 0, 100);

    dest.iconOverlay1 = dest.iconOverlay1 || "";
    dest.iconOverlay2 = dest.iconOverlay2 || "";
    dest.iconOverlay3 = dest.iconOverlay3 || "";

    if (!dest.mapImage) {
      dest.mapImage = "assets/maps/default_location_map.jpg";
    }

    if (!Array.isArray(dest.activities)) {
      dest.activities = [];
    }

    dest.activities.forEach(act => {
      if (!act.id) {
        act.id = `act_${Math.random().toString(36).slice(2, 10)}`;
      }
      if (!act.position) {
        act.position = { x: 50, y: 50 };
      }
      act.position.x = clampInt(act.position.x ?? 50, 0, 100);
      act.position.y = clampInt(act.position.y ?? 50, 0, 100);

      if (!Array.isArray(act.tags)) {
        if (typeof act.tags === "string") {
          act.tags = act.tags.split(",").map(t => t.trim()).filter(Boolean);
        } else {
          act.tags = [];
        }
      }
    });
  });

  state.destinations = dests;
}

function rebuildAllActivities() {
  const all = [];
  (state.destinations || []).forEach(dest => {
    (dest.activities || []).forEach(act => {
      all.push({
        ...act,
        destinationId: dest.id,
        destinationName: dest.name,
        destinationGame: dest.game,
        destinationType: dest.type
      });
    });
  });
  state.allActivities = all;
}


// ---------------------- Utils ----------------------

function clampInt(value, min, max) {
  let v = parseInt(value, 10);
  if (Number.isNaN(v)) v = min;
  if (v < min) v = min;
  if (v > max) v = max;
  return v;
}

function getDestinationById(id) {
  return (state.destinations || []).find(d => d.id === id) || null;
}

function getActivityById(destId, actId) {
  const dest = getDestinationById(destId);
  if (!dest || !Array.isArray(dest.activities)) return null;
  return dest.activities.find(a => a.id === actId) || null;
}
