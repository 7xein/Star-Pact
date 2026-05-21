# Playtest Prep: Prisma Tests, Mobile Responsiveness, Projector Polish

**Date:** 2026-05-21
**Status:** Approved
**Scope:** Three focused fixes to unblock local playtesting

---

## 1. Fix Prisma Client Generation for Tests

### Problem

`src/lib/__tests__/game-actions.test.ts` fails with "Cannot find package '@/generated/prisma/client'" because the Prisma client is gitignored (correctly) but never generated before tests run.

### Fix

Add `prisma generate` to `package.json` scripts:

- Add `"pretest": "prisma generate"` so the client exists before vitest runs
- Add `prisma generate` to the `dev` script so the client exists during development

No mocking changes, no structural changes. The test is correct; it just needs the generated client on disk.

### Files

- Modify: `package.json` (add/update scripts)

### Acceptance Criteria

- `npx vitest run` passes all test suites including `game-actions.test.ts`
- `npm run dev` generates the Prisma client before starting

---

## 2. Mobile Responsiveness (Team Captain at 375px)

### Problem

Team captains play on their phones. The hex map overflows at 375px, the buy panel cramps, and header elements collide.

### Screens Affected

Captain sees 4 states: Join -> Lobby -> Active Game -> Scoreboard.

### Fixes by Component

#### HexGrid / MapContainer (`components/map/HexGrid.tsx`, `components/map/MapContainer.tsx`)

- Make SVG responsive: use `viewBox` + `width="100%"` so it fills container width
- Hide hex tile location name text at small viewports (fontSize 9 is illegible at 375px) — show only when zoomed past 2x
- Ensure tap targets on adjacent hexes remain >= 44px effective size (iOS minimum)
- The existing pinch-zoom (scale 1-3x) stays; map should start fitting within viewport width

#### BuyPanel (`components/game/BuyPanel.tsx`)

- Stack each resource as a full-width row: name/price on left, quantity controls on right
- Reduce padding, use `text-sm` throughout
- Ensure +/- buttons are at least 44px tap targets

#### Header (`app/play/[teamId]/page.tsx`)

- Stack day number above timer instead of side-by-side at mobile widths
- Timer: `text-base md:text-lg`

#### Inventory Grid (`app/play/[teamId]/page.tsx`)

- Change from 3 columns to 2 on mobile: `grid-cols-2 md:grid-cols-3`

#### Join Page (`app/join/page.tsx`)

- Input font: `text-lg md:text-2xl` (currently `text-2xl` overflows with join code)

#### Scoreboard Overlay

- No changes needed. `max-w-md` + `p-4` padding = 343px at 375px viewport. Team name `truncate` handles overflow.

### Files

- Modify: `src/components/map/HexGrid.tsx`
- Modify: `src/components/map/MapContainer.tsx`
- Modify: `src/components/game/BuyPanel.tsx`
- Modify: `src/app/play/[teamId]/page.tsx`
- Modify: `src/app/join/page.tsx`

### Acceptance Criteria

- All captain screens render without horizontal overflow at 375px
- Hex map fits within viewport width; no horizontal scroll
- Adjacent hex tap targets >= 44px effective size
- BuyPanel resource rows don't wrap/overlap at 375px
- Join code input doesn't overflow

---

## 3. Facilitator Projector Polish (Responsive Scaling)

### Problem

The facilitator page gets projected for a room of players. Text sizes (12-24px) are unreadable from 20ft. Need 2-4x scaling at wide viewports.

### Approach

CSS breakpoints at `xl` (>=1280px) and `2xl` (>=1536px). No toggle, no separate route. Facilitator fullscreens Chrome on the projector and it scales up automatically.

### Size Scaling Table

| Element | Default | xl (>=1280px) | 2xl (>=1536px) |
|---------|---------|---------------|----------------|
| Day number | text-2xl | text-5xl | text-6xl |
| Timer digits | text-lg | text-4xl | text-5xl |
| Weather zone label | text-xs | text-lg | text-xl |
| Weather icon | text-xl | text-4xl | text-5xl |
| Weather type label | text-sm | text-xl | text-2xl |
| Team card name | text-sm | text-lg | text-xl |
| Team status badge | text-xs | text-base | text-lg |
| Team color dot | h-3 w-3 | h-4 w-4 | h-5 w-5 |

### Lobby Phase

- Join URL: scale from `text-2xl` to `xl:text-5xl 2xl:text-6xl`
- Team join code cards: scale up code text and connection status indicators

### Scoreboard Phase

- "Voyage Complete" heading: scale up at wide viewports
- Score rows: rank, team name, treasure, status all bump proportionally

### Timer Detail

- Add `xl:tracking-wider` so monospace digits don't blur on projectors
- Red pulse animation (<30s) stays — already high contrast

### Layout

- `max-w-6xl` container stays (keeps layout centered on ultrawide)
- Map SVG scales naturally via container width
- Weather 3-column grid keeps `grid-cols-3` — text scaling is sufficient at wide viewports

### Files

- Modify: `src/app/facilitator/page.tsx`
- Modify: `src/components/game/DayTimer.tsx`
- Modify: `src/components/game/WeatherDisplay.tsx`
- Modify: `src/components/game/DayControls.tsx`
- Modify: `src/components/game/Scoreboard.tsx`

### Acceptance Criteria

- Day number and timer readable from 20ft at 1280px+ projected resolution
- Weather zone names and icons clearly visible at projector distance
- Team status cards (name + status) readable at distance
- Join URL in lobby phase is the most prominent element on screen
- No layout breakage at intermediate widths (768px-1279px)

---

## Out of Scope

- Trading between teams
- Fog of war
- Sound effects / animations
- Session history / replay
- Deployment setup
