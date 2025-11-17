"use strict";

function renderDestinationsView() {
  const bgEl = document.getElementById("destinations-background");
  const layerEl = document.getElementById("destinations-map-layer");
  if (!bgEl || !layerEl) return;

  layerEl.style.transform = `translate(${state._destinationsPan.x}px, ${state._destinationsPan.y}px)`;

  let selectedDest = getDestinationById(state.activeDestinationId);
  if (!selectedDest && state.destinations.length > 0) {
    selectedDest = state.destinations[0];
    state.activeDestinationId = selectedDest.id;
  }

  layerEl.innerHTML = "";

  state.destinations.forEach(dest => {
    const node = document.createElement("div");
    node.className = "destination-node";
    node.dataset.destinationId = dest.id;

    const orbit = document.createElement("div");
    orbit.className = "destination-orbit";

    const img = document.createElement("img");
    img.src = dest.icon || "assets/icons/placeholder.png";
    img.alt = dest.name || dest.id || "Destination";
    orbit.appendChild(img);

    if (dest.iconOverlay1) {
      const ov1 = document.createElement("img");
      ov1.src = dest.iconOverlay1;
      ov1.alt = "";
      ov1.className = "destination-overlay-icon destination-overlay-1";
      orbit.appendChild(ov1);
    }

    if (dest.iconOverlay2) {
      const ov2 = document.createElement("img");
      ov2.src = dest.iconOverlay2;
      ov2.alt = "";
      ov2.className = "destination-overlay-icon destination-overlay-2";
      orbit.appendChild(ov2);
    }

    if (dest.iconOverlay3) {
      const ov3 = document.createElement("img");
      ov3.src = dest.iconOverlay3;
      ov3.alt = "";
      ov3.className = "destination-overlay-icon destination-overlay-3";
      orbit.appendChild(ov3);
    }

    const label = document.createElement("div");
    label.className = "destination-label";
    label.textContent = dest.name || dest.id || "Unknown";

    node.appendChild(orbit);
    node.appendChild(label);

    const x = clampInt(dest.position?.x ?? 50, 0, 100);
    const y = clampInt(dest.position?.y ?? 50, 0, 100);
    node.style.left = `${x}%`;
    node.style.top = `${y}%`;

    if (dest.id === state.activeDestinationId) {
      node.classList.add("selected");
    }

    node.addEventListener("click", () => {
      state.activeDestinationId = dest.id;
      state.activeLocationDestinationId = dest.id;
      setActiveTab("locations");
    });

    layerEl.appendChild(node);
  });

  initDestinationsPan();
}

function initDestinationsPan() {
  const layerEl = document.getElementById("destinations-map-layer");
  if (!layerEl) return;

  if (layerEl.dataset.panInit === "1") return;
  layerEl.dataset.panInit = "1";

  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let panStartX = 0;
  let panStartY = 0;

  layerEl.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    if (e.target.closest(".destination-node")) return;

    e.preventDefault();
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    panStartX = state._destinationsPan.x;
    panStartY = state._destinationsPan.y;

    layerEl.classList.add("dragging");

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  });

  function onMouseMove(e) {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;

    state._destinationsPan.x = panStartX + dx;
    state._destinationsPan.y = panStartY + dy;

    layerEl.style.transform = `translate(${state._destinationsPan.x}px, ${state._destinationsPan.y}px)`;
  }

  function onMouseUp() {
    if (!isDragging) return;
    isDragging = false;
    layerEl.classList.remove("dragging");
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  }
}

// ---------------------------------------------------------
// LOCATIONS (Map View + Tooltips)
// ---------------------------------------------------------

let currentActivityTooltip = null;

function renderLocationsView() {
  const listPanel = document.getElementById("locations-list");
  const mapContainer = document.getElementById("location-map-container");
  if (!listPanel || !mapContainer) return;

  if (!state.activeLocationDestinationId && state.destinations.length > 0) {
    state.activeLocationDestinationId = state.destinations[0].id;
  }

  renderLocationsList();
  renderLocationMapAndActivities();
}

function renderLocationsList() {
  const listPanel = document.getElementById("locations-list");
  if (!listPanel) return;

  listPanel.innerHTML = "";

  if (!state.destinations || state.destinations.length === 0) {
    const p = document.createElement("p");
    p.textContent = "No destinations yet.";
    p.style.fontSize = "12px";
    p.style.color = "#9da8c5";
    listPanel.appendChild(p);
    return;
  }

  state.destinations.forEach(dest => {
    const item = document.createElement("div");
    item.className = "location-list-item";
    item.dataset.destinationId = dest.id;

    if (dest.id === state.activeLocationDestinationId) {
      item.classList.add("active");
    }

    const icon = document.createElement("img");
    icon.className = "location-list-icon";
    icon.src = dest.icon || "assets/icons/placeholder.png";
    icon.alt = dest.name || dest.id || "Destination";

    const info = document.createElement("div");
    info.className = "location-list-info";

    const nameEl = document.createElement("div");
    nameEl.className = "location-list-name";
    nameEl.textContent = dest.name || dest.id || "Unknown";

    const meta = document.createElement("div");
    meta.className = "location-list-meta";
    const actCount = (dest.activities || []).length;
    const game = dest.game || "Unknown";
    const type = dest.type || "Location";
    meta.textContent = `${game} · ${type} · ${actCount} activities`;

    info.appendChild(nameEl);
    info.appendChild(meta);

    item.appendChild(icon);
    item.appendChild(info);

    item.addEventListener("click", () => {
      state.activeLocationDestinationId = dest.id;
      renderLocationsList();
      renderLocationMapAndActivities();
    });

    listPanel.appendChild(item);
  });
}

function renderLocationMapAndActivities() {
  const titleEl = document.getElementById("location-title");
  const metaEl = document.getElementById("location-meta");
  const mapImageEl = document.getElementById("location-map-image");
  const activityLayer = document.getElementById("location-activity-layer");
  const mapInner = document.getElementById("location-map-inner");
  const mapContainer = document.getElementById("location-map-container");

  if (!titleEl || !metaEl || !mapImageEl || !activityLayer || !mapInner || !mapContainer) return;

  activityLayer.innerHTML = "";
  removeActivityTooltip();

  const dest = getDestinationById(state.activeLocationDestinationId);
  if (!dest) {
    titleEl.textContent = "Select a Destination";
    metaEl.textContent = "";
    mapImageEl.removeAttribute("src");
    mapImageEl.alt = "";
    mapInner.style.transform = "translate(0px, 0px)";
    state._locationPan.x = 0;
    state._locationPan.y = 0;
    return;
  }

  titleEl.textContent = (dest.name || dest.id || "Unknown").toUpperCase();
  const actCount = (dest.activities || []).length;
  const game = dest.game || "Unknown";
  const type = dest.type || "Location";
  const countLabel = actCount === 1 ? "1 activity" : `${actCount} activities`;
  metaEl.textContent = `${game} · ${type} · ${countLabel}`;

  const mapUrl =
    dest.mapImage ||
    "assets/maps/default_location_map.jpg";

  mapImageEl.src = mapUrl;
  mapImageEl.alt = `${dest.name || dest.id || "Destination"} map`;

  state._locationPan.x = 0;
  state._locationPan.y = 0;
  mapInner.style.transform = "translate(0px, 0px)";

  (dest.activities || []).forEach(act => {
    const node = document.createElement("div");
    node.className = "activity-node";
    node.dataset.destinationId = dest.id;
    node.dataset.activityId = act.id;

    const orbit = document.createElement("div");
    orbit.className = "activity-orbit";

    const icon = document.createElement("img");
    icon.src = act.thumbnail || dest.icon || "assets/icons/placeholder.png";
    icon.alt = act.name || "Activity";
    orbit.appendChild(icon);

    const label = document.createElement("div");
    label.className = "activity-label";
    label.textContent = act.shortName || act.name || "";

    node.appendChild(orbit);
    node.appendChild(label);

    const x = clampInt(act.position?.x ?? 50, 0, 100);
    const y = clampInt(act.position?.y ?? 50, 0, 100);
    node.style.left = `${x}%`;
    node.style.top = `${y}%`;

    node.addEventListener("mouseenter", (e) => {
      showActivityTooltip(e.currentTarget, dest, act);
    });

    node.addEventListener("mousemove", (e) => {
      positionActivityTooltip(e.clientX, e.clientY);
    });

    node.addEventListener("mouseleave", () => {
      removeActivityTooltip();
    });

    activityLayer.appendChild(node);
  });

  initLocationMapPan();
}

function initLocationMapPan() {
  const container = document.getElementById("location-map-container");
  const inner = document.getElementById("location-map-inner");
  if (!container || !inner) return;

  if (inner.dataset.panInit === "1") return;
  inner.dataset.panInit = "1";

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let panStartX = 0;
  let panStartY = 0;

  inner.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    if (e.target.closest(".activity-node")) return; // nodes not draggable in viewer

    e.preventDefault();
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    panStartX = state._locationPan.x;
    panStartY = state._locationPan.y;

    inner.classList.add("dragging");

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  });

  function onMouseMove(e) {
    if (!isDragging) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    state._locationPan.x = panStartX + dx;
    state._locationPan.y = panStartY + dy;

    inner.style.transform = `translate(${state._locationPan.x}px, ${state._locationPan.y}px)`;
  }

  function onMouseUp() {
    if (!isDragging) return;
    isDragging = false;
    inner.classList.remove("dragging");
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  }
}

// ---------------------- Tooltip ----------------------

function showActivityTooltip(nodeEl, dest, act) {
  removeActivityTooltip();

  const layer = document.getElementById("location-map-container");
  if (!layer) return;

  const tooltip = document.createElement("div");
  tooltip.className = "activity-tooltip";

  const header = document.createElement("div");
  header.className = "activity-tooltip-header";

  const thumb = document.createElement("img");
  thumb.className = "activity-tooltip-thumb";
  thumb.src = act.thumbnail || dest.icon || "assets/icons/placeholder.png";
  thumb.alt = act.name || "Activity";

  const headerText = document.createElement("div");

  const title = document.createElement("div");
  title.className = "activity-tooltip-title";
  title.textContent = act.name || "Unknown Activity";

  const meta = document.createElement("div");
  meta.className = "activity-tooltip-meta";
  const mode = act.modeType || act.category || "Mode";
  const light = (typeof act.recommendedLight === "number")
    ? ` · ✦ ${act.recommendedLight}`
    : "";
  const metaSpan = document.createElement("div");
  metaSpan.textContent = `${mode}${light}`;
  meta.appendChild(metaSpan);

  headerText.appendChild(title);
  headerText.appendChild(meta);

  header.appendChild(thumb);
  header.appendChild(headerText);

  tooltip.appendChild(header);

  if (act.description) {
    const body = document.createElement("div");
    body.className = "activity-tooltip-body";
    body.textContent = act.description;
    tooltip.appendChild(body);
  }

  if (Array.isArray(act.tags) && act.tags.length > 0) {
    const tagsRow = document.createElement("div");
    tagsRow.className = "activity-tooltip-tags";

    act.tags.forEach(tag => {
      const pill = document.createElement("span");
      pill.className = "activity-tooltip-tag";
      pill.textContent = tag;
      tagsRow.appendChild(pill);
    });

    tooltip.appendChild(tagsRow);
  }

  layer.appendChild(tooltip);
  currentActivityTooltip = tooltip;

  const nodeRect = nodeEl.getBoundingClientRect();
  const layerRect = layer.getBoundingClientRect();

  const centerX = nodeRect.left + nodeRect.width / 2;
  const centerY = nodeRect.top + nodeRect.height / 2;

  const offsetX = 12;
  const offsetY = -20;

  let left = centerX - layerRect.left + offsetX;
  let top = centerY - layerRect.top + offsetY;

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;

  requestAnimationFrame(() => {
    clampTooltipWithinContainer(layer, tooltip);
  });
}

function positionActivityTooltip(clientX, clientY) {
  if (!currentActivityTooltip) return;

  const layer = document.getElementById("location-map-container");
  if (!layer) return;

  const layerRect = layer.getBoundingClientRect();
  const tooltip = currentActivityTooltip;

  const offsetX = 16;
  const offsetY = 8;

  let left = clientX - layerRect.left + offsetX;
  let top = clientY - layerRect.top + offsetY;

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;

  clampTooltipWithinContainer(layer, tooltip);
}

function clampTooltipWithinContainer(container, tooltip) {
  const containerRect = container.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();

  let left = tooltipRect.left;
  let top = tooltipRect.top;

  const padding = 8;

  if (tooltipRect.right > containerRect.right - padding) {
    left = containerRect.right - padding - tooltipRect.width;
  }
  if (tooltipRect.left < containerRect.left + padding) {
    left = containerRect.left + padding;
  }

  if (tooltipRect.bottom > containerRect.bottom - padding) {
    top = containerRect.bottom - padding - tooltipRect.height;
  }
  if (tooltipRect.top < containerRect.top + padding) {
    top = containerRect.top + padding;
  }

  tooltip.style.left = `${left - containerRect.left}px`;
  tooltip.style.top = `${top - containerRect.top}px`;
}

function removeActivityTooltip() {
  if (currentActivityTooltip && currentActivityTooltip.parentNode) {
    currentActivityTooltip.parentNode.removeChild(currentActivityTooltip);
  }
  currentActivityTooltip = null;
}
