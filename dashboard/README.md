# Library Desk Availability Dashboard

A minimal, responsive React dashboard showing real-time desk availability for a library reading room. Built with **React 19**, **TypeScript**, **Vite**, and **TailwindCSS v4**.

## Features

- Top-down room schematic with 12 desk + chair tiles
- Live (mock) sensor event simulation every 3–6 seconds
- Occupied / Available state with colour-coded indicators
- Noise band display (silent, quiet, moderate, loud)
- Click/tap a desk to open a details panel (side panel on desktop, bottom sheet on mobile)
- Full keyboard accessibility (Tab + Enter/Space)
- Responsive at 375 px (mobile) and 1440 px (desktop)
- Simulation toggle switch

---

## Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9

---

## Install

```bash
cd dashboard
npm install
```

---

## Run (development)

```bash
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

---

## Build (production)

```bash
npm run build
```

Output is written to `dist/`. Preview it locally:

```bash
npm run preview
```

---

## Project Structure

```
dashboard/
  src/
    components/
      HeaderBar.tsx        # Title bar, live badge, timestamp, simulation toggle
      RoomView.tsx         # Room schematic grid of desks
      DeskTile.tsx         # Individual desk card with SVG icon
      DeskDetailsPanel.tsx # Side panel / bottom sheet with desk details
    hooks/
      useMockDeskEvents.ts # Mock sensor event generator
    types.ts               # DeskState & NoiseBand types
    App.tsx                # Root layout
    main.tsx               # Entry point
    index.css              # Tailwind import
```

---

## Extending

To replace mock data with Supabase real-time:

1. Replace `useMockDeskEvents` internals with a Supabase subscription.
2. The `DeskState` type and all components remain unchanged.

---

## License

MIT
