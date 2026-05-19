# Treasure of the Pirate Kings — Steps 1–3 Design Spec

**Date:** 2026-05-19
**Scope:** Database schema, hex map component, session creation + team join flow
**Stack:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui, PostgreSQL + Prisma, Socket.io
**Deployment:** Railway (containerized Node.js with native WebSocket support)
**Project:** Separate project from Star Pact — own repo, own schema, own deployment

---

## 1. Database Schema (Prisma)

### 1.1 Entities

**GameSession** — top-level container for a single game run.
- `id` (cuid), `status` (enum: LOBBY, ACTIVE, ENDED), `currentDay` (Int, default 0)
- `timerEnd` (DateTime?), `timerRunning` (Boolean, default false)
- `createdAt` (DateTime)
- Relations: has many Teams, has many MapLocations, has one WeatherSchedule

**Team** — a competing pirate crew.
- `id` (cuid), `sessionId` (FK), `name` (String), `joinCode` (String, unique)
- `color` (String), `doubloons` (Int, default 1000), `cargoCapacity` (Int, default 1000)
- `currentLocationId` (FK to MapLocation)
- `status` (enum: ACTIVE, STRANDED, SHIPWRECKED, FINISHED)
- `lostUntilDay` (Int?, null when not lost — set to currentDay + 3 when caught in storm without protection)
- Relations: has many Inventory, has many LogEntries, has many Transactions

**Inventory** — one row per resource type per team (max 5 rows per team).
- `id` (cuid), `teamId` (FK)
- `resourceType` (enum: WATER, PROVISIONS, RIGGING, SPYGLASS, TREASURE)
- `quantity` (Int), `totalWeight` (Int)
- Unique constraint: (teamId, resourceType)
- Rigging uses are tracked via quantity (starts at 3, decrements on use)

**LogEntry** — one per team per day, records movement and consumption.
- `id` (cuid), `teamId` (FK), `dayNumber` (Int)
- `fromLocationId` (FK?), `toLocationId` (FK?)
- `weather` (String), `provisionsConsumed` (Int), `waterConsumed` (Int)
- `riggingUsed` (Boolean), `spyglassUsed` (Boolean)
- `treasureEarned` (Int), `wasLost` (Boolean)

**MapLocation** — a node on the 8x8 hex grid.
- `id` (cuid), `sessionId` (FK), `name` (String)
- `type` (enum: HOME_PORT, TREASURE_ISLAND, TRADING_POST, FRIENDLY_COVE, KRAKEN_LAIR, OPEN_SEA)
- `gridX` (Int), `gridY` (Int)
- `weatherZone` (enum: SAFE, KRAKEN, OPEN_SEA)
- Adjacency computed from grid coordinates at runtime (no join table)

**WeatherSchedule** — 25-day weather data, 1:1 with session.
- `id` (cuid), `sessionId` (FK, unique)
- `dayData` (Json — array of 25 objects, each with weather per zone)

**Transaction** — audit trail for purchases and consumption.
- `id` (cuid), `teamId` (FK), `dayNumber` (Int)
- `type` (enum: PURCHASE, CONSUME)
- `resourceType` (String), `quantity` (Int), `cost` (Int?)
- `locationId` (FK?)
- `createdAt` (DateTime)

### 1.2 Key Design Decisions

- **Adjacency via grid math:** hex neighbors computed from (gridX, gridY) using offset coordinate rules for even/odd rows. No adjacency table needed. Supports future custom maps by just changing coordinates.
- **Inventory as rows, not JSON:** one row per resource type per team. Atomic updates, easy querying, avoids read-modify-write on a JSON blob.
- **Weather as JSON:** the 25-day schedule is read-only reference data loaded once per game. No need to normalize into 75 rows.
- **Team isolation enforced at query level:** every team query filters by teamId. Socket.io rooms enforce broadcast isolation. The API never returns cross-team data.

---

## 2. Hex Map Component

### 2.1 Grid Specification

- **8x8 hex grid** with offset coordinates (odd rows shift right by half a hex width)
- **Home Port at (7,7)** — bottom-right corner
- **Treasure Island at (0,0)** — top-left corner
- Shortest diagonal path through pure open sea: 7 hex moves
- The PRD states "6 moves shortest route" — this is achievable via routes that cut through Trading Posts or Coves positioned on shorter paths. The 1-move difference creates strategic tension: safer open-sea routes cost an extra day vs. shorter routes through specific waypoints.

### 2.2 Location Placement

| Location | Coordinates | Weather Zone |
|---|---|---|
| Treasure Island | (0,0) | SAFE |
| Trading Post 1 | (3,0) | SAFE |
| Friendly Cove 1 | (1,1) | OPEN_SEA |
| Trading Post 2 | (4,1) | SAFE |
| Trading Post 3 | (2,2) | SAFE |
| Kraken's Lair | (4,2) | KRAKEN |
| Trading Post 4 | (6,2) | SAFE |
| Trading Post 5 | (3,3) | SAFE |
| Friendly Cove 2 | (5,4) | OPEN_SEA |
| Trading Post 6 | (1,5) | SAFE |
| Trading Post 7 | (4,6) | SAFE |
| Home Port | (7,7) | SAFE |

All other hexes are Open Sea (weather zone: OPEN_SEA).

### 2.3 Hex Adjacency (Offset Coordinates)

For even rows (y % 2 == 0), neighbors are:
- (x-1, y), (x+1, y), (x-1, y-1), (x, y-1), (x-1, y+1), (x, y+1)

For odd rows (y % 2 == 1), neighbors are:
- (x-1, y), (x+1, y), (x, y-1), (x+1, y-1), (x, y+1), (x+1, y+1)

Neighbors are valid if 0 <= x < 8 and 0 <= y < 8.

### 2.4 Rendering

- **SVG-based** React component. Each hex is a `<polygon>` with click handler.
- Location types have distinct visual styles (colors/icons per type).
- Container supports pinch-to-zoom via CSS `transform: scale()` with touch gesture handling.

### 2.5 Dual View Modes

**Team view (mobile, ~375px):**
- Shows only own ship position (highlighted hex)
- Adjacent hexes glow/pulse as selectable during movement phase
- Tap adjacent hex to select movement destination
- No other team data rendered or sent to client

**Facilitator view (desktop, 1280px+):**
- Shows all team ships with team-colored icons and labels
- Read-only — no interaction needed
- Optimized for projection (large, high contrast)

### 2.6 Component Structure

```
src/components/map/
  HexGrid.tsx        — main SVG grid renderer, accepts mode prop ("team" | "facilitator")
  HexTile.tsx        — individual hex with type-based styling
  ShipMarker.tsx     — team ship icon positioned on a hex
  useHexNeighbors.ts — hook computing valid adjacent hexes for a position
  mapData.ts         — default location placement, hex coordinate utilities
```

---

## 3. Session Creation & Team Join Flow

### 3.1 Session Lifecycle

LOBBY → ACTIVE → ENDED

- **LOBBY:** Facilitator creates session, teams join with codes. Facilitator sees connection status.
- **ACTIVE:** Facilitator clicks "Start Voyage". Day 1 begins. Game runs for 25 days.
- **ENDED:** Day 25 completes or facilitator clicks "End Voyage". Scoreboard displayed.

### 3.2 Join Code Format

`{SESSION_PREFIX}-{TEAM_LETTER}{NUMBER}`

- Session prefix: 6 random uppercase alphanumeric characters (e.g., "KRAKEN")
- Team suffix: letter A-Z + sequential number (e.g., A1, B2, C3)
- Full example: `KRAKEN-A1`
- Unique per session. Human-readable, easy to type on a phone keyboard.

### 3.3 Facilitator Flow (Desktop)

1. Facilitator visits `/facilitator` → clicks "New Game"
2. Enters number of teams (2–40), optionally custom team names
3. System creates GameSession (status: LOBBY), generates Teams with join codes, seeds MapLocations and WeatherSchedule
4. Facilitator sees lobby: join URL prominently displayed (projectable), grid of teams with codes, colors, and connection status
5. As captains join, their team card flips to "Connected" (green) in real-time via Socket.io
6. Facilitator clicks "Start Voyage" → session status changes to ACTIVE, Day 0→1, all clients receive game-start event

### 3.4 Captain Flow (Mobile)

1. Captain opens `/join` on their phone
2. Types the join code shown on the projector
3. POST `/api/game/join` validates the code → returns team data + session info
4. Client opens Socket.io connection, joins room `team:{teamId}`
5. Dashboard loads: team name/color, starting doubloons (1000), cargo capacity (1000 tons), position (Home Port)
6. Shows "Waiting for voyage to begin..." until facilitator starts the game
7. On game-start event: dashboard transitions to active game mode (map + inventory + buy panel)

### 3.5 Socket.io Room Structure

- `session:{sessionId}` — facilitator joins this. Receives all team connection events, all position updates (for god-view map).
- `team:{teamId}` — each captain joins their team room only. Receives: weather announcements, timer updates, own team state changes.
- `game:{sessionId}` — broadcast channel for global events (weather, day advance, timer). All connected clients join this.

### 3.6 Reconnection

- Join code stored in `sessionStorage` on the captain's phone
- On page refresh or reconnect, client checks sessionStorage for existing code and auto-rejoins
- Server re-sends full current state on reconnect (day, weather, inventory, position, timer)
- Socket.io handles network drops with automatic reconnection + exponential backoff

### 3.7 Authentication

- **Captains:** no auth. Join code is the credential. Valid for the duration of the session.
- **Facilitator:** skip auth for MVP. Anyone who visits `/facilitator` can create/manage games. Add email/password later.

### 3.8 API Routes

```
POST /api/game/create     — facilitator creates session (body: { teamCount, teamNames? })
POST /api/game/join        — captain joins with code (body: { joinCode })
GET  /api/game/:sessionId  — facilitator fetches session state
POST /api/game/start       — facilitator starts the voyage
```

### 3.9 Page Routes

```
/facilitator          — create game, lobby, day controls (desktop)
/join                 — enter join code (mobile)
/play/:teamId         — team dashboard with map, inventory, orders (mobile)
```

---

## 4. Default Weather Schedule

Hardcoded from the PRD. 25 days, 3 zones each.

| Day | Open Sea & Coves | Kraken's Lair | Trading Posts & Treasure Island |
|---|---|---|---|
| 1 | Clear | Clear | Clear |
| 2 | Tempest | Tempest | Clear |
| 3 | Tempest | Clear | Clear |
| 4 | Doldrums | Doldrums | Clear |
| 5 | Clear | Clear | Clear |
| 6 | Clear | Tempest | Clear |
| 7 | Clear | Clear | Clear |
| 8 | Doldrums | Maelstrom | Clear |
| 9 | Clear | Clear | Clear |
| 10 | Tempest | Tempest | Clear |
| 11 | Tempest | Clear | Clear |
| 12 | Maelstrom | Maelstrom | Clear |
| 13 | Clear | Clear | Clear |
| 14 | Clear | Tempest | Clear |
| 15 | Clear | Clear | Clear |
| 16 | Doldrums | Maelstrom | Clear |
| 17 | Clear | Clear | Clear |
| 18 | Clear | Tempest | Clear |
| 19 | Tempest | Clear | Clear |
| 20 | Maelstrom | Maelstrom | Clear |
| 21 | Clear | Clear | Clear |
| 22 | Clear | Tempest | Clear |
| 23 | Clear | Clear | Clear |
| 24 | Doldrums | Maelstrom | Clear |
| 25 | Clear | Clear | Clear |

---

## 5. Out of Scope (This Spec)

These are later build steps (4–9) covered by the PRD but not designed here:
- Resource purchasing system
- Day progression + weather announcement + timer
- Movement + consumption engine
- Storm rigging + spyglass logic
- Stranded/elimination handling
- End game + scoreboard
- Facilitator auth
- Pirate visual theme (shadcn defaults for now)
