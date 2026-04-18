# Urban Wildlife Hunt

A fully immersive, community-driven wildlife sighting platform built as a live, shared map experience. Users explore a dark, AllTrails-style interface centred on an interactive map of the world where anyone can click anywhere to instantly log an animal sighting. Every submission is saved to a global database and visible to all users in near real-time, turning the map into a living representation of urban biodiversity.

## Features

- **Live interactive map** — Full-screen dark map powered by Leaflet.js with CartoDB Dark Matter tiles. Glowing animal markers appear as users log sightings worldwide.
- **One-click logging** — Click any point on the map to open the sighting modal. Enter an animal name and optional note; the system auto-detects the category (bird, mammal, reptile, amphibian, insect) and shows a preview.
- **Global shared database** — All sightings are persisted to Netlify Blobs and polled every 6 seconds so every visitor sees the same evolving ecosystem.
- **Wildlife routes** — Toggle an overlay that draws animated dashed lines connecting clustered sightings, highlighting biodiversity hotspots and guiding exploration.
- **Insights panel** — Live stats including total sightings, unique species count, biodiversity score, top species bar chart, and category breakdown with neon-coloured tags.
- **Mission system** — Dynamic challenges (Urban Scout, Naturalist, Field Researcher, Bird Watcher, Mammal Tracker) with progress bars that update as the community adds sightings.
- **Community feed** — Scrollable live feed showing the most recent sightings with species, coordinates, notes, and timestamps.
- **Category-coded markers** — Each animal category has a distinct neon colour with glowing box-shadow effects; new markers animate in with a spin and pulse.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | TanStack Start (React 19, TanStack Router v1) |
| Build | Vite 7 |
| Styling | Tailwind CSS 4 + custom CSS animations |
| Map | Leaflet.js (dynamic import, SSR-safe) |
| Data storage | Netlify Blobs (persistent key-value store) |
| API | TanStack Start server routes (`/api/sightings`) |
| Deployment | Netlify |
| Language | TypeScript 5.7 (strict mode) |

## Running Locally

```bash
# Install dependencies
npm install

# Start the Netlify dev server (includes Blobs emulation)
npx netlify dev
```

The app will be available at `http://localhost:8888`.

> **Note:** Netlify Blobs requires at least one production deploy to work locally. Run `npx netlify deploy` first, or use `netlify dev` which emulates the Blobs environment automatically via the Netlify Vite plugin.

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/sightings` | Returns all sightings as a JSON array, sorted by most recent |
| `POST` | `/api/sightings` | Creates a new sighting. Body: `{ lat, lng, animal, note? }` |

## Project Structure

```
src/
├── routes/
│   ├── __root.tsx          # HTML shell, global styles
│   ├── index.tsx           # Full map interface + all UI panels
│   └── api/
│       └── sightings.ts    # GET + POST API backed by Netlify Blobs
└── styles.css              # Dark theme, Leaflet overrides, animations
```
