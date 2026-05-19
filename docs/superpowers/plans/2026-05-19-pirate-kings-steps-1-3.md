# Treasure of the Pirate Kings — Steps 1–3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the foundation of the pirate simulation game — database schema, interactive hex map, and session/join flow — as a new standalone project.

**Architecture:** Next.js 16 App Router with a custom server for Socket.io WebSocket support. Prisma ORM with PostgreSQL. SVG-based hex map component with dual rendering modes (mobile team view, desktop facilitator view). All game logic is server-authoritative.

**Tech Stack:** Next.js 16.2.1, TypeScript, Tailwind CSS v4, shadcn/ui, PostgreSQL + Prisma 7, Socket.io 4

---

## File Structure

```
pirate-kings/
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── server.ts                          # Custom Node server for Socket.io
├── prisma/
│   ├── schema.prisma                  # All game models
│   └── seed.ts                        # Default map + weather seed
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # Root layout
│   │   ├── globals.css                # Tailwind imports
│   │   ├── page.tsx                   # Landing / redirect
│   │   ├── facilitator/
│   │   │   └── page.tsx               # Create game + lobby (desktop)
│   │   ├── join/
│   │   │   └── page.tsx               # Enter join code (mobile)
│   │   ├── play/
│   │   │   └── [teamId]/
│   │   │       └── page.tsx           # Team dashboard (mobile)
│   │   └── api/
│   │       └── game/
│   │           ├── create/route.ts    # POST: create session
│   │           ├── join/route.ts      # POST: join with code
│   │           ├── [sessionId]/route.ts  # GET: session state
│   │           └── start/route.ts     # POST: start voyage
│   ├── components/
│   │   ├── map/
│   │   │   ├── HexGrid.tsx            # Main SVG grid renderer
│   │   │   ├── HexTile.tsx            # Individual hex styling
│   │   │   ├── ShipMarker.tsx         # Team ship icon
│   │   │   └── MapContainer.tsx       # Wrapper with pinch-to-zoom
│   │   └── ui/                        # shadcn/ui components
│   ├── lib/
│   │   ├── prisma.ts                  # Prisma client singleton
│   │   ├── hex.ts                     # Hex coordinate math + adjacency
│   │   ├── map-data.ts                # Default locations + weather schedule
│   │   ├── socket.ts                  # Socket.io client singleton
│   │   └── game-actions.ts            # Server-side game logic (create, join, start)
│   └── types/
│       └── game.ts                    # Shared TypeScript types
```

---

### Task 0: Project Scaffolding

**Goal:** Create a new Next.js project with all dependencies installed and configured.

**Files:**
- Create: `pirate-kings/package.json`
- Create: `pirate-kings/tsconfig.json`
- Create: `pirate-kings/next.config.ts`
- Create: `pirate-kings/postcss.config.mjs`
- Create: `pirate-kings/src/app/layout.tsx`
- Create: `pirate-kings/src/app/globals.css`
- Create: `pirate-kings/src/app/page.tsx`

**Acceptance Criteria:**
- [ ] `npm run dev` starts the dev server without errors
- [ ] Tailwind CSS v4 classes render correctly
- [ ] shadcn/ui is initialized and at least one component (Button) is available
- [ ] TypeScript compiles with strict mode

**Verify:** `cd pirate-kings && npm run dev` → server starts on localhost:3000, page renders

**Steps:**

- [ ] **Step 1: Create project directory and initialize**

```bash
mkdir pirate-kings
cd pirate-kings
npx create-next-app@latest . --typescript --tailwind --app --src-dir --no-import-alias --skip-install
```

Then manually fix `tsconfig.json` to add the `@/*` path alias:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 2: Install dependencies**

```bash
npm install prisma @prisma/client socket.io socket.io-client lucide-react
npm install -D @types/node
```

- [ ] **Step 3: Initialize shadcn/ui**

```bash
npx shadcn@latest init
npx shadcn@latest add button input label card
```

- [ ] **Step 4: Create root layout**

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Treasure of the Pirate Kings",
  description: "Multiplayer pirate simulation game",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background antialiased">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Create landing page**

```tsx
// src/app/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-4xl font-bold">Treasure of the Pirate Kings</h1>
      <p className="text-muted-foreground text-center max-w-md">
        A multiplayer team simulation game. Facilitators create a session,
        team captains join on their phones.
      </p>
      <div className="flex gap-4">
        <Link href="/facilitator">
          <Button size="lg">Facilitator</Button>
        </Link>
        <Link href="/join">
          <Button size="lg" variant="outline">Join as Captain</Button>
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Verify dev server starts**

```bash
npm run dev
```

Expected: Server starts on `http://localhost:3000`, landing page renders with two buttons.

- [ ] **Step 7: Commit**

```bash
git init
echo "node_modules\n.next\n.env\n.env.local" > .gitignore
git add .
git commit -m "chore: scaffold pirate-kings project with Next.js, Tailwind, shadcn/ui"
```

---

### Task 1: Prisma Schema & Database Setup

**Goal:** Define all game entities in Prisma and run the initial migration.

**Files:**
- Create: `pirate-kings/prisma/schema.prisma`
- Create: `pirate-kings/src/lib/prisma.ts`
- Create: `pirate-kings/src/types/game.ts`

**Acceptance Criteria:**
- [ ] `npx prisma migrate dev` runs successfully and creates all tables
- [ ] `npx prisma studio` shows all 7 models with correct fields and relations
- [ ] TypeScript types align with Prisma-generated types

**Verify:** `npx prisma migrate dev --name init` → migration succeeds, `npx prisma studio` → all models visible

**Steps:**

- [ ] **Step 1: Initialize Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

- [ ] **Step 2: Write the schema**

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum SessionStatus {
  LOBBY
  ACTIVE
  ENDED
}

enum TeamStatus {
  ACTIVE
  STRANDED
  SHIPWRECKED
  FINISHED
}

enum ResourceType {
  WATER
  PROVISIONS
  RIGGING
  SPYGLASS
  TREASURE
}

enum LocationType {
  HOME_PORT
  TREASURE_ISLAND
  TRADING_POST
  FRIENDLY_COVE
  KRAKEN_LAIR
  OPEN_SEA
}

enum WeatherZone {
  SAFE
  KRAKEN
  OPEN_SEA
}

enum TransactionType {
  PURCHASE
  CONSUME
}

model GameSession {
  id           String        @id @default(cuid())
  status       SessionStatus @default(LOBBY)
  currentDay   Int           @default(0)
  timerEnd     DateTime?
  timerRunning Boolean       @default(false)
  createdAt    DateTime      @default(now())

  teams           Team[]
  mapLocations    MapLocation[]
  weatherSchedule WeatherSchedule?
}

model Team {
  id                String     @id @default(cuid())
  sessionId         String
  session           GameSession @relation(fields: [sessionId], references: [id])
  name              String
  joinCode          String     @unique
  color             String
  doubloons         Int        @default(1000)
  cargoCapacity     Int        @default(1000)
  currentLocationId String?
  currentLocation   MapLocation? @relation(fields: [currentLocationId], references: [id])
  status            TeamStatus @default(ACTIVE)
  lostUntilDay      Int?

  inventory    Inventory[]
  logEntries   LogEntry[]
  transactions Transaction[]
}

model Inventory {
  id           String       @id @default(cuid())
  teamId       String
  team         Team         @relation(fields: [teamId], references: [id])
  resourceType ResourceType
  quantity     Int          @default(0)
  totalWeight  Int          @default(0)

  @@unique([teamId, resourceType])
}

model LogEntry {
  id                String   @id @default(cuid())
  teamId            String
  team              Team     @relation(fields: [teamId], references: [id])
  dayNumber         Int
  fromLocationId    String?
  toLocationId      String?
  weather           String
  provisionsConsumed Int     @default(0)
  waterConsumed     Int      @default(0)
  riggingUsed       Boolean  @default(false)
  spyglassUsed      Boolean  @default(false)
  treasureEarned    Int      @default(0)
  wasLost           Boolean  @default(false)
}

model MapLocation {
  id          String       @id @default(cuid())
  sessionId   String
  session     GameSession  @relation(fields: [sessionId], references: [id])
  name        String
  type        LocationType
  gridX       Int
  gridY       Int
  weatherZone WeatherZone

  teams Team[]

  @@unique([sessionId, gridX, gridY])
}

model WeatherSchedule {
  id        String      @id @default(cuid())
  sessionId String      @unique
  session   GameSession  @relation(fields: [sessionId], references: [id])
  dayData   Json
}

model Transaction {
  id           String          @id @default(cuid())
  teamId       String
  team         Team            @relation(fields: [teamId], references: [id])
  dayNumber    Int
  type         TransactionType
  resourceType String
  quantity     Int
  cost         Int?
  locationId   String?
  createdAt    DateTime        @default(now())
}
```

- [ ] **Step 3: Create Prisma client singleton**

```ts
// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 4: Create shared TypeScript types**

```ts
// src/types/game.ts
export type HexCoord = { x: number; y: number };

export type LocationInfo = {
  name: string;
  type: "HOME_PORT" | "TREASURE_ISLAND" | "TRADING_POST" | "FRIENDLY_COVE" | "KRAKEN_LAIR" | "OPEN_SEA";
  weatherZone: "SAFE" | "KRAKEN" | "OPEN_SEA";
};

export type WeatherType = "CLEAR" | "TEMPEST" | "DOLDRUMS" | "MAELSTROM";

export type DayWeather = {
  openSea: WeatherType;
  kraken: WeatherType;
  safe: WeatherType;
};

export type ShipPosition = {
  teamId: string;
  teamName: string;
  color: string;
  gridX: number;
  gridY: number;
};
```

- [ ] **Step 5: Set up DATABASE_URL and run migration**

Create `.env`:
```
DATABASE_URL="postgresql://user:password@localhost:5432/pirate_kings"
```

Run migration:
```bash
npx prisma migrate dev --name init
```

Expected: Migration creates all 7 tables. Prisma Client is generated.

- [ ] **Step 6: Verify with Prisma Studio**

```bash
npx prisma studio
```

Expected: Browser opens showing GameSession, Team, Inventory, LogEntry, MapLocation, WeatherSchedule, Transaction models.

- [ ] **Step 7: Commit**

```bash
git add prisma/ src/lib/prisma.ts src/types/game.ts .env.example
git commit -m "feat: add Prisma schema with all game models and initial migration"
```

---

### Task 2: Hex Coordinate Utilities & Map Data

**Goal:** Implement hex math (adjacency, pixel positioning) and the default map layout with all 12 named locations and the 25-day weather schedule.

**Files:**
- Create: `pirate-kings/src/lib/hex.ts`
- Create: `pirate-kings/src/lib/map-data.ts`
- Create: `pirate-kings/src/lib/__tests__/hex.test.ts`

**Acceptance Criteria:**
- [ ] `getHexNeighbors(x, y)` returns correct 6 neighbors for even and odd rows
- [ ] Neighbors outside 0–7 bounds are filtered out
- [ ] Corner hexes (0,0) and (7,7) return correct reduced neighbor sets
- [ ] `DEFAULT_LOCATIONS` contains exactly 12 named locations at correct coordinates
- [ ] `DEFAULT_WEATHER` contains exactly 25 days of weather data matching the PRD
- [ ] `hexToPixel(x, y)` returns SVG pixel positions for rendering

**Verify:** `npx jest src/lib/__tests__/hex.test.ts` → all tests pass

**Steps:**

- [ ] **Step 1: Install test dependencies**

```bash
npm install -D jest @types/jest ts-jest
npx ts-jest config:init
```

Update `jest.config.js`:
```js
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};
```

- [ ] **Step 2: Write hex adjacency tests**

```ts
// src/lib/__tests__/hex.test.ts
import { getHexNeighbors, hexToPixel, isValidHex, hexDistance } from "@/lib/hex";

describe("getHexNeighbors", () => {
  it("returns 6 neighbors for a center hex on even row", () => {
    const neighbors = getHexNeighbors(3, 2);
    expect(neighbors).toHaveLength(6);
    expect(neighbors).toContainEqual({ x: 2, y: 2 });
    expect(neighbors).toContainEqual({ x: 4, y: 2 });
    expect(neighbors).toContainEqual({ x: 2, y: 1 });
    expect(neighbors).toContainEqual({ x: 3, y: 1 });
    expect(neighbors).toContainEqual({ x: 2, y: 3 });
    expect(neighbors).toContainEqual({ x: 3, y: 3 });
  });

  it("returns 6 neighbors for a center hex on odd row", () => {
    const neighbors = getHexNeighbors(3, 3);
    expect(neighbors).toHaveLength(6);
    expect(neighbors).toContainEqual({ x: 2, y: 3 });
    expect(neighbors).toContainEqual({ x: 4, y: 3 });
    expect(neighbors).toContainEqual({ x: 3, y: 2 });
    expect(neighbors).toContainEqual({ x: 4, y: 2 });
    expect(neighbors).toContainEqual({ x: 3, y: 4 });
    expect(neighbors).toContainEqual({ x: 4, y: 4 });
  });

  it("filters out-of-bounds neighbors for corner (0,0)", () => {
    const neighbors = getHexNeighbors(0, 0);
    expect(neighbors).toHaveLength(2);
    expect(neighbors).toContainEqual({ x: 1, y: 0 });
    expect(neighbors).toContainEqual({ x: 0, y: 1 });
  });

  it("filters out-of-bounds neighbors for corner (7,7)", () => {
    // (7,7) is odd row: neighbors are (-1,0),(+1,0),(0,-1),(+1,-1),(0,+1),(+1,+1)
    // Valid: (6,7), (7,6), (7,6 is duplicate via two offsets — actually unique ones are:)
    // (6,7)=valid, (8,7)=OOB, (7,6)=valid, (8,6)=OOB, (7,8)=OOB, (8,8)=OOB
    const neighbors = getHexNeighbors(7, 7);
    expect(neighbors).toHaveLength(2);
    expect(neighbors).toContainEqual({ x: 6, y: 7 });
    expect(neighbors).toContainEqual({ x: 7, y: 6 });
  });
});

describe("isValidHex", () => {
  it("returns true for valid coordinates", () => {
    expect(isValidHex(0, 0)).toBe(true);
    expect(isValidHex(7, 7)).toBe(true);
    expect(isValidHex(3, 4)).toBe(true);
  });

  it("returns false for out-of-bounds coordinates", () => {
    expect(isValidHex(-1, 0)).toBe(false);
    expect(isValidHex(8, 0)).toBe(false);
    expect(isValidHex(0, -1)).toBe(false);
    expect(isValidHex(0, 8)).toBe(false);
  });
});

describe("hexToPixel", () => {
  it("returns pixel position for (0,0)", () => {
    const pos = hexToPixel(0, 0);
    expect(pos.x).toBeGreaterThanOrEqual(0);
    expect(pos.y).toBeGreaterThanOrEqual(0);
  });

  it("odd rows are offset horizontally", () => {
    const even = hexToPixel(0, 0);
    const odd = hexToPixel(0, 1);
    expect(odd.x).toBeGreaterThan(even.x);
  });
});

describe("hexDistance", () => {
  it("adjacent hexes have distance 1", () => {
    expect(hexDistance(0, 0, 1, 0)).toBe(1);
    expect(hexDistance(0, 0, 0, 1)).toBe(1);
  });

  it("Home Port to Treasure Island is 7", () => {
    expect(hexDistance(7, 7, 0, 0)).toBe(7);
  });
});
```

- [ ] **Step 3: Implement hex utilities**

```ts
// src/lib/hex.ts
import type { HexCoord } from "@/types/game";

const GRID_SIZE = 8;
const HEX_WIDTH = 80;
const HEX_HEIGHT = 80;

export function isValidHex(x: number, y: number): boolean {
  return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;
}

export function getHexNeighbors(x: number, y: number): HexCoord[] {
  const isOddRow = y % 2 === 1;

  const offsets: [number, number][] = isOddRow
    ? [[-1, 0], [1, 0], [0, -1], [1, -1], [0, 1], [1, 1]]
    : [[-1, 0], [1, 0], [-1, -1], [0, -1], [-1, 1], [0, 1]];

  return offsets
    .map(([dx, dy]) => ({ x: x + dx, y: y + dy }))
    .filter((c) => isValidHex(c.x, c.y));
}

export function hexToPixel(gridX: number, gridY: number): { x: number; y: number } {
  const xOffset = gridY % 2 === 1 ? HEX_WIDTH * 0.5 : 0;
  return {
    x: gridX * HEX_WIDTH + xOffset,
    y: gridY * (HEX_HEIGHT * 0.75),
  };
}

function offsetToCube(x: number, y: number): { q: number; r: number; s: number } {
  const q = x - (y - (y & 1)) / 2;
  const r = y;
  return { q, r, s: -q - r };
}

export function hexDistance(x1: number, y1: number, x2: number, y2: number): number {
  const a = offsetToCube(x1, y1);
  const b = offsetToCube(x2, y2);
  return Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r), Math.abs(a.s - b.s));
}
```

- [ ] **Step 4: Run hex tests**

```bash
npx jest src/lib/__tests__/hex.test.ts --verbose
```

Expected: All tests pass.

- [ ] **Step 5: Create map data constants**

```ts
// src/lib/map-data.ts
import type { LocationInfo, DayWeather, HexCoord } from "@/types/game";

export const DEFAULT_LOCATIONS: (HexCoord & LocationInfo)[] = [
  { x: 0, y: 0, name: "Treasure Island", type: "TREASURE_ISLAND", weatherZone: "SAFE" },
  { x: 3, y: 0, name: "Trading Post 1", type: "TRADING_POST", weatherZone: "SAFE" },
  { x: 1, y: 1, name: "Friendly Cove 1", type: "FRIENDLY_COVE", weatherZone: "OPEN_SEA" },
  { x: 4, y: 1, name: "Trading Post 2", type: "TRADING_POST", weatherZone: "SAFE" },
  { x: 2, y: 2, name: "Trading Post 3", type: "TRADING_POST", weatherZone: "SAFE" },
  { x: 4, y: 2, name: "Kraken's Lair", type: "KRAKEN_LAIR", weatherZone: "KRAKEN" },
  { x: 6, y: 2, name: "Trading Post 4", type: "TRADING_POST", weatherZone: "SAFE" },
  { x: 3, y: 3, name: "Trading Post 5", type: "TRADING_POST", weatherZone: "SAFE" },
  { x: 5, y: 4, name: "Friendly Cove 2", type: "FRIENDLY_COVE", weatherZone: "OPEN_SEA" },
  { x: 1, y: 5, name: "Trading Post 6", type: "TRADING_POST", weatherZone: "SAFE" },
  { x: 4, y: 6, name: "Trading Post 7", type: "TRADING_POST", weatherZone: "SAFE" },
  { x: 7, y: 7, name: "Home Port", type: "HOME_PORT", weatherZone: "SAFE" },
];

export const DEFAULT_WEATHER: DayWeather[] = [
  { openSea: "CLEAR", kraken: "CLEAR", safe: "CLEAR" },
  { openSea: "TEMPEST", kraken: "TEMPEST", safe: "CLEAR" },
  { openSea: "TEMPEST", kraken: "CLEAR", safe: "CLEAR" },
  { openSea: "DOLDRUMS", kraken: "DOLDRUMS", safe: "CLEAR" },
  { openSea: "CLEAR", kraken: "CLEAR", safe: "CLEAR" },
  { openSea: "CLEAR", kraken: "TEMPEST", safe: "CLEAR" },
  { openSea: "CLEAR", kraken: "CLEAR", safe: "CLEAR" },
  { openSea: "DOLDRUMS", kraken: "MAELSTROM", safe: "CLEAR" },
  { openSea: "CLEAR", kraken: "CLEAR", safe: "CLEAR" },
  { openSea: "TEMPEST", kraken: "TEMPEST", safe: "CLEAR" },
  { openSea: "TEMPEST", kraken: "CLEAR", safe: "CLEAR" },
  { openSea: "MAELSTROM", kraken: "MAELSTROM", safe: "CLEAR" },
  { openSea: "CLEAR", kraken: "CLEAR", safe: "CLEAR" },
  { openSea: "CLEAR", kraken: "TEMPEST", safe: "CLEAR" },
  { openSea: "CLEAR", kraken: "CLEAR", safe: "CLEAR" },
  { openSea: "DOLDRUMS", kraken: "MAELSTROM", safe: "CLEAR" },
  { openSea: "CLEAR", kraken: "CLEAR", safe: "CLEAR" },
  { openSea: "CLEAR", kraken: "TEMPEST", safe: "CLEAR" },
  { openSea: "TEMPEST", kraken: "CLEAR", safe: "CLEAR" },
  { openSea: "MAELSTROM", kraken: "MAELSTROM", safe: "CLEAR" },
  { openSea: "CLEAR", kraken: "CLEAR", safe: "CLEAR" },
  { openSea: "CLEAR", kraken: "TEMPEST", safe: "CLEAR" },
  { openSea: "CLEAR", kraken: "CLEAR", safe: "CLEAR" },
  { openSea: "DOLDRUMS", kraken: "MAELSTROM", safe: "CLEAR" },
  { openSea: "CLEAR", kraken: "CLEAR", safe: "CLEAR" },
];

export const TEAM_COLORS = [
  "#e53e3e", "#3182ce", "#38a169", "#805ad5",
  "#dd6b20", "#d69e2e", "#319795", "#d53f8c",
  "#2b6cb0", "#c05621", "#276749", "#6b46c1",
  "#9c4221", "#975a16", "#285e61", "#97266d",
  "#2c5282", "#c53030", "#22543d", "#553c9a",
  "#7b341e", "#744210", "#234e52", "#702459",
  "#2a4365", "#9b2c2c", "#1c4532", "#44337a",
  "#652b19", "#5f370e", "#1d4044", "#521b41",
  "#1a365d", "#822727", "#174032", "#362c75",
  "#4a2511", "#49310c", "#163836", "#42214d",
  "#153e75", "#7a2424", "#14392d", "#312a65",
];

export function getLocationAt(x: number, y: number): LocationInfo {
  const loc = DEFAULT_LOCATIONS.find((l) => l.x === x && l.y === y);
  if (loc) return { name: loc.name, type: loc.type, weatherZone: loc.weatherZone };
  return { name: `Open Sea (${x},${y})`, type: "OPEN_SEA", weatherZone: "OPEN_SEA" };
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/hex.ts src/lib/map-data.ts src/lib/__tests__/ src/types/game.ts jest.config.js
git commit -m "feat: add hex coordinate utilities, map data, and weather schedule"
```

---

### Task 3: Hex Map SVG Components

**Goal:** Build the SVG-based hex grid React components with dual view modes (team mobile view and facilitator desktop view).

**Files:**
- Create: `pirate-kings/src/components/map/HexTile.tsx`
- Create: `pirate-kings/src/components/map/ShipMarker.tsx`
- Create: `pirate-kings/src/components/map/HexGrid.tsx`
- Create: `pirate-kings/src/components/map/MapContainer.tsx`

**Acceptance Criteria:**
- [ ] 8x8 hex grid renders as SVG with correct offset positioning
- [ ] Each location type has a distinct fill color
- [ ] Team mode: only one ship shown, adjacent hexes highlighted, tappable
- [ ] Facilitator mode: all ships shown with team colors and labels
- [ ] Pinch-to-zoom works on mobile via touch gestures
- [ ] `onHexClick` callback fires only for adjacent hexes in team mode

**Verify:** Visit `/facilitator` in browser → see full 8x8 grid with all locations colored by type

**Steps:**

- [ ] **Step 1: Create HexTile component**

```tsx
// src/components/map/HexTile.tsx
"use client";

import type { LocationInfo } from "@/types/game";

const HEX_POINTS = "40,0 80,20 80,60 40,80 0,60 0,20";

const TYPE_COLORS: Record<LocationInfo["type"], { fill: string; stroke: string }> = {
  HOME_PORT: { fill: "#1a2a1a", stroke: "#68d391" },
  TREASURE_ISLAND: { fill: "#2d1810", stroke: "#f6ad55" },
  TRADING_POST: { fill: "#1a2740", stroke: "#63b3ed" },
  FRIENDLY_COVE: { fill: "#0f3a2a", stroke: "#48bb78" },
  KRAKEN_LAIR: { fill: "#2a0a2a", stroke: "#fc8181" },
  OPEN_SEA: { fill: "#0f2942", stroke: "#1a3a5c" },
};

type HexTileProps = {
  x: number;
  y: number;
  pixelX: number;
  pixelY: number;
  location: LocationInfo;
  isCurrentPosition?: boolean;
  isAdjacent?: boolean;
  isSelectable?: boolean;
  onClick?: () => void;
};

export function HexTile({
  pixelX,
  pixelY,
  location,
  isCurrentPosition,
  isAdjacent,
  isSelectable,
  onClick,
}: HexTileProps) {
  const colors = TYPE_COLORS[location.type];
  const strokeWidth = location.type === "OPEN_SEA" ? 1 : 2;

  return (
    <g
      transform={`translate(${pixelX}, ${pixelY})`}
      onClick={isSelectable ? onClick : undefined}
      style={{ cursor: isSelectable ? "pointer" : "default" }}
    >
      <polygon
        points={HEX_POINTS}
        fill={isCurrentPosition ? "#2d3748" : colors.fill}
        stroke={isAdjacent ? "#f6ad55" : colors.stroke}
        strokeWidth={isAdjacent ? 3 : strokeWidth}
        opacity={isSelectable ? 1 : isAdjacent ? 0.8 : 1}
      />
      {location.type !== "OPEN_SEA" && (
        <text
          x={40}
          y={44}
          textAnchor="middle"
          fill={colors.stroke}
          fontSize={9}
          fontWeight="bold"
        >
          {location.name.length > 12
            ? location.name.split(" ").slice(0, 2).join("\n")
            : location.name}
        </text>
      )}
    </g>
  );
}
```

- [ ] **Step 2: Create ShipMarker component**

```tsx
// src/components/map/ShipMarker.tsx
"use client";

type ShipMarkerProps = {
  pixelX: number;
  pixelY: number;
  color: string;
  label?: string;
  showLabel?: boolean;
};

export function ShipMarker({ pixelX, pixelY, color, label, showLabel }: ShipMarkerProps) {
  return (
    <g transform={`translate(${pixelX + 28}, ${pixelY + 20})`}>
      <circle r={12} fill={color} stroke="#fff" strokeWidth={2} />
      <text x={0} y={4} textAnchor="middle" fill="#fff" fontSize={10} fontWeight="bold">
        ⛵
      </text>
      {showLabel && label && (
        <text x={0} y={28} textAnchor="middle" fill="#c9d1d9" fontSize={10}>
          {label}
        </text>
      )}
    </g>
  );
}
```

- [ ] **Step 3: Create HexGrid component**

```tsx
// src/components/map/HexGrid.tsx
"use client";

import { HexTile } from "./HexTile";
import { ShipMarker } from "./ShipMarker";
import { hexToPixel, getHexNeighbors } from "@/lib/hex";
import { getLocationAt } from "@/lib/map-data";
import type { ShipPosition } from "@/types/game";

const GRID_SIZE = 8;

type HexGridProps = {
  mode: "team" | "facilitator";
  currentPosition?: { x: number; y: number };
  ships?: ShipPosition[];
  onHexClick?: (x: number, y: number) => void;
  isMovementPhase?: boolean;
};

export function HexGrid({
  mode,
  currentPosition,
  ships = [],
  onHexClick,
  isMovementPhase = false,
}: HexGridProps) {
  const adjacentHexes =
    mode === "team" && currentPosition && isMovementPhase
      ? getHexNeighbors(currentPosition.x, currentPosition.y)
      : [];

  const isAdjacent = (x: number, y: number) =>
    adjacentHexes.some((h) => h.x === x && h.y === y);

  const hexes: React.ReactNode[] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const pixel = hexToPixel(x, y);
      const location = getLocationAt(x, y);
      const adj = isAdjacent(x, y);
      const isCurrent =
        currentPosition?.x === x && currentPosition?.y === y;

      hexes.push(
        <HexTile
          key={`${x}-${y}`}
          x={x}
          y={y}
          pixelX={pixel.x}
          pixelY={pixel.y}
          location={location}
          isCurrentPosition={isCurrent}
          isAdjacent={adj}
          isSelectable={adj && isMovementPhase}
          onClick={() => onHexClick?.(x, y)}
        />
      );
    }
  }

  const shipMarkers = ships.map((ship) => {
    const pixel = hexToPixel(ship.gridX, ship.gridY);
    return (
      <ShipMarker
        key={ship.teamId}
        pixelX={pixel.x}
        pixelY={pixel.y}
        color={ship.color}
        label={ship.teamName}
        showLabel={mode === "facilitator"}
      />
    );
  });

  const svgWidth = GRID_SIZE * 80 + 40;
  const svgHeight = GRID_SIZE * 60 + 30;

  return (
    <svg
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className="w-full h-auto"
      style={{ maxHeight: mode === "team" ? "60vh" : "80vh" }}
    >
      <rect width={svgWidth} height={svgHeight} fill="#0a1628" />
      {hexes}
      {shipMarkers}
    </svg>
  );
}
```

- [ ] **Step 4: Create MapContainer with pinch-to-zoom**

```tsx
// src/components/map/MapContainer.tsx
"use client";

import { useRef, useState, useCallback } from "react";
import { HexGrid } from "./HexGrid";
import type { ShipPosition } from "@/types/game";

type MapContainerProps = {
  mode: "team" | "facilitator";
  currentPosition?: { x: number; y: number };
  ships?: ShipPosition[];
  onHexClick?: (x: number, y: number) => void;
  isMovementPhase?: boolean;
};

export function MapContainer(props: MapContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const lastDistance = useRef<number | null>(null);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (lastDistance.current !== null) {
        const delta = dist / lastDistance.current;
        setScale((s) => Math.min(3, Math.max(0.5, s * delta)));
      }
      lastDistance.current = dist;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    lastDistance.current = null;
  }, []);

  return (
    <div
      ref={containerRef}
      className="overflow-hidden touch-none"
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: `${origin.x}px ${origin.y}px`,
          transition: "transform 0.1s ease-out",
        }}
      >
        <HexGrid {...props} />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create a test page to verify rendering**

Create a temporary test route to visually verify the map:

```tsx
// src/app/test-map/page.tsx
import { MapContainer } from "@/components/map/MapContainer";

export default function TestMapPage() {
  const mockShips = [
    { teamId: "1", teamName: "Red Skulls", color: "#e53e3e", gridX: 7, gridY: 7 },
    { teamId: "2", teamName: "Blue Tide", color: "#3182ce", gridX: 5, gridY: 5 },
    { teamId: "3", teamName: "Green Wave", color: "#38a169", gridX: 2, gridY: 3 },
  ];

  return (
    <div className="min-h-screen bg-[#0a1628] p-4">
      <h1 className="text-white text-2xl mb-4">Map Test — Facilitator View</h1>
      <MapContainer mode="facilitator" ships={mockShips} />

      <h1 className="text-white text-2xl mt-8 mb-4">Map Test — Team View</h1>
      <MapContainer
        mode="team"
        currentPosition={{ x: 7, y: 7 }}
        ships={[mockShips[0]]}
        isMovementPhase={true}
      />
    </div>
  );
}
```

- [ ] **Step 6: Verify in browser**

```bash
npm run dev
```

Visit `http://localhost:3000/test-map`. Expected:
- Facilitator view: all 64 hexes rendered, 12 named locations with distinct colors, 3 ship markers with labels
- Team view: same grid but only 1 ship, adjacent hexes around (7,7) highlighted in orange

- [ ] **Step 7: Commit**

```bash
git add src/components/map/ src/app/test-map/
git commit -m "feat: add SVG hex grid components with dual view modes"
```

---

### Task 4: Game Actions — Create, Join, Start

**Goal:** Implement server-side game logic for session creation (with map + weather seeding), team join, and game start.

**Files:**
- Create: `pirate-kings/src/lib/game-actions.ts`
- Create: `pirate-kings/src/lib/__tests__/game-actions.test.ts`

**Acceptance Criteria:**
- [ ] `createGame(teamCount)` creates a GameSession with teams, join codes, 64 map locations, and weather schedule
- [ ] Join codes follow the `{PREFIX}-{LETTER}{NUMBER}` format
- [ ] `joinGame(joinCode)` returns team data or throws for invalid codes
- [ ] `startGame(sessionId)` transitions status LOBBY→ACTIVE and sets currentDay to 1
- [ ] `startGame` throws if session is not in LOBBY status
- [ ] Team colors are assigned from the TEAM_COLORS array

**Verify:** `npx jest src/lib/__tests__/game-actions.test.ts` → all tests pass

**Steps:**

- [ ] **Step 1: Write game action tests**

```ts
// src/lib/__tests__/game-actions.test.ts
import { createGame, joinGame, startGame } from "@/lib/game-actions";
import { prisma } from "@/lib/prisma";

beforeEach(async () => {
  await prisma.transaction.deleteMany();
  await prisma.logEntry.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.team.deleteMany();
  await prisma.weatherSchedule.deleteMany();
  await prisma.mapLocation.deleteMany();
  await prisma.gameSession.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("createGame", () => {
  it("creates a session with correct number of teams", async () => {
    const session = await createGame(4);
    expect(session.status).toBe("LOBBY");
    expect(session.currentDay).toBe(0);

    const teams = await prisma.team.findMany({ where: { sessionId: session.id } });
    expect(teams).toHaveLength(4);
  });

  it("generates unique join codes per team", async () => {
    const session = await createGame(8);
    const teams = await prisma.team.findMany({ where: { sessionId: session.id } });
    const codes = teams.map((t) => t.joinCode);
    expect(new Set(codes).size).toBe(8);
    codes.forEach((code) => {
      expect(code).toMatch(/^[A-Z0-9]{6}-[A-Z]\d+$/);
    });
  });

  it("seeds 64 map locations", async () => {
    const session = await createGame(2);
    const locations = await prisma.mapLocation.findMany({ where: { sessionId: session.id } });
    expect(locations).toHaveLength(64);
  });

  it("seeds weather schedule with 25 days", async () => {
    const session = await createGame(2);
    const weather = await prisma.weatherSchedule.findUnique({ where: { sessionId: session.id } });
    expect(weather).not.toBeNull();
    const data = weather!.dayData as Array<unknown>;
    expect(data).toHaveLength(25);
  });

  it("assigns teams to Home Port", async () => {
    const session = await createGame(3);
    const teams = await prisma.team.findMany({
      where: { sessionId: session.id },
      include: { currentLocation: true },
    });
    teams.forEach((team) => {
      expect(team.currentLocation?.type).toBe("HOME_PORT");
    });
  });
});

describe("joinGame", () => {
  it("returns team data for valid code", async () => {
    const session = await createGame(2);
    const teams = await prisma.team.findMany({ where: { sessionId: session.id } });
    const result = await joinGame(teams[0].joinCode);
    expect(result.team.id).toBe(teams[0].id);
    expect(result.session.id).toBe(session.id);
  });

  it("throws for invalid code", async () => {
    await expect(joinGame("INVALID-X1")).rejects.toThrow("Invalid join code");
  });
});

describe("startGame", () => {
  it("transitions session to ACTIVE and sets day 1", async () => {
    const session = await createGame(2);
    const updated = await startGame(session.id);
    expect(updated.status).toBe("ACTIVE");
    expect(updated.currentDay).toBe(1);
  });

  it("throws if session is not in LOBBY", async () => {
    const session = await createGame(2);
    await startGame(session.id);
    await expect(startGame(session.id)).rejects.toThrow("not in LOBBY");
  });
});
```

- [ ] **Step 2: Implement game actions**

```ts
// src/lib/game-actions.ts
import { prisma } from "@/lib/prisma";
import { DEFAULT_LOCATIONS, DEFAULT_WEATHER, TEAM_COLORS, getLocationAt } from "@/lib/map-data";

function generateSessionPrefix(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function generateJoinCode(prefix: string, index: number): string {
  const letter = String.fromCharCode(65 + (index % 26));
  const number = index + 1;
  return `${prefix}-${letter}${number}`;
}

export async function createGame(teamCount: number, teamNames?: string[]) {
  if (teamCount < 2 || teamCount > 40) {
    throw new Error("Team count must be between 2 and 40");
  }

  const prefix = generateSessionPrefix();

  const session = await prisma.gameSession.create({ data: {} });

  const mapLocations = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const loc = getLocationAt(x, y);
      mapLocations.push({
        sessionId: session.id,
        name: loc.name,
        type: loc.type as never,
        gridX: x,
        gridY: y,
        weatherZone: loc.weatherZone as never,
      });
    }
  }
  await prisma.mapLocation.createMany({ data: mapLocations });

  const homePort = await prisma.mapLocation.findFirst({
    where: { sessionId: session.id, type: "HOME_PORT" },
  });

  for (let i = 0; i < teamCount; i++) {
    await prisma.team.create({
      data: {
        sessionId: session.id,
        name: teamNames?.[i] || `Team ${i + 1}`,
        joinCode: generateJoinCode(prefix, i),
        color: TEAM_COLORS[i % TEAM_COLORS.length],
        currentLocationId: homePort!.id,
      },
    });
  }

  await prisma.weatherSchedule.create({
    data: {
      sessionId: session.id,
      dayData: DEFAULT_WEATHER,
    },
  });

  return prisma.gameSession.findUniqueOrThrow({
    where: { id: session.id },
    include: { teams: true },
  });
}

export async function joinGame(joinCode: string) {
  const team = await prisma.team.findUnique({
    where: { joinCode },
    include: {
      session: true,
      currentLocation: true,
      inventory: true,
    },
  });

  if (!team) {
    throw new Error("Invalid join code");
  }

  return { team, session: team.session };
}

export async function startGame(sessionId: string) {
  const session = await prisma.gameSession.findUniqueOrThrow({
    where: { id: sessionId },
  });

  if (session.status !== "LOBBY") {
    throw new Error("Session is not in LOBBY status");
  }

  return prisma.gameSession.update({
    where: { id: sessionId },
    data: { status: "ACTIVE", currentDay: 1 },
  });
}
```

- [ ] **Step 3: Run tests**

```bash
npx jest src/lib/__tests__/game-actions.test.ts --verbose
```

Expected: All tests pass. Requires a running PostgreSQL database with `DATABASE_URL` set.

- [ ] **Step 4: Commit**

```bash
git add src/lib/game-actions.ts src/lib/__tests__/game-actions.test.ts
git commit -m "feat: implement game creation, join, and start logic with tests"
```

---

### Task 5: API Route Handlers

**Goal:** Create the Next.js API routes that expose game actions as HTTP endpoints.

**Files:**
- Create: `pirate-kings/src/app/api/game/create/route.ts`
- Create: `pirate-kings/src/app/api/game/join/route.ts`
- Create: `pirate-kings/src/app/api/game/[sessionId]/route.ts`
- Create: `pirate-kings/src/app/api/game/start/route.ts`

**Acceptance Criteria:**
- [ ] `POST /api/game/create` creates a session and returns teams with join codes
- [ ] `POST /api/game/join` validates join code and returns team + session data
- [ ] `GET /api/game/[sessionId]` returns full session state for facilitator
- [ ] `POST /api/game/start` transitions session to ACTIVE
- [ ] All routes return proper error responses (400/404) with JSON error messages

**Verify:** `curl -X POST http://localhost:3000/api/game/create -H 'Content-Type: application/json' -d '{"teamCount":4}'` → returns session with 4 teams

**Steps:**

- [ ] **Step 1: Create session endpoint**

```ts
// src/app/api/game/create/route.ts
import { NextResponse } from "next/server";
import { createGame } from "@/lib/game-actions";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { teamCount, teamNames } = body;

    if (!teamCount || teamCount < 2 || teamCount > 40) {
      return NextResponse.json(
        { error: "teamCount must be between 2 and 40" },
        { status: 400 }
      );
    }

    const session = await createGame(teamCount, teamNames);
    return NextResponse.json(session);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create game" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Join endpoint**

```ts
// src/app/api/game/join/route.ts
import { NextResponse } from "next/server";
import { joinGame } from "@/lib/game-actions";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { joinCode } = body;

    if (!joinCode || typeof joinCode !== "string") {
      return NextResponse.json({ error: "joinCode is required" }, { status: 400 });
    }

    const result = await joinGame(joinCode.toUpperCase().trim());
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid join code") {
      return NextResponse.json({ error: "Invalid join code" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Failed to join game" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Session state endpoint**

```ts
// src/app/api/game/[sessionId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  try {
    const session = await prisma.gameSession.findUniqueOrThrow({
      where: { id: sessionId },
      include: {
        teams: {
          include: {
            currentLocation: true,
            inventory: true,
          },
        },
        weatherSchedule: true,
      },
    });

    return NextResponse.json(session);
  } catch {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
}
```

- [ ] **Step 4: Start game endpoint**

```ts
// src/app/api/game/start/route.ts
import { NextResponse } from "next/server";
import { startGame } from "@/lib/game-actions";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const session = await startGame(sessionId);
    return NextResponse.json(session);
  } catch (error) {
    if (error instanceof Error && error.message.includes("not in LOBBY")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to start game" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 5: Verify with curl**

```bash
# Create a game
curl -s -X POST http://localhost:3000/api/game/create \
  -H 'Content-Type: application/json' \
  -d '{"teamCount":4}' | jq '.teams[].joinCode'

# Join with a code (use one from above)
curl -s -X POST http://localhost:3000/api/game/join \
  -H 'Content-Type: application/json' \
  -d '{"joinCode":"XXXXXX-A1"}'
```

Expected: Create returns session with 4 teams and join codes. Join returns team data.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/game/
git commit -m "feat: add API routes for game create, join, session state, and start"
```

---

### Task 6: Custom Server with Socket.io

**Goal:** Set up a custom Node.js server that runs Next.js alongside Socket.io for real-time WebSocket communication. Implement room-based connection management for team isolation.

**Files:**
- Create: `pirate-kings/server.ts`
- Create: `pirate-kings/src/lib/socket.ts`
- Modify: `pirate-kings/package.json` (scripts)

**Acceptance Criteria:**
- [ ] `npm run dev` starts Next.js + Socket.io on the same port
- [ ] Clients can connect via Socket.io and join rooms
- [ ] Facilitator joining `session:{id}` receives team connection events
- [ ] Team joining `team:{id}` receives only their own events
- [ ] Reconnection re-sends current game state

**Verify:** Open browser console, connect via Socket.io client, join a room → see connection event logged

**Steps:**

- [ ] **Step 1: Create the custom server**

```ts
// server.ts
import { createServer } from "http";
import next from "next";
import { Server as SocketServer } from "socket.io";
import { prisma } from "./src/lib/prisma";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new SocketServer(httpServer, {
    cors: { origin: "*" },
    path: "/socket.io",
  });

  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on("join-team", async (data: { teamId: string; joinCode: string }) => {
      const team = await prisma.team.findUnique({
        where: { id: data.teamId },
        include: { session: true, currentLocation: true, inventory: true },
      });

      if (!team) {
        socket.emit("error", { message: "Team not found" });
        return;
      }

      socket.join(`team:${team.id}`);
      socket.join(`game:${team.sessionId}`);

      socket.data.teamId = team.id;
      socket.data.sessionId = team.sessionId;
      socket.data.role = "captain";

      socket.emit("team-state", {
        team: {
          id: team.id,
          name: team.name,
          color: team.color,
          doubloons: team.doubloons,
          cargoCapacity: team.cargoCapacity,
          status: team.status,
          position: team.currentLocation
            ? { x: team.currentLocation.gridX, y: team.currentLocation.gridY }
            : null,
        },
        inventory: team.inventory,
        session: {
          id: team.session.id,
          status: team.session.status,
          currentDay: team.session.currentDay,
        },
      });

      io.to(`session:${team.sessionId}`).emit("team-connected", {
        teamId: team.id,
        teamName: team.name,
      });
    });

    socket.on("join-facilitator", async (data: { sessionId: string }) => {
      const session = await prisma.gameSession.findUnique({
        where: { id: data.sessionId },
        include: {
          teams: { include: { currentLocation: true } },
        },
      });

      if (!session) {
        socket.emit("error", { message: "Session not found" });
        return;
      }

      socket.join(`session:${session.id}`);
      socket.join(`game:${session.id}`);

      socket.data.sessionId = session.id;
      socket.data.role = "facilitator";

      const connectedTeamIds = new Set<string>();
      const sockets = await io.in(`game:${session.id}`).fetchSockets();
      sockets.forEach((s) => {
        if (s.data.teamId) connectedTeamIds.add(s.data.teamId);
      });

      socket.emit("session-state", {
        session: {
          id: session.id,
          status: session.status,
          currentDay: session.currentDay,
        },
        teams: session.teams.map((t) => ({
          id: t.id,
          name: t.name,
          color: t.color,
          joinCode: t.joinCode,
          connected: connectedTeamIds.has(t.id),
          position: t.currentLocation
            ? { x: t.currentLocation.gridX, y: t.currentLocation.gridY }
            : null,
        })),
      });
    });

    socket.on("disconnect", () => {
      if (socket.data.teamId && socket.data.sessionId) {
        io.to(`session:${socket.data.sessionId}`).emit("team-disconnected", {
          teamId: socket.data.teamId,
        });
      }
    });
  });

  // Store io instance for API routes to access
  (globalThis as Record<string, unknown>).__io = io;

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
```

- [ ] **Step 2: Create client-side Socket.io singleton**

```ts
// src/lib/socket.ts
"use client";

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      path: "/socket.io",
      autoConnect: false,
    });
  }
  return socket;
}
```

- [ ] **Step 3: Update package.json scripts**

Update the `scripts` section in `package.json`:

```json
{
  "scripts": {
    "dev": "tsx watch server.ts",
    "build": "prisma generate && next build",
    "start": "NODE_ENV=production tsx server.ts",
    "lint": "eslint"
  }
}
```

Install tsx:
```bash
npm install -D tsx
```

- [ ] **Step 4: Verify Socket.io connection**

Start the dev server:
```bash
npm run dev
```

Open browser at `http://localhost:3000`, open console, and test:
```js
const socket = io({ path: "/socket.io" });
socket.on("connect", () => console.log("Connected:", socket.id));
```

Expected: "Connected: {socketId}" appears in console.

- [ ] **Step 5: Commit**

```bash
git add server.ts src/lib/socket.ts package.json
git commit -m "feat: add custom server with Socket.io for real-time communication"
```

---

### Task 7: Facilitator Page — Create Game & Lobby

**Goal:** Build the facilitator page with game creation form and live lobby showing team connection status.

**Files:**
- Create: `pirate-kings/src/app/facilitator/page.tsx`

**Acceptance Criteria:**
- [ ] Facilitator can enter team count (2–40) and click "Create Game"
- [ ] After creation, lobby shows all teams with join codes and connection status
- [ ] Join URL is prominently displayed for projection
- [ ] Team cards update to "Connected" in real-time when captains join
- [ ] "Start Voyage" button transitions to active game
- [ ] Layout is optimized for desktop (1280px+)

**Verify:** Visit `/facilitator`, create a game with 4 teams → lobby shows 4 team cards with codes. Open `/join` in another tab, enter a code → facilitator lobby shows that team as "Connected".

**Steps:**

- [ ] **Step 1: Build the facilitator page**

```tsx
// src/app/facilitator/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { MapContainer } from "@/components/map/MapContainer";
import { getSocket } from "@/lib/socket";
import type { ShipPosition } from "@/types/game";

type TeamInfo = {
  id: string;
  name: string;
  color: string;
  joinCode: string;
  connected: boolean;
  position: { x: number; y: number } | null;
};

type SessionInfo = {
  id: string;
  status: string;
  currentDay: number;
};

export default function FacilitatorPage() {
  const [phase, setPhase] = useState<"create" | "lobby" | "active">("create");
  const [teamCount, setTeamCount] = useState(8);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/game/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamCount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSession({ id: data.id, status: data.status, currentDay: data.currentDay });
      setTeams(
        data.teams.map((t: Record<string, unknown>) => ({
          id: t.id,
          name: t.name,
          color: t.color,
          joinCode: t.joinCode,
          connected: false,
          position: { x: 7, y: 7 },
        }))
      );
      setPhase("lobby");

      const socket = getSocket();
      socket.connect();
      socket.emit("join-facilitator", { sessionId: data.id });

      socket.on("team-connected", ({ teamId }: { teamId: string }) => {
        setTeams((prev) =>
          prev.map((t) => (t.id === teamId ? { ...t, connected: true } : t))
        );
      });

      socket.on("team-disconnected", ({ teamId }: { teamId: string }) => {
        setTeams((prev) =>
          prev.map((t) => (t.id === teamId ? { ...t, connected: false } : t))
        );
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create game");
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    if (!session) return;
    try {
      const res = await fetch("/api/game/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSession({ ...session, status: "ACTIVE", currentDay: 1 });
      setPhase("active");

      const socket = getSocket();
      socket.emit("game-started", { sessionId: session.id });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to start");
    }
  };

  const connectedCount = teams.filter((t) => t.connected).length;
  const joinUrl = typeof window !== "undefined"
    ? `${window.location.origin}/join`
    : "/join";

  if (phase === "create") {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 space-y-6">
            <h1 className="text-2xl font-bold text-center">
              Create New Voyage
            </h1>
            <div className="space-y-2">
              <Label htmlFor="teamCount">Number of Teams (2–40)</Label>
              <Input
                id="teamCount"
                type="number"
                min={2}
                max={40}
                value={teamCount}
                onChange={(e) => setTeamCount(parseInt(e.target.value) || 2)}
              />
            </div>
            <Button
              className="w-full"
              size="lg"
              onClick={handleCreate}
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Game"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "lobby") {
    return (
      <div className="min-h-screen p-6 bg-background">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Treasure of the Pirate Kings</h1>
              <p className="text-muted-foreground text-sm">
                Session: {session?.id.slice(0, 8)} • {teams.length} teams
              </p>
            </div>
            <Button size="lg" onClick={handleStart}>
              Start Voyage ▸
            </Button>
          </div>

          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-sm text-muted-foreground uppercase tracking-wider">
                Join at
              </p>
              <p className="text-2xl font-bold text-primary">{joinUrl}</p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {teams.map((team) => (
              <Card
                key={team.id}
                className={`border-2 ${
                  team.connected ? "border-green-500" : "border-orange-400"
                }`}
              >
                <CardContent className="py-4 text-center space-y-2">
                  <div
                    className="w-6 h-6 rounded-full mx-auto"
                    style={{ backgroundColor: team.color }}
                  />
                  <p className="font-bold text-sm">{team.name}</p>
                  <p className="font-mono text-lg">{team.joinCode}</p>
                  <p
                    className={`text-xs ${
                      team.connected ? "text-green-500" : "text-orange-400"
                    }`}
                  >
                    {team.connected ? "● Connected" : "○ Waiting..."}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground">
            {connectedCount} of {teams.length} teams connected
          </p>
        </div>
      </div>
    );
  }

  const ships: ShipPosition[] = teams
    .filter((t) => t.position)
    .map((t) => ({
      teamId: t.id,
      teamName: t.name,
      color: t.color,
      gridX: t.position!.x,
      gridY: t.position!.y,
    }));

  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Day {session?.currentDay}</h1>
            <p className="text-muted-foreground text-sm">Game Active</p>
          </div>
        </div>
        <MapContainer mode="facilitator" ships={ships} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify create + lobby flow**

```bash
npm run dev
```

Visit `http://localhost:3000/facilitator`:
1. Enter 4, click "Create Game" → lobby appears with 4 team cards
2. Open a second browser tab → verify join URL is displayed

- [ ] **Step 3: Commit**

```bash
git add src/app/facilitator/
git commit -m "feat: add facilitator page with game creation and lobby"
```

---

### Task 8: Join Page & Team Dashboard

**Goal:** Build the mobile join page (enter code) and team dashboard (map + inventory) with Socket.io connection.

**Files:**
- Create: `pirate-kings/src/app/join/page.tsx`
- Create: `pirate-kings/src/app/play/[teamId]/page.tsx`

**Acceptance Criteria:**
- [ ] Captain enters join code and is redirected to team dashboard
- [ ] Team dashboard shows map (team mode) with own ship position
- [ ] Inventory panel shows doubloons and cargo capacity
- [ ] Socket.io connection established on dashboard load
- [ ] Facilitator lobby shows team as "Connected" when captain joins
- [ ] Join code persisted in sessionStorage for reconnection
- [ ] UI is mobile-optimized (375px viewport)

**Verify:** On phone (or 375px devtools), enter join code → dashboard loads with map and inventory. Check facilitator tab → team shows "Connected".

**Steps:**

- [ ] **Step 1: Build the join page**

```tsx
// src/app/join/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/game/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      sessionStorage.setItem("joinCode", code.toUpperCase().trim());
      sessionStorage.setItem("teamId", data.team.id);
      router.push(`/play/${data.team.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6 space-y-6">
          <div className="text-center">
            <h1 className="text-xl font-bold">Join Your Crew</h1>
            <p className="text-sm text-muted-foreground">
              Enter the code shown on screen
            </p>
          </div>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="KRAKEN-A1"
            className="text-center text-2xl font-mono tracking-wider"
            maxLength={12}
          />
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
          <Button
            className="w-full"
            size="lg"
            onClick={handleJoin}
            disabled={loading || !code.trim()}
          >
            {loading ? "Joining..." : "Board Ship →"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Build the team dashboard**

```tsx
// src/app/play/[teamId]/page.tsx
"use client";

import { useState, useEffect, use } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MapContainer } from "@/components/map/MapContainer";
import { getSocket } from "@/lib/socket";
import type { ShipPosition } from "@/types/game";

type TeamState = {
  id: string;
  name: string;
  color: string;
  doubloons: number;
  cargoCapacity: number;
  status: string;
  position: { x: number; y: number } | null;
};

type InventoryItem = {
  resourceType: string;
  quantity: number;
  totalWeight: number;
};

type SessionState = {
  id: string;
  status: string;
  currentDay: number;
};

export default function PlayPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = use(params);
  const [team, setTeam] = useState<TeamState | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [session, setSession] = useState<SessionState | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    const joinCode = sessionStorage.getItem("joinCode") || "";

    socket.connect();

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join-team", { teamId, joinCode });
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on("team-state", (data: {
      team: TeamState;
      inventory: InventoryItem[];
      session: SessionState;
    }) => {
      setTeam(data.team);
      setInventory(data.inventory);
      setSession(data.session);
    });

    socket.on("game-started", (data: { currentDay: number }) => {
      setSession((prev) =>
        prev ? { ...prev, status: "ACTIVE", currentDay: data.currentDay } : prev
      );
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("team-state");
      socket.off("game-started");
      socket.disconnect();
    };
  }, [teamId]);

  if (!team) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Connecting...</p>
      </div>
    );
  }

  const ships: ShipPosition[] = team.position
    ? [{ teamId: team.id, teamName: team.name, color: team.color, gridX: team.position.x, gridY: team.position.y }]
    : [];

  const isWaiting = session?.status === "LOBBY";

  return (
    <div className="min-h-screen bg-background p-3 space-y-3">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: team.color }}
          />
          <span className="font-bold text-sm">{team.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className={`w-2 h-2 rounded-full ${
              connected ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span className="text-xs text-muted-foreground">
            {connected ? "Connected" : "Reconnecting..."}
          </span>
        </div>
      </div>

      {isWaiting && (
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-sm text-muted-foreground">
              Waiting for voyage to begin...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Resources */}
      <div className="grid grid-cols-2 gap-2">
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-xl font-bold text-amber-500">
              {team.doubloons}
            </p>
            <p className="text-xs text-muted-foreground">Doubloons</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-xl font-bold text-blue-400">
              {team.cargoCapacity}
            </p>
            <p className="text-xs text-muted-foreground">Cargo (tons)</p>
          </CardContent>
        </Card>
      </div>

      {/* Inventory */}
      {inventory.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {inventory.map((item) => (
            <Card key={item.resourceType}>
              <CardContent className="py-2 text-center">
                <p className="text-lg font-bold">{item.quantity}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {item.resourceType.toLowerCase()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Map */}
      <MapContainer
        mode="team"
        currentPosition={team.position || undefined}
        ships={ships}
        isMovementPhase={!isWaiting}
      />

      {/* Position */}
      <p className="text-center text-xs text-muted-foreground">
        {team.position
          ? `📍 Position: (${team.position.x}, ${team.position.y})`
          : "📍 Docked at Home Port"}
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Test full flow**

1. Start dev server: `npm run dev`
2. Open `http://localhost:3000/facilitator` on desktop → create game with 4 teams
3. Open `http://localhost:3000/join` in mobile devtools (375px) → enter a join code
4. Verify: captain sees dashboard with map and resources; facilitator lobby shows team as "Connected"

- [ ] **Step 4: Delete test-map page**

```bash
rm -rf src/app/test-map
```

- [ ] **Step 5: Commit**

```bash
git add src/app/join/ src/app/play/
git rm -r src/app/test-map/ 2>/dev/null || true
git commit -m "feat: add join page and team dashboard with Socket.io connection"
```

---

## Task Dependency Graph

```
Task 0 (Scaffold) → Task 1 (Prisma Schema)
Task 1 → Task 2 (Hex Utils & Map Data)
Task 2 → Task 3 (Hex Map Components)
Task 1 → Task 4 (Game Actions)
Task 4 → Task 5 (API Routes)
Task 5 + Task 3 → Task 6 (Socket.io Server)
Task 6 → Task 7 (Facilitator Page)
Task 6 + Task 3 → Task 8 (Join + Dashboard)
```
