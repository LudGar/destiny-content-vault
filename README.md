# Destiny Universe Director

A web-based **Destiny-style Director & Location Map** built for archiving, visualizing, and exploring a fictional or canonical game universe.

This project focuses on:
- A **solar-system Director view** with planets, moons, and orbital locations
- **Per-location maps** with interactive activity nodes
- Clean, data-driven rendering inspired by Destiny’s UI language

The tool is designed to be **static-host friendly**, fully client-side, and easy to extend via JSON.

---

## Overview

The Director consists of two main views:

### 🌌 Director View
- Displays stars, planets, moons, and destinations along a centered system line
- Moons and orbital locations are stacked **above** their parent body
- Surface locations are stacked **below** their parent body
- Lines visually connect bodies to their moons and locations
- Clicking a location enters its map

### 🗺 Location View
- Displays a high-resolution map image at **1:1 scale**
- Map can be panned freely
- Activity nodes are placed in pixel space
- Nodes show detailed tooltips on hover
- Nodes can represent activities, vendors, landing zones, etc.

---

## Activity Nodes

Each node represents an interactable point on a location map.

Nodes support:
- Name and type
- Theme-based icon and color
- Description text
- Enemy factions
- Bosses
- Enabled / disabled state
- Pixel-precise positioning

Tooltips dynamically display this data when hovering a node.

---

## Data-Driven Design

All content is driven by JSON files.

### `universe.json`
Defines:
- Solar system bodies (stars, planets, moons)
- Locations linked to bodies
- Per-location maps
- Activity nodes and their metadata

### `activities_catalog.json`
Defines:
- Activity types (Patrol, Strike, Lost Sector, Vendor, Landing Zone, etc.)
- Theme data:
  - Label
  - Icon
  - Color
- Used consistently across Director, Location maps, and tooltips

---

## Rendering Details

### Director
- Layout responds to window resizing
- SVG is used only for connector lines
- Nodes and labels are DOM-based for clarity and interaction

### Icons
- Body icons may be PNGs
- Automatic fallback to glyph icons if an image fails to load

---

## Tooltips

- Activity name
- Activity type
- Description
- Enemy factions
- Bosses
- Status (active / disabled)

---

## Goals & Philosophy

- Built to scale with large universes and dense maps
- Prioritizes clarity, alignment, and visual hierarchy

---

## Hosting

The project runs entirely client-side and can be hosted on:
- Any static file host
- Local `http-server` / `python -m http.server`

No build step required.

---

## Status

Actively evolving as a universe visualization framework.
