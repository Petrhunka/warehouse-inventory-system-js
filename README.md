# Warehouse Inventory System

Interactive warehouse management tool with 3D/2D visualization, inventory
reporting, and a stocktaking assistant. Built as a static Next.js application
and deployed behind nginx on Keboola.

## Tech stack

- **Next.js 16** (App Router, `output: 'export'` for static hosting)
- **React 19** + **TypeScript** (strict mode)
- **Tailwind CSS 3** for styling
- **Plotly.js** (via `react-plotly.js`) for 3D and 2D visualizations
- **localStorage** for client-side data persistence (no backend)

## Getting started

```bash
npm install
npm run dev
```

App runs at <http://localhost:3000>.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Produce a static export into `out/` |
| `npm run start` | Serve the production build (non-static mode) |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run `tsc --noEmit` |
| `npm run format` | Format the codebase with Prettier |
| `npm run format:check` | Verify formatting without writing |
| `npm test` | Run the Vitest test suite |

## Project layout

```
src/
  app/              Next.js app router entry points (layout, page, error)
  components/       React components for the three tabs
  lib/              Data generation, utils, visualization helpers
  types/            Shared TypeScript types
  hooks/            Reusable React hooks
keboola-config/     Deployment config (nginx + supervisord + setup.sh)
```

## Features

- **Warehouse Visualization** — 3D/2D interactive layout with zone/product
  filters, stock-range filter, and understock/overstock highlighting.
- **Inventory Level Reporting** — summary metrics, per-product breakdown,
  inventory balance (CV) analysis, CSV export.
- **Stocktaking Assistant** — focused checklist of locations to verify,
  discrepancy tracking, CSV export.

## Data

Warehouse data is procedurally generated (see `src/lib/warehouse-data.ts`) and
persisted in `localStorage` under the `warehouse_data` key. Use the
"Regenerate Warehouse Data" button in the sidebar to reseed.

To recover from corrupted local data without clicking through the UI:

```js
localStorage.removeItem('warehouse_data');
location.reload();
```

## Deployment

The `keboola-config/` directory contains:

- `setup.sh` — installs deps and runs `next build` (produces `out/`)
- `nginx/sites/app.conf` — serves `out/` on port 8888 with SPA fallback and
  long-cache static assets
- `supervisord/app.conf` — placeholder (no long-running services)
