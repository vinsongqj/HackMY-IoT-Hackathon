# Frontend fix brief — for whoever/whatever fixes `parking-dashboard`

Copy this whole file as the prompt. The backend is done, tested live, and running on `http://localhost:8000` — this brief covers only what's broken on the frontend side.

## Context

`frontend/parking-dashboard` is a React + TypeScript + Vite project. The types (`src/types.ts`) and API clients (`src/api.operator.ts`, `src/api.admin.ts`, `src/api.http.ts`, `src/useEvents.ts`) are already correctly designed and should NOT be changed structurally — the backend was built to match them. What's broken is that the app was never actually finished: dependencies were never installed, several UI components referenced in the page files don't exist, and the pages aren't wired into the app.

## Fix these, in order

### 1. Install dependencies
```
cd frontend/parking-dashboard
npm install
```
Also add what's missing from `package.json` — there's no routing library and no chart library, both needed:
```
npm install react-router-dom
```
(A chart library is only needed once `/api/admin/*` work is tackled — skip for now, see "Out of scope" below.)

### 2. Build the missing components
`src/pages/OperatorDashboard.tsx` and `src/pages/AdminDashboard.tsx` reference these components, none of which exist anywhere in the codebase:
- `BarrierCard` — props: `{ barrier: Barrier, onOpen: () => void, onClose: () => void, onRepair: () => void }` (see `Barrier` type in `types.ts`)
- `CarCard` — props: `{ car: Car, onIssueInvoice: () => void, onValidatePayment: () => void }` (see `Car`/`Invoice` types)
- `PenaltyRow` — props: `{ penalty: Penalty }` (see `Penalty` type)
- `StatCard` — props: `{ label: string, value: string | number }`
- `LogTable` — props: `{ logs: RequestLog[] }` (see `RequestLog` type) — **defer this one**, see "Out of scope"

Create these as simple presentational components (e.g. `src/components/BarrierCard.tsx` etc.) — plain divs/buttons are fine, styling can come later. Import them into the two page files where they're used.

### 3. Wire up `App.tsx`
Right now `App.tsx` doesn't render either dashboard page — it just shows an inline placeholder. Add `react-router-dom` and route to `OperatorDashboard` (this works today) — leave `AdminDashboard` unrouted or behind a clearly-disabled nav link (see "Out of scope").

### 4. Confirm the dev proxy still matches
`vite.config.ts` already proxies `/api` and `/ws` to `http://localhost:8000` — **do not change this**, it already matches where the backend runs. Just run:
```
npm run dev
```
with the backend (`cd backend && uv run uvicorn main:app --port 8000 --app-dir src`) and the simulator running alongside it, and confirm the Operator Dashboard loads real data and updates live.

## Real backend contract — read before assuming anything

Every `/api/operator/*` endpoint in `api.operator.ts` is implemented and live-tested. The WebSocket at `/ws/events` is also live and sends events shaped like `SimEvent` in `types.ts` (`CarIn`, `CarParked`, `CarLeftSpot`, `CarOut`, `GateOpened`, `GateClosed`, `ComponentBroken`, `ComponentRepaired`, `PaymentReceived`, `PaymentFailed`, `Penalty`, `Co2Changed`).

**Important — some backend values don't match the current TypeScript types, and the fix is to update the types, not the backend** (the backend intentionally passes through real simulator values unchanged, per team decision):
- `CarType` — real values include `"Normal"`, not just `"Electric"`/`"Fuel"`. Update `types.ts`'s `CarType` to `"Normal" | "Electric" | string` (or similarly permissive) rather than assuming only two values.
- CO `DangerLevel`/`RiskLevel` — real values are `Safe | Mid | High | Critical`, not `Safe | Low | Moderate | High`. Update `RiskLevel` in `types.ts` to match.
- `Penalty.type` — the real `penalty` webhook only gives a freeform reason string (e.g. `"Car is being charged wrongly with amount: (2.00)..."`), not a structured enum like `WrongSpotType`/`OccupiedSpot`. The backend puts this raw string into both `type` and `reason`. Treat `Penalty.type` as a string, not a fixed union, or drop the `PenaltyType` union and just render `reason`.
- `Penalty.plate` — usually `null` for component-related penalties (most of what you'll see); don't assume it's always populated.

## Out of scope for now — don't try to fix these

- **`/api/admin/*` is not implemented yet** (`getStats`, `getLogs`, `getRevenueSeries`, `getOccupancySeries` will all fail). Leave `AdminDashboard.tsx` disconnected/hidden behind a "coming soon" state rather than trying to make it work — building the admin backend endpoints is a separate, later task.
- **Auth/roles (Admin vs Operator login)** — explicitly not built on the backend side yet. Don't gate the UI behind a login for now.
- Don't touch `api.operator.ts`, `api.admin.ts`, `api.http.ts`, `useEvents.ts`, or `types.ts`'s overall shape — only the specific type-narrowing fixes listed above. These already match the backend contract; changing their structure would break the match.

## How to verify it's actually working

1. `npm run dev` (frontend), backend running on 8000, simulator running.
2. Operator Dashboard should load and show real barriers/spots/cars/lights/zones/penalties on first render.
3. As cars move in the simulator, the dashboard should update live via the WebSocket — watch the browser's Network tab (WS frames) or just watch state change without manual refresh.
4. Click a barrier's open/close/repair button — confirm it visibly changes state in the simulator window itself, not just in the UI.
