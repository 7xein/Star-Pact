# Treasure of the Pirate Kings — Steps 4–9 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the complete game logic layer — purchasing, day progression with weather/timer, movement with consumption, storm mechanics, stranding, and endgame scoreboard — on top of the existing foundation (schema, map, join flow, Socket.io).

**Architecture:** All game logic is server-authoritative. New functions in `src/lib/` handle consumption math, purchasing validation, and scoring. Socket.io events on the custom server handle real-time movement and day progression. The facilitator page gains day controls + timer; the team dashboard gains a buy panel + move handler. A `consumption.ts` module isolates all weather/protection/consumption math for testability.

**Tech Stack:** Next.js 16.2.6, TypeScript, Prisma 7.8.0, Socket.io 4.8.3, shadcn/ui, Vitest

---

## File Structure (New & Modified)

```
src/
├── lib/
│   ├── consumption.ts         # NEW: calculateConsumption, checkProtection, resolveLost
│   ├── scoring.ts             # NEW: calculateScores, generateCSV
│   ├── game-actions.ts        # MODIFY: add purchaseResources, advanceDay, endDay, submitMove, endGame
│   ├── __tests__/
│   │   ├── consumption.test.ts # NEW
│   │   ├── scoring.test.ts     # NEW
│   │   └── game-actions.test.ts # MODIFY: add purchase/move/day tests
│   └── resource-prices.ts     # NEW: price table constants
├── app/
│   ├── api/game/
│   │   ├── purchase/route.ts   # NEW
│   │   ├── advance-day/route.ts # NEW
│   │   ├── end-day/route.ts    # NEW
│   │   ├── end/route.ts        # NEW
│   │   └── timer/
│   │       ├── pause/route.ts  # NEW
│   │       ├── resume/route.ts # NEW
│   │       └── extend/route.ts # NEW
│   ├── facilitator/page.tsx    # MODIFY: add day controls, weather, timer, scoreboard
│   └── play/[teamId]/page.tsx  # MODIFY: add buy panel, move handler, weather, scoreboard
├── components/
│   └── game/
│       ├── BuyPanel.tsx        # NEW
│       ├── WeatherDisplay.tsx  # NEW
│       ├── DayTimer.tsx        # NEW
│       ├── DayControls.tsx     # NEW
│       ├── Scoreboard.tsx      # NEW
│       └── StrandedOverlay.tsx # NEW
└── server.ts                   # MODIFY: add submit-move handler, day-end auto-trigger
```

---

### Task 0: Resource Prices & Consumption Engine

**Goal:** Create the pure-function modules for resource pricing, consumption calculation, and storm protection — the math heart of the game. Fully tested with no database dependencies.

**Files:**
- Create: `src/lib/resource-prices.ts`
- Create: `src/lib/consumption.ts`
- Create: `src/lib/__tests__/consumption.test.ts`

**Acceptance Criteria:**
- [ ] `getPrice(resourceType, locationType)` returns correct prices from the PRD table
- [ ] `calculateConsumption(weather, locationType, protection)` returns correct provisions + water for all 8 scenarios
- [ ] `checkProtection(inventory)` returns rigging/spyglass/none in priority order
- [ ] `resolveLost(weather)` returns 3-day doubled consumption totals
- [ ] Friendly Cove zeroes water consumption
- [ ] Home Port zeroes all consumption
- [ ] All tests pass

**Verify:** `npx vitest run src/lib/__tests__/consumption.test.ts` → all pass

**Steps:**

- [ ] **Step 1: Create resource prices**

```ts
// src/lib/resource-prices.ts
import type { ResourceType, LocationType } from "@/generated/prisma/client";

type PriceEntry = {
  homePort: number;
  tradingPost: number | null; // null = not available
  weight: number;
};

export const RESOURCE_PRICES: Record<string, PriceEntry> = {
  WATER:      { homePort: 25,  tradingPost: 50,   weight: 50 },
  PROVISIONS: { homePort: 10,  tradingPost: 20,   weight: 10 },
  RIGGING:    { homePort: 400, tradingPost: null,  weight: 60 },
  SPYGLASS:   { homePort: 100, tradingPost: null,  weight: 10 },
};

export function getPrice(
  resourceType: string,
  locationType: LocationType
): number | null {
  const entry = RESOURCE_PRICES[resourceType];
  if (!entry) return null;
  if (locationType === "HOME_PORT") return entry.homePort;
  if (locationType === "TRADING_POST") return entry.tradingPost;
  return null; // can't buy at other locations
}

export function getWeight(resourceType: string): number {
  return RESOURCE_PRICES[resourceType]?.weight ?? 0;
}
```

- [ ] **Step 2: Create consumption engine**

```ts
// src/lib/consumption.ts
import type { WeatherType, LocationInfo } from "@/types/game";

export type Protection = "RIGGING" | "SPYGLASS" | "NONE";

export type ConsumptionResult = {
  provisions: number;
  water: number;
  riggingUsed: boolean;
  spyglassUsed: boolean;
};

export type InventorySnapshot = {
  water: number;
  provisions: number;
  rigging: number;
  spyglass: number;
};

export function checkProtection(inv: InventorySnapshot): Protection {
  if (inv.rigging > 0) return "RIGGING";
  if (inv.spyglass > 0) return "SPYGLASS";
  return "NONE";
}

export function isStorm(weather: WeatherType): boolean {
  return weather === "TEMPEST" || weather === "MAELSTROM";
}

export function calculateConsumption(
  weather: WeatherType,
  locationType: string,
  protection: Protection
): ConsumptionResult {
  // Home Port: zero consumption always
  if (locationType === "HOME_PORT") {
    return { provisions: 0, water: 0, riggingUsed: false, spyglassUsed: false };
  }

  // Friendly Cove: zero water, provisions normal
  const isCove = locationType === "FRIENDLY_COVE";

  // Storm with rigging: flat 1+1
  if (isStorm(weather) && protection === "RIGGING") {
    return {
      provisions: 1,
      water: isCove ? 0 : 1,
      riggingUsed: true,
      spyglassUsed: false,
    };
  }

  // Base consumption by weather type
  let provisions: number;
  let water: number;

  switch (weather) {
    case "CLEAR":
      provisions = 1;
      water = 1;
      break;
    case "TEMPEST":
      provisions = 5;
      water = 2;
      break;
    case "DOLDRUMS":
      provisions = 1;
      water = 3;
      break;
    case "MAELSTROM":
      provisions = 5;
      water = 4;
      break;
    default:
      provisions = 1;
      water = 1;
  }

  const spyglassUsed = isStorm(weather) && protection === "SPYGLASS";

  return {
    provisions,
    water: isCove ? 0 : water,
    riggingUsed: false,
    spyglassUsed,
  };
}

export function resolveLost(weather: WeatherType): { provisions: number; water: number } {
  // 3 days of doubled consumption
  const base = weather === "MAELSTROM"
    ? { provisions: 5, water: 4 }
    : { provisions: 5, water: 2 }; // TEMPEST

  return {
    provisions: base.provisions * 2 * 3,
    water: base.water * 2 * 3,
  };
}

export function canAfford(
  inv: InventorySnapshot,
  provisions: number,
  water: number
): boolean {
  return inv.provisions >= provisions && inv.water >= water;
}
```

- [ ] **Step 3: Write consumption tests**

```ts
// src/lib/__tests__/consumption.test.ts
import { describe, it, expect } from "vitest";
import {
  calculateConsumption,
  checkProtection,
  resolveLost,
  canAfford,
  isStorm,
} from "@/lib/consumption";
import type { InventorySnapshot } from "@/lib/consumption";

describe("checkProtection", () => {
  it("returns RIGGING when rigging available", () => {
    expect(checkProtection({ water: 5, provisions: 5, rigging: 2, spyglass: 1 })).toBe("RIGGING");
  });

  it("returns SPYGLASS when no rigging but spyglass available", () => {
    expect(checkProtection({ water: 5, provisions: 5, rigging: 0, spyglass: 1 })).toBe("SPYGLASS");
  });

  it("returns NONE when nothing available", () => {
    expect(checkProtection({ water: 5, provisions: 5, rigging: 0, spyglass: 0 })).toBe("NONE");
  });
});

describe("calculateConsumption", () => {
  it("clear seas: 1 provisions, 1 water", () => {
    const r = calculateConsumption("CLEAR", "OPEN_SEA", "NONE");
    expect(r).toEqual({ provisions: 1, water: 1, riggingUsed: false, spyglassUsed: false });
  });

  it("tempest unprotected: 5 provisions, 2 water", () => {
    const r = calculateConsumption("TEMPEST", "OPEN_SEA", "NONE");
    expect(r).toEqual({ provisions: 5, water: 2, riggingUsed: false, spyglassUsed: false });
  });

  it("doldrums: 1 provisions, 3 water", () => {
    const r = calculateConsumption("DOLDRUMS", "OPEN_SEA", "NONE");
    expect(r).toEqual({ provisions: 1, water: 3, riggingUsed: false, spyglassUsed: false });
  });

  it("maelstrom unprotected: 5 provisions, 4 water", () => {
    const r = calculateConsumption("MAELSTROM", "OPEN_SEA", "NONE");
    expect(r).toEqual({ provisions: 5, water: 4, riggingUsed: false, spyglassUsed: false });
  });

  it("tempest with rigging: 1+1", () => {
    const r = calculateConsumption("TEMPEST", "OPEN_SEA", "RIGGING");
    expect(r).toEqual({ provisions: 1, water: 1, riggingUsed: true, spyglassUsed: false });
  });

  it("maelstrom with rigging: 1+1", () => {
    const r = calculateConsumption("MAELSTROM", "OPEN_SEA", "RIGGING");
    expect(r).toEqual({ provisions: 1, water: 1, riggingUsed: true, spyglassUsed: false });
  });

  it("tempest with spyglass: full consumption, spyglassUsed", () => {
    const r = calculateConsumption("TEMPEST", "OPEN_SEA", "SPYGLASS");
    expect(r).toEqual({ provisions: 5, water: 2, riggingUsed: false, spyglassUsed: true });
  });

  it("home port: zero consumption regardless of weather", () => {
    const r = calculateConsumption("TEMPEST", "HOME_PORT", "NONE");
    expect(r).toEqual({ provisions: 0, water: 0, riggingUsed: false, spyglassUsed: false });
  });

  it("friendly cove: zero water, normal provisions", () => {
    const r = calculateConsumption("CLEAR", "FRIENDLY_COVE", "NONE");
    expect(r).toEqual({ provisions: 1, water: 0, riggingUsed: false, spyglassUsed: false });
  });

  it("friendly cove in doldrums: zero water, 1 provision", () => {
    const r = calculateConsumption("DOLDRUMS", "FRIENDLY_COVE", "NONE");
    expect(r).toEqual({ provisions: 1, water: 0, riggingUsed: false, spyglassUsed: false });
  });
});

describe("resolveLost", () => {
  it("tempest: 30 provisions, 12 water", () => {
    expect(resolveLost("TEMPEST")).toEqual({ provisions: 30, water: 12 });
  });

  it("maelstrom: 30 provisions, 24 water", () => {
    expect(resolveLost("MAELSTROM")).toEqual({ provisions: 30, water: 24 });
  });
});

describe("canAfford", () => {
  it("returns true when sufficient", () => {
    expect(canAfford({ water: 10, provisions: 10, rigging: 0, spyglass: 0 }, 5, 5)).toBe(true);
  });

  it("returns false when provisions insufficient", () => {
    expect(canAfford({ water: 10, provisions: 2, rigging: 0, spyglass: 0 }, 5, 5)).toBe(false);
  });

  it("returns false when water insufficient", () => {
    expect(canAfford({ water: 2, provisions: 10, rigging: 0, spyglass: 0 }, 5, 5)).toBe(false);
  });
});

describe("isStorm", () => {
  it("tempest is a storm", () => expect(isStorm("TEMPEST")).toBe(true));
  it("maelstrom is a storm", () => expect(isStorm("MAELSTROM")).toBe(true));
  it("clear is not a storm", () => expect(isStorm("CLEAR")).toBe(false));
  it("doldrums is not a storm", () => expect(isStorm("DOLDRUMS")).toBe(false));
});
```

- [ ] **Step 4: Run tests**

```bash
cd pirate-kings && npx vitest run src/lib/__tests__/consumption.test.ts
```

Expected: All 16+ tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/resource-prices.ts src/lib/consumption.ts src/lib/__tests__/consumption.test.ts
git commit -m "feat: add consumption engine and resource pricing with tests"
```

---

### Task 1: Purchase Resources Server Logic & API

**Goal:** Implement the server-side purchase logic with full validation and the API route.

**Files:**
- Modify: `src/lib/game-actions.ts` (add `purchaseResources`)
- Create: `src/app/api/game/purchase/route.ts`

**Acceptance Criteria:**
- [ ] `purchaseResources` validates location, budget, capacity, and restrictions
- [ ] Upserts inventory, deducts doubloons, reduces cargo capacity atomically
- [ ] Creates Transaction records
- [ ] Returns specific error messages for each failure mode
- [ ] API route wires up correctly with proper error responses

**Verify:** `curl -X POST localhost:3000/api/game/purchase -H 'Content-Type: application/json' -d '{"sessionId":"x","teamId":"y","items":[{"resourceType":"WATER","quantity":5}]}'` → returns updated team state or error

**Steps:**

- [ ] **Step 1: Add purchaseResources to game-actions.ts**

Add the following function to `src/lib/game-actions.ts`:

```ts
import { getPrice, getWeight } from "@/lib/resource-prices";
import type { ResourceType } from "@/generated/prisma/client";

export async function purchaseResources(
  sessionId: string,
  teamId: string,
  items: { resourceType: string; quantity: number }[]
) {
  const session = await prisma.gameSession.findUniqueOrThrow({
    where: { id: sessionId },
  });
  if (session.status !== "ACTIVE") {
    throw new Error("Game is not active");
  }

  const team = await prisma.team.findUniqueOrThrow({
    where: { id: teamId },
    include: { currentLocation: true, inventory: true },
  });

  if (team.status !== "ACTIVE") {
    throw new Error("Team is not active");
  }

  if (!team.currentLocation) {
    throw new Error("Team has no location");
  }

  const locType = team.currentLocation.type;
  if (locType !== "HOME_PORT" && locType !== "TRADING_POST") {
    throw new Error("Cannot buy at this location");
  }

  // Validate each item and calculate totals
  let totalCost = 0;
  let totalWeight = 0;
  const validated: { resourceType: string; quantity: number; cost: number; weight: number }[] = [];

  for (const item of items) {
    if (item.quantity <= 0) {
      throw new Error(`Invalid quantity for ${item.resourceType}`);
    }

    const price = getPrice(item.resourceType, locType);
    if (price === null) {
      throw new Error(`${item.resourceType} is not available at ${locType}`);
    }

    const weight = getWeight(item.resourceType);
    const itemCost = price * item.quantity;
    const itemWeight = weight * item.quantity;

    totalCost += itemCost;
    totalWeight += itemWeight;

    validated.push({
      resourceType: item.resourceType,
      quantity: item.quantity,
      cost: itemCost,
      weight: itemWeight,
    });
  }

  if (totalCost > team.doubloons) {
    throw new Error("Not enough doubloons");
  }

  if (totalWeight > team.cargoCapacity) {
    throw new Error("Over cargo capacity");
  }

  // Execute atomically in a transaction
  return prisma.$transaction(async (tx) => {
    // Update team budget & capacity
    await tx.team.update({
      where: { id: teamId },
      data: {
        doubloons: { decrement: totalCost },
        cargoCapacity: { decrement: totalWeight },
      },
    });

    // Upsert each inventory item
    for (const item of validated) {
      await tx.inventory.upsert({
        where: {
          teamId_resourceType: {
            teamId,
            resourceType: item.resourceType as ResourceType,
          },
        },
        create: {
          teamId,
          resourceType: item.resourceType as ResourceType,
          quantity: item.quantity,
          totalWeight: item.weight,
        },
        update: {
          quantity: { increment: item.quantity },
          totalWeight: { increment: item.weight },
        },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          teamId,
          dayNumber: session.currentDay,
          type: "PURCHASE",
          resourceType: item.resourceType,
          quantity: item.quantity,
          cost: item.cost,
          locationId: team.currentLocationId,
        },
      });
    }

    // Return updated team
    return tx.team.findUniqueOrThrow({
      where: { id: teamId },
      include: { inventory: true, currentLocation: true },
    });
  });
}
```

- [ ] **Step 2: Create purchase API route**

```ts
// src/app/api/game/purchase/route.ts
import { NextResponse } from "next/server";
import { purchaseResources } from "@/lib/game-actions";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, teamId, items } = body;

    if (!sessionId || !teamId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "sessionId, teamId, and items[] are required" },
        { status: 400 }
      );
    }

    const team = await purchaseResources(sessionId, teamId, items);
    return NextResponse.json({ team });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Purchase failed";
    const status = message.includes("Not enough") || message.includes("Over cargo")
      || message.includes("not available") || message.includes("Cannot buy")
      ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/game-actions.ts src/app/api/game/purchase/
git commit -m "feat: add resource purchasing with server validation"
```

---

### Task 2: Day Progression & Timer

**Goal:** Implement day advance, timer controls, and day-end processing — the game clock that drives everything.

**Files:**
- Modify: `src/lib/game-actions.ts` (add `advanceDay`, `endDay`, `pauseTimer`, `resumeTimer`, `extendTimer`)
- Create: `src/app/api/game/advance-day/route.ts`
- Create: `src/app/api/game/end-day/route.ts`
- Create: `src/app/api/game/timer/pause/route.ts`
- Create: `src/app/api/game/timer/resume/route.ts`
- Create: `src/app/api/game/timer/extend/route.ts`

**Acceptance Criteria:**
- [ ] `advanceDay` increments currentDay, sets timerEnd to now+180s, returns weather for the day
- [ ] `endDay` processes all teams that haven't moved (stay-in-place consumption)
- [ ] Teams on Treasure Island earn treasure chests on day-end
- [ ] Timer pause/resume/extend correctly manipulate timerEnd
- [ ] Day 25 end auto-triggers game end
- [ ] All API routes return proper responses

**Verify:** `curl -X POST localhost:3000/api/game/advance-day -H 'Content-Type: application/json' -d '{"sessionId":"x"}'` → returns day + weather + timerEnd

**Steps:**

- [ ] **Step 1: Add day progression functions to game-actions.ts**

Add the following functions to `src/lib/game-actions.ts`:

```ts
import type { DayWeather } from "@/types/game";
import {
  calculateConsumption,
  checkProtection,
  isStorm,
  resolveLost,
  canAfford,
} from "@/lib/consumption";
import type { InventorySnapshot } from "@/lib/consumption";

function getInventorySnapshot(inventory: { resourceType: string; quantity: number }[]): InventorySnapshot {
  const snap: InventorySnapshot = { water: 0, provisions: 0, rigging: 0, spyglass: 0 };
  for (const item of inventory) {
    if (item.resourceType === "WATER") snap.water = item.quantity;
    if (item.resourceType === "PROVISIONS") snap.provisions = item.quantity;
    if (item.resourceType === "RIGGING") snap.rigging = item.quantity;
    if (item.resourceType === "SPYGLASS") snap.spyglass = item.quantity;
  }
  return snap;
}

function getWeatherForZone(dayWeather: DayWeather, zone: string): string {
  if (zone === "SAFE") return dayWeather.safe;
  if (zone === "KRAKEN") return dayWeather.kraken;
  return dayWeather.openSea;
}

export async function advanceDay(sessionId: string) {
  const session = await prisma.gameSession.findUniqueOrThrow({
    where: { id: sessionId },
    include: { weatherSchedule: true },
  });

  if (session.status !== "ACTIVE") {
    throw new Error("Game is not active");
  }

  const nextDay = session.currentDay + 1;
  if (nextDay > 25) {
    throw new Error("Game has ended — cannot advance past day 25");
  }

  const weatherData = session.weatherSchedule?.dayData as DayWeather[];
  const dayWeather = weatherData[nextDay - 1]; // 0-indexed array

  const timerEnd = new Date(Date.now() + 180_000); // 3 minutes

  await prisma.gameSession.update({
    where: { id: sessionId },
    data: {
      currentDay: nextDay,
      timerEnd,
      timerRunning: true,
    },
  });

  return { day: nextDay, weather: dayWeather, timerEnd };
}

export async function pauseTimer(sessionId: string) {
  const session = await prisma.gameSession.findUniqueOrThrow({
    where: { id: sessionId },
  });

  if (!session.timerRunning || !session.timerEnd) {
    throw new Error("Timer is not running");
  }

  const remainingMs = Math.max(0, session.timerEnd.getTime() - Date.now());

  // Freeze timerEnd so resume can calculate remaining correctly
  await prisma.gameSession.update({
    where: { id: sessionId },
    data: { timerRunning: false, timerEnd: new Date(Date.now() + remainingMs) },
  });

  return { remainingMs };
}

export async function resumeTimer(sessionId: string) {
  const session = await prisma.gameSession.findUniqueOrThrow({
    where: { id: sessionId },
  });

  if (session.timerRunning) {
    throw new Error("Timer is already running");
  }

  // Calculate remaining from timerEnd (it was frozen when paused)
  const remainingMs = Math.max(0, session.timerEnd!.getTime() - Date.now());
  const newTimerEnd = new Date(Date.now() + remainingMs);

  await prisma.gameSession.update({
    where: { id: sessionId },
    data: { timerEnd: newTimerEnd, timerRunning: true },
  });

  return { timerEnd: newTimerEnd };
}

export async function extendTimer(sessionId: string) {
  const session = await prisma.gameSession.findUniqueOrThrow({
    where: { id: sessionId },
  });

  if (!session.timerEnd) {
    throw new Error("No active timer");
  }

  const newTimerEnd = new Date(session.timerEnd.getTime() + 60_000);

  await prisma.gameSession.update({
    where: { id: sessionId },
    data: { timerEnd: newTimerEnd },
  });

  return { timerEnd: newTimerEnd };
}

export async function endDay(sessionId: string) {
  const session = await prisma.gameSession.findUniqueOrThrow({
    where: { id: sessionId },
    include: { weatherSchedule: true },
  });

  if (session.status !== "ACTIVE") {
    throw new Error("Game is not active");
  }

  const weatherData = session.weatherSchedule?.dayData as DayWeather[];
  const dayWeather = weatherData[session.currentDay - 1];

  // Stop timer
  await prisma.gameSession.update({
    where: { id: sessionId },
    data: { timerRunning: false, timerEnd: null },
  });

  // Get all active teams that haven't logged a move this day
  const teams = await prisma.team.findMany({
    where: { sessionId, status: "ACTIVE" },
    include: { currentLocation: true, inventory: true, logEntries: true },
  });

  const results: { teamId: string; status: string; stranded?: boolean; treasure?: number }[] = [];

  for (const team of teams) {
    const hasMovedToday = team.logEntries.some((l) => l.dayNumber === session.currentDay);

    if (hasMovedToday) {
      // Already processed during move submission
      // But check for treasure island bonus
      if (team.currentLocation?.type === "TREASURE_ISLAND") {
        await awardTreasure(team.id, session.currentDay);
      }
      results.push({ teamId: team.id, status: "moved" });
      continue;
    }

    // Team is lost — skip consumption (already deducted)
    if (team.lostUntilDay && team.lostUntilDay > session.currentDay) {
      await prisma.logEntry.create({
        data: {
          teamId: team.id,
          dayNumber: session.currentDay,
          fromLocationId: team.currentLocationId,
          toLocationId: team.currentLocationId,
          weather: getWeatherForZone(dayWeather, team.currentLocation?.weatherZone || "OPEN_SEA"),
          wasLost: true,
        },
      });
      results.push({ teamId: team.id, status: "lost" });
      continue;
    }

    // Stay in place — consume resources
    if (!team.currentLocation) continue;

    const weather = getWeatherForZone(dayWeather, team.currentLocation.weatherZone) as import("@/types/game").WeatherType;
    const inv = getInventorySnapshot(team.inventory);
    const protection = checkProtection(inv);

    // Check if storm and unprotected → lost
    if (isStorm(weather) && protection === "NONE") {
      const lostCost = resolveLost(weather);
      if (!canAfford(inv, lostCost.provisions, lostCost.water)) {
        await strandTeam(team.id, session.currentDay, dayWeather, team.currentLocation.weatherZone);
        results.push({ teamId: team.id, status: "stranded", stranded: true });
        continue;
      }
      // Deduct lost cost and set lostUntilDay
      await deductResources(team.id, lostCost.provisions, lostCost.water);
      await prisma.team.update({
        where: { id: team.id },
        data: { lostUntilDay: session.currentDay + 3 },
      });
      await prisma.logEntry.create({
        data: {
          teamId: team.id,
          dayNumber: session.currentDay,
          fromLocationId: team.currentLocationId,
          toLocationId: team.currentLocationId,
          weather,
          provisionsConsumed: lostCost.provisions,
          waterConsumed: lostCost.water,
          wasLost: true,
        },
      });
      results.push({ teamId: team.id, status: "lost" });
      continue;
    }

    const consumption = calculateConsumption(weather, team.currentLocation.type, protection);

    if (!canAfford(inv, consumption.provisions, consumption.water)) {
      await strandTeam(team.id, session.currentDay, dayWeather, team.currentLocation.weatherZone);
      results.push({ teamId: team.id, status: "stranded", stranded: true });
      continue;
    }

    await deductResources(team.id, consumption.provisions, consumption.water);

    if (consumption.riggingUsed) {
      await prisma.inventory.update({
        where: { teamId_resourceType: { teamId: team.id, resourceType: "RIGGING" } },
        data: { quantity: { decrement: 1 } },
      });
    }
    if (consumption.spyglassUsed) {
      await prisma.inventory.update({
        where: { teamId_resourceType: { teamId: team.id, resourceType: "SPYGLASS" } },
        data: { quantity: { decrement: 1 }, totalWeight: { decrement: 10 } },
      });
      await prisma.team.update({
        where: { id: team.id },
        data: { cargoCapacity: { increment: 10 } },
      });
    }

    // Treasure Island bonus
    let treasureEarned = 0;
    if (team.currentLocation.type === "TREASURE_ISLAND") {
      treasureEarned = 1;
      await awardTreasure(team.id, session.currentDay);
    }

    await prisma.logEntry.create({
      data: {
        teamId: team.id,
        dayNumber: session.currentDay,
        fromLocationId: team.currentLocationId,
        toLocationId: team.currentLocationId,
        weather,
        provisionsConsumed: consumption.provisions,
        waterConsumed: consumption.water,
        riggingUsed: consumption.riggingUsed,
        spyglassUsed: consumption.spyglassUsed,
        treasureEarned,
      },
    });

    results.push({ teamId: team.id, status: "stayed", treasure: treasureEarned });
  }

  // Auto-end game after day 25
  // Note: endGameInternal is defined later in Task 4. Add this stub at the top of the file
  // until Task 4 replaces it:
  //   async function endGameInternal(sessionId: string) { /* stub — replaced in Task 4 */ }
  if (session.currentDay >= 25) {
    await endGameInternal(sessionId);
    return { day: session.currentDay, results, gameEnded: true };
  }

  return { day: session.currentDay, results, gameEnded: false };
}

async function deductResources(teamId: string, provisions: number, water: number) {
  if (provisions > 0) {
    await prisma.inventory.updateMany({
      where: { teamId, resourceType: "PROVISIONS" },
      data: { quantity: { decrement: provisions }, totalWeight: { decrement: provisions * 10 } },
    });
    await prisma.team.update({
      where: { id: teamId },
      data: { cargoCapacity: { increment: provisions * 10 } },
    });
  }
  if (water > 0) {
    await prisma.inventory.updateMany({
      where: { teamId, resourceType: "WATER" },
      data: { quantity: { decrement: water }, totalWeight: { decrement: water * 50 } },
    });
    await prisma.team.update({
      where: { id: teamId },
      data: { cargoCapacity: { increment: water * 50 } },
    });
  }
}

async function awardTreasure(teamId: string, dayNumber: number) {
  await prisma.inventory.upsert({
    where: { teamId_resourceType: { teamId, resourceType: "TREASURE" } },
    create: { teamId, resourceType: "TREASURE", quantity: 1, totalWeight: 50 },
    update: { quantity: { increment: 1 }, totalWeight: { increment: 50 } },
  });
  await prisma.team.update({
    where: { id: teamId },
    data: { cargoCapacity: { decrement: 50 } },
  });
}

async function strandTeam(teamId: string, dayNumber: number, dayWeather: DayWeather, zone: string) {
  // Zero out consumable inventory
  await prisma.inventory.updateMany({
    where: { teamId, resourceType: { in: ["WATER", "PROVISIONS"] } },
    data: { quantity: 0, totalWeight: 0 },
  });
  await prisma.team.update({
    where: { id: teamId },
    data: { status: "STRANDED" },
  });
}
```

- [ ] **Step 2: Create API routes for day controls**

```ts
// src/app/api/game/advance-day/route.ts
import { NextResponse } from "next/server";
import { advanceDay } from "@/lib/game-actions";

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json();
    if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    const result = await advanceDay(sessionId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 400 });
  }
}
```

```ts
// src/app/api/game/end-day/route.ts
import { NextResponse } from "next/server";
import { endDay } from "@/lib/game-actions";

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json();
    if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    const result = await endDay(sessionId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 400 });
  }
}
```

```ts
// src/app/api/game/timer/pause/route.ts
import { NextResponse } from "next/server";
import { pauseTimer } from "@/lib/game-actions";

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json();
    const result = await pauseTimer(sessionId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 400 });
  }
}
```

```ts
// src/app/api/game/timer/resume/route.ts
import { NextResponse } from "next/server";
import { resumeTimer } from "@/lib/game-actions";

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json();
    const result = await resumeTimer(sessionId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 400 });
  }
}
```

```ts
// src/app/api/game/timer/extend/route.ts
import { NextResponse } from "next/server";
import { extendTimer } from "@/lib/game-actions";

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json();
    const result = await extendTimer(sessionId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 400 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/game-actions.ts src/app/api/game/advance-day/ src/app/api/game/end-day/ src/app/api/game/timer/
git commit -m "feat: add day progression, timer controls, and day-end processing"
```

---

### Task 3: Movement & Socket.io Wiring

**Goal:** Handle the `submit-move` Socket.io event on the server — validate movement, calculate consumption, apply storm/lost/stranded logic, and broadcast results.

**Files:**
- Modify: `src/lib/game-actions.ts` (add `submitMove`)
- Modify: `server.ts` (add `submit-move` handler + day-end timer auto-trigger)

**Acceptance Criteria:**
- [ ] Captain emitting `submit-move` with valid adjacent hex triggers movement
- [ ] Server validates adjacency, lost status, already-moved-today, and team status
- [ ] Consumption calculated based on weather at destination
- [ ] Storm protection checked (rigging → spyglass → none → lost)
- [ ] Lost mechanic auto-resolves 3 days of doubled consumption
- [ ] Insufficient resources triggers stranding
- [ ] `move-confirmed` emitted to team, `team-moved` emitted to facilitator
- [ ] Timer auto-triggers `endDay` when timerEnd is reached

**Verify:** Start game, advance day, emit `submit-move` from captain → receive `move-confirmed` back

**Steps:**

- [ ] **Step 1: Add submitMove to game-actions.ts**

```ts
export async function submitMove(
  teamId: string,
  targetX: number,
  targetY: number
): Promise<{
  success: boolean;
  position: { x: number; y: number };
  inventory: { resourceType: string; quantity: number; totalWeight: number }[];
  consumption: { provisions: number; water: number };
  riggingUsed: boolean;
  spyglassUsed: boolean;
  wasLost: boolean;
  lostUntilDay: number | null;
  stranded: boolean;
  treasureEarned: number;
  doubloons: number;
  cargoCapacity: number;
}> {
  const team = await prisma.team.findUniqueOrThrow({
    where: { id: teamId },
    include: { session: { include: { weatherSchedule: true } }, currentLocation: true, inventory: true, logEntries: true },
  });

  if (team.session.status !== "ACTIVE") throw new Error("Game is not active");
  if (team.status !== "ACTIVE") throw new Error("Team is not active");
  if (team.lostUntilDay && team.lostUntilDay > team.session.currentDay) {
    throw new Error(`Team is lost until day ${team.lostUntilDay}`);
  }

  const alreadyMoved = team.logEntries.some((l) => l.dayNumber === team.session.currentDay);
  if (alreadyMoved) throw new Error("Already moved this day");

  // Validate adjacency
  const neighbors = (await import("@/lib/hex")).getHexNeighbors(
    team.currentLocation!.gridX,
    team.currentLocation!.gridY
  );
  const isAdj = neighbors.some((n) => n.x === targetX && n.y === targetY);
  if (!isAdj) throw new Error("Target is not adjacent");

  // Get target location
  const targetLoc = await prisma.mapLocation.findUnique({
    where: { sessionId_gridX_gridY: { sessionId: team.sessionId, gridX: targetX, gridY: targetY } },
  });
  if (!targetLoc) throw new Error("Invalid target location");

  // Get weather
  const weatherData = team.session.weatherSchedule?.dayData as DayWeather[];
  const dayWeather = weatherData[team.session.currentDay - 1];
  const weather = getWeatherForZone(dayWeather, targetLoc.weatherZone) as import("@/types/game").WeatherType;

  const inv = getInventorySnapshot(team.inventory);
  const protection = checkProtection(inv);

  let wasLost = false;
  let lostUntilDay: number | null = null;
  let stranded = false;
  let provisions = 0;
  let water = 0;
  let riggingUsed = false;
  let spyglassUsed = false;

  // Storm + no protection = lost
  if (isStorm(weather) && protection === "NONE") {
    const lostCost = resolveLost(weather);
    if (!canAfford(inv, lostCost.provisions, lostCost.water)) {
      await strandTeam(teamId, team.session.currentDay, dayWeather, targetLoc.weatherZone);
      // Move team to target before stranding
      await prisma.team.update({ where: { id: teamId }, data: { currentLocationId: targetLoc.id } });
      await prisma.logEntry.create({
        data: {
          teamId, dayNumber: team.session.currentDay,
          fromLocationId: team.currentLocationId, toLocationId: targetLoc.id,
          weather, provisionsConsumed: 0, waterConsumed: 0, wasLost: true,
        },
      });
      const updatedTeam = await prisma.team.findUniqueOrThrow({ where: { id: teamId }, include: { inventory: true } });
      return {
        success: false, position: { x: targetX, y: targetY },
        inventory: updatedTeam.inventory, consumption: { provisions: 0, water: 0 },
        riggingUsed: false, spyglassUsed: false, wasLost: true,
        lostUntilDay: null, stranded: true, treasureEarned: 0,
        doubloons: updatedTeam.doubloons, cargoCapacity: updatedTeam.cargoCapacity,
      };
    }
    await deductResources(teamId, lostCost.provisions, lostCost.water);
    lostUntilDay = team.session.currentDay + 3;
    await prisma.team.update({ where: { id: teamId }, data: { lostUntilDay } });
    wasLost = true;
    provisions = lostCost.provisions;
    water = lostCost.water;
  } else {
    const consumption = calculateConsumption(weather, targetLoc.type, protection);
    provisions = consumption.provisions;
    water = consumption.water;
    riggingUsed = consumption.riggingUsed;
    spyglassUsed = consumption.spyglassUsed;

    if (!canAfford(inv, provisions, water)) {
      await strandTeam(teamId, team.session.currentDay, dayWeather, targetLoc.weatherZone);
      await prisma.team.update({ where: { id: teamId }, data: { currentLocationId: targetLoc.id } });
      await prisma.logEntry.create({
        data: {
          teamId, dayNumber: team.session.currentDay,
          fromLocationId: team.currentLocationId, toLocationId: targetLoc.id,
          weather, provisionsConsumed: 0, waterConsumed: 0,
        },
      });
      const updatedTeam = await prisma.team.findUniqueOrThrow({ where: { id: teamId }, include: { inventory: true } });
      return {
        success: false, position: { x: targetX, y: targetY },
        inventory: updatedTeam.inventory, consumption: { provisions: 0, water: 0 },
        riggingUsed: false, spyglassUsed: false, wasLost: false,
        lostUntilDay: null, stranded: true, treasureEarned: 0,
        doubloons: updatedTeam.doubloons, cargoCapacity: updatedTeam.cargoCapacity,
      };
    }

    await deductResources(teamId, provisions, water);

    if (riggingUsed) {
      await prisma.inventory.update({
        where: { teamId_resourceType: { teamId, resourceType: "RIGGING" } },
        data: { quantity: { decrement: 1 } },
      });
    }
    if (spyglassUsed) {
      await prisma.inventory.update({
        where: { teamId_resourceType: { teamId, resourceType: "SPYGLASS" } },
        data: { quantity: { decrement: 1 }, totalWeight: { decrement: 10 } },
      });
      await prisma.team.update({ where: { id: teamId }, data: { cargoCapacity: { increment: 10 } } });
    }
  }

  // Move team
  await prisma.team.update({ where: { id: teamId }, data: { currentLocationId: targetLoc.id } });

  // Treasure Island bonus
  let treasureEarned = 0;
  if (targetLoc.type === "TREASURE_ISLAND") {
    treasureEarned = 1;
    await awardTreasure(teamId, team.session.currentDay);
  }

  // Log entry
  await prisma.logEntry.create({
    data: {
      teamId, dayNumber: team.session.currentDay,
      fromLocationId: team.currentLocationId, toLocationId: targetLoc.id,
      weather, provisionsConsumed: provisions, waterConsumed: water,
      riggingUsed, spyglassUsed, treasureEarned, wasLost,
    },
  });

  const updatedTeam = await prisma.team.findUniqueOrThrow({
    where: { id: teamId },
    include: { inventory: true },
  });

  return {
    success: true, position: { x: targetX, y: targetY },
    inventory: updatedTeam.inventory,
    consumption: { provisions, water },
    riggingUsed, spyglassUsed, wasLost, lostUntilDay, stranded: false,
    treasureEarned, doubloons: updatedTeam.doubloons, cargoCapacity: updatedTeam.cargoCapacity,
  };
}
```

- [ ] **Step 2: Add submit-move handler and timer auto-trigger to server.ts**

Add inside the `io.on("connection")` block in `server.ts`:

```ts
    socket.on("submit-move", async (data: { teamId: string; targetX: number; targetY: number }) => {
      try {
        const { submitMove } = await import("./src/lib/game-actions");
        const result = await submitMove(data.teamId, data.targetX, data.targetY);

        // Send to captain
        io.to(`team:${data.teamId}`).emit("move-confirmed", result);

        // Send position update to facilitator
        if (socket.data.sessionId) {
          io.to(`session:${socket.data.sessionId}`).emit("team-moved", {
            teamId: data.teamId,
            gridX: result.position.x,
            gridY: result.position.y,
          });

          if (result.stranded) {
            io.to(`team:${data.teamId}`).emit("team-stranded", { message: "Your crew is stranded!" });
            io.to(`session:${socket.data.sessionId}`).emit("team-status-changed", {
              teamId: data.teamId,
              status: "STRANDED",
            });
          }

          if (result.wasLost) {
            io.to(`team:${data.teamId}`).emit("team-lost", {
              lostUntilDay: result.lostUntilDay,
              consumed: result.consumption,
            });
            io.to(`session:${socket.data.sessionId}`).emit("team-status-changed", {
              teamId: data.teamId,
              status: "LOST",
            });
          }
        }
      } catch (error) {
        socket.emit("move-error", { message: error instanceof Error ? error.message : "Move failed" });
      }
    });
```

Also add a timer check interval at the end of the `app.prepare().then()` block (before `httpServer.listen`):

```ts
  // Auto-trigger day end when timer expires
  setInterval(async () => {
    try {
      const activeSessions = await prisma.gameSession.findMany({
        where: { status: "ACTIVE", timerRunning: true },
      });

      for (const session of activeSessions) {
        if (session.timerEnd && session.timerEnd.getTime() <= Date.now()) {
          const { endDay } = await import("./src/lib/game-actions");
          const result = await endDay(session.id);

          io.to(`game:${session.id}`).emit("day-ended", {
            day: result.day,
            results: result.results,
            gameEnded: result.gameEnded,
          });

          if (result.gameEnded) {
            const { endGame } = await import("./src/lib/game-actions");
            const scores = await endGame(session.id);
            io.to(`game:${session.id}`).emit("game-ended", { scores });
          }
        }
      }
    } catch (err) {
      console.error("Timer check error:", err);
    }
  }, 1000);
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/game-actions.ts server.ts
git commit -m "feat: add movement engine with storm/lost/stranded logic and Socket.io wiring"
```

---

### Task 4: Scoring & End Game

**Goal:** Implement scoring logic, game end processing, and CSV export.

**Files:**
- Create: `src/lib/scoring.ts`
- Create: `src/lib/__tests__/scoring.test.ts`
- Modify: `src/lib/game-actions.ts` (add `endGame` using `endGameInternal`)
- Create: `src/app/api/game/end/route.ts`

**Acceptance Criteria:**
- [ ] Teams at Home Port score = treasure count
- [ ] Teams not at Home Port → SHIPWRECKED, score = 0
- [ ] STRANDED teams score = 0
- [ ] Tiebreaker by return day (earlier = higher rank)
- [ ] CSV export with all columns
- [ ] `POST /api/game/end` works for manual end

**Verify:** `npx vitest run src/lib/__tests__/scoring.test.ts` → all pass

**Steps:**

- [ ] **Step 1: Create scoring module**

```ts
// src/lib/scoring.ts
type TeamForScoring = {
  id: string;
  name: string;
  color: string;
  status: string;
  currentLocation: { type: string } | null;
  inventory: { resourceType: string; quantity: number }[];
  logEntries: { dayNumber: number; toLocationId: string | null }[];
};

export type ScoreEntry = {
  rank: number;
  teamId: string;
  teamName: string;
  color: string;
  treasure: number;
  status: string;
  returnDay: number | null;
};

export function calculateScores(
  teams: TeamForScoring[],
  homePortLocationId: string
): ScoreEntry[] {
  const entries: Omit<ScoreEntry, "rank">[] = teams.map((team) => {
    if (team.status === "STRANDED") {
      return {
        teamId: team.id, teamName: team.name, color: team.color,
        treasure: 0, status: "STRANDED", returnDay: null,
      };
    }

    const atHome = team.currentLocation?.type === "HOME_PORT";
    if (!atHome) {
      return {
        teamId: team.id, teamName: team.name, color: team.color,
        treasure: 0, status: "SHIPWRECKED", returnDay: null,
      };
    }

    const treasure = team.inventory
      .filter((i) => i.resourceType === "TREASURE")
      .reduce((sum, i) => sum + i.quantity, 0);

    // Find the last day they arrived at Home Port
    const homeEntries = team.logEntries
      .filter((l) => l.toLocationId === homePortLocationId)
      .map((l) => l.dayNumber);
    const returnDay = homeEntries.length > 0 ? Math.max(...homeEntries) : null;

    return {
      teamId: team.id, teamName: team.name, color: team.color,
      treasure, status: "FINISHED", returnDay,
    };
  });

  // Sort: by treasure desc, then by returnDay asc (earlier return = better)
  entries.sort((a, b) => {
    if (b.treasure !== a.treasure) return b.treasure - a.treasure;
    if (a.returnDay === null) return 1;
    if (b.returnDay === null) return -1;
    return a.returnDay - b.returnDay;
  });

  return entries.map((e, i) => ({ ...e, rank: i + 1 }));
}

export function generateCSV(scores: ScoreEntry[]): string {
  const header = "rank,team_name,color,treasure,status,return_day";
  const rows = scores.map((s) =>
    `${s.rank},"${s.teamName}",${s.color},${s.treasure},${s.status},${s.returnDay ?? ""}`
  );
  return [header, ...rows].join("\n");
}
```

- [ ] **Step 2: Write scoring tests**

```ts
// src/lib/__tests__/scoring.test.ts
import { describe, it, expect } from "vitest";
import { calculateScores, generateCSV } from "@/lib/scoring";

const HOME_PORT_ID = "home-port-123";

function makeTeam(overrides: Record<string, unknown> = {}) {
  return {
    id: "team-1", name: "Red Skulls", color: "#e53e3e", status: "ACTIVE",
    currentLocation: { type: "HOME_PORT" },
    inventory: [{ resourceType: "TREASURE", quantity: 5 }],
    logEntries: [{ dayNumber: 20, toLocationId: HOME_PORT_ID }],
    ...overrides,
  };
}

describe("calculateScores", () => {
  it("scores team at home port with treasure", () => {
    const scores = calculateScores([makeTeam() as never], HOME_PORT_ID);
    expect(scores[0].treasure).toBe(5);
    expect(scores[0].status).toBe("FINISHED");
    expect(scores[0].rank).toBe(1);
  });

  it("shipwrecks team not at home port", () => {
    const team = makeTeam({ currentLocation: { type: "OPEN_SEA" } });
    const scores = calculateScores([team as never], HOME_PORT_ID);
    expect(scores[0].treasure).toBe(0);
    expect(scores[0].status).toBe("SHIPWRECKED");
  });

  it("stranded teams score zero", () => {
    const team = makeTeam({ status: "STRANDED" });
    const scores = calculateScores([team as never], HOME_PORT_ID);
    expect(scores[0].treasure).toBe(0);
    expect(scores[0].status).toBe("STRANDED");
  });

  it("ranks by treasure descending then return day ascending", () => {
    const t1 = makeTeam({ id: "t1", name: "A", inventory: [{ resourceType: "TREASURE", quantity: 8 }], logEntries: [{ dayNumber: 22, toLocationId: HOME_PORT_ID }] });
    const t2 = makeTeam({ id: "t2", name: "B", inventory: [{ resourceType: "TREASURE", quantity: 8 }], logEntries: [{ dayNumber: 20, toLocationId: HOME_PORT_ID }] });
    const t3 = makeTeam({ id: "t3", name: "C", inventory: [{ resourceType: "TREASURE", quantity: 3 }], logEntries: [{ dayNumber: 18, toLocationId: HOME_PORT_ID }] });
    const scores = calculateScores([t1, t2, t3] as never[], HOME_PORT_ID);
    expect(scores[0].teamId).toBe("t2"); // same treasure, earlier return
    expect(scores[1].teamId).toBe("t1");
    expect(scores[2].teamId).toBe("t3"); // less treasure
  });
});

describe("generateCSV", () => {
  it("produces valid CSV", () => {
    const scores = calculateScores([makeTeam() as never], HOME_PORT_ID);
    const csv = generateCSV(scores);
    expect(csv).toContain("rank,team_name");
    expect(csv).toContain("Red Skulls");
  });
});
```

- [ ] **Step 3: Add endGame to game-actions.ts**

Add to `src/lib/game-actions.ts`:

```ts
import { calculateScores } from "@/lib/scoring";
import type { ScoreEntry } from "@/lib/scoring";

async function endGameInternal(sessionId: string): Promise<ScoreEntry[]> {
  const session = await prisma.gameSession.findUniqueOrThrow({
    where: { id: sessionId },
    include: {
      teams: {
        include: {
          currentLocation: true,
          inventory: true,
          logEntries: true,
        },
      },
      mapLocations: { where: { type: "HOME_PORT" } },
    },
  });

  const homePortId = session.mapLocations[0]?.id || "";

  const scores = calculateScores(session.teams as never[], homePortId);

  // Update team statuses
  for (const score of scores) {
    if (score.status === "SHIPWRECKED") {
      await prisma.team.update({ where: { id: score.teamId }, data: { status: "SHIPWRECKED" } });
    } else if (score.status === "FINISHED") {
      await prisma.team.update({ where: { id: score.teamId }, data: { status: "FINISHED" } });
    }
  }

  await prisma.gameSession.update({
    where: { id: sessionId },
    data: { status: "ENDED", timerRunning: false, timerEnd: null },
  });

  return scores;
}

export async function endGame(sessionId: string): Promise<ScoreEntry[]> {
  const session = await prisma.gameSession.findUniqueOrThrow({ where: { id: sessionId } });
  if (session.status !== "ACTIVE") throw new Error("Game is not active");
  return endGameInternal(sessionId);
}
```

- [ ] **Step 4: Create end game API route**

```ts
// src/app/api/game/end/route.ts
import { NextResponse } from "next/server";
import { endGame } from "@/lib/game-actions";
import { generateCSV } from "@/lib/scoring";

export async function POST(request: Request) {
  try {
    const { sessionId, format } = await request.json();
    if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

    const scores = await endGame(sessionId);

    if (format === "csv") {
      const csv = generateCSV(scores);
      return new Response(csv, {
        headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=results.csv" },
      });
    }

    return NextResponse.json({ scores });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 400 });
  }
}
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run src/lib/__tests__/scoring.test.ts
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/scoring.ts src/lib/__tests__/scoring.test.ts src/lib/game-actions.ts src/app/api/game/end/
git commit -m "feat: add scoring engine, end game logic, and CSV export"
```

---

### Task 5: Game UI Components

**Goal:** Create all the new UI components: BuyPanel, DayTimer, WeatherDisplay, DayControls, Scoreboard, StrandedOverlay.

**Files:**
- Create: `src/components/game/BuyPanel.tsx`
- Create: `src/components/game/DayTimer.tsx`
- Create: `src/components/game/WeatherDisplay.tsx`
- Create: `src/components/game/DayControls.tsx`
- Create: `src/components/game/Scoreboard.tsx`
- Create: `src/components/game/StrandedOverlay.tsx`

**Acceptance Criteria:**
- [ ] BuyPanel shows resource list with +/- buttons, total cost/weight, and confirm button
- [ ] DayTimer shows countdown from timerEnd, synced to server timestamp
- [ ] WeatherDisplay shows zone weather with icons (team=own zone, facilitator=all zones)
- [ ] DayControls gives facilitator Next Day, Pause, Resume, Extend, End Day buttons
- [ ] Scoreboard shows leaderboard with ranks, status badges, and CSV download
- [ ] StrandedOverlay covers the screen when team is stranded

**Verify:** Import and render each component in a test page → all render without errors

**Steps:**

- [ ] **Step 1: Create BuyPanel**

```tsx
// src/components/game/BuyPanel.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RESOURCE_PRICES } from "@/lib/resource-prices";

type BuyPanelProps = {
  teamId: string;
  sessionId: string;
  doubloons: number;
  cargoCapacity: number;
  locationType: string;
  onPurchase: (updatedTeam: Record<string, unknown>) => void;
};

const BUYABLE = ["WATER", "PROVISIONS", "RIGGING", "SPYGLASS"] as const;
const LABELS: Record<string, string> = {
  WATER: "Water (cask)", PROVISIONS: "Provisions (barrel)",
  RIGGING: "Storm Rigging", SPYGLASS: "Spyglass",
};

export function BuyPanel({ teamId, sessionId, doubloons, cargoCapacity, locationType, onPurchase }: BuyPanelProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isHomePort = locationType === "HOME_PORT";
  const isTradingPost = locationType === "TRADING_POST";

  if (!isHomePort && !isTradingPost) return null;

  const available = BUYABLE.filter((r) => {
    const entry = RESOURCE_PRICES[r];
    if (isHomePort) return true;
    return entry.tradingPost !== null;
  });

  const totalCost = available.reduce((sum, r) => {
    const qty = quantities[r] || 0;
    const price = isHomePort ? RESOURCE_PRICES[r].homePort : (RESOURCE_PRICES[r].tradingPost || 0);
    return sum + qty * price;
  }, 0);

  const totalWeight = available.reduce((sum, r) => {
    const qty = quantities[r] || 0;
    return sum + qty * RESOURCE_PRICES[r].weight;
  }, 0);

  const handleBuy = async () => {
    const items = available
      .filter((r) => (quantities[r] || 0) > 0)
      .map((r) => ({ resourceType: r, quantity: quantities[r] }));

    if (items.length === 0) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/game/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, teamId, items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQuantities({});
      onPurchase(data.team);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Purchase failed");
    } finally {
      setLoading(false);
    }
  };

  const setQty = (r: string, delta: number) => {
    setQuantities((prev) => ({ ...prev, [r]: Math.max(0, (prev[r] || 0) + delta) }));
  };

  return (
    <Card>
      <CardContent className="py-3 space-y-2">
        <h3 className="font-bold text-sm">Buy Supplies</h3>
        {available.map((r) => {
          const price = isHomePort ? RESOURCE_PRICES[r].homePort : RESOURCE_PRICES[r].tradingPost!;
          const qty = quantities[r] || 0;
          return (
            <div key={r} className="flex items-center justify-between text-sm">
              <span className="flex-1">{LABELS[r]} ({price}g)</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => setQty(r, -1)}>-</Button>
                <span className="w-6 text-center">{qty}</span>
                <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => setQty(r, 1)}>+</Button>
              </div>
            </div>
          );
        })}
        <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t">
          <span>Cost: {totalCost} / {doubloons}</span>
          <span>Weight: {totalWeight} / {cargoCapacity}</span>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button size="sm" className="w-full" onClick={handleBuy} disabled={loading || totalCost === 0}>
          {loading ? "Buying..." : "Confirm Purchase"}
        </Button>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create DayTimer**

```tsx
// src/components/game/DayTimer.tsx
"use client";

import { useState, useEffect } from "react";

type DayTimerProps = {
  timerEnd: string | null;
  paused?: boolean;
};

export function DayTimer({ timerEnd, paused }: DayTimerProps) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!timerEnd || paused) return;

    const update = () => {
      const ms = new Date(timerEnd).getTime() - Date.now();
      setRemaining(Math.max(0, ms));
    };

    update();
    const interval = setInterval(update, 250);
    return () => clearInterval(interval);
  }, [timerEnd, paused]);

  const seconds = Math.ceil(remaining / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const isLow = seconds <= 30;

  return (
    <div className={`text-center font-mono text-3xl font-bold ${isLow ? "text-red-500 animate-pulse" : "text-foreground"}`}>
      {mins}:{secs.toString().padStart(2, "0")}
    </div>
  );
}
```

- [ ] **Step 3: Create WeatherDisplay**

```tsx
// src/components/game/WeatherDisplay.tsx
"use client";

import type { DayWeather, WeatherType } from "@/types/game";

const WEATHER_ICONS: Record<WeatherType, string> = {
  CLEAR: "☀️",
  TEMPEST: "⛈️",
  DOLDRUMS: "🌫️",
  MAELSTROM: "🌀",
};

const WEATHER_LABELS: Record<WeatherType, string> = {
  CLEAR: "Clear Seas",
  TEMPEST: "Tempest",
  DOLDRUMS: "Doldrums",
  MAELSTROM: "Maelstrom",
};

type WeatherDisplayProps = {
  weather: DayWeather;
  mode: "team" | "facilitator";
  teamZone?: string; // team's current weather zone
};

export function WeatherDisplay({ weather, mode, teamZone }: WeatherDisplayProps) {
  if (mode === "team" && teamZone) {
    const w = (teamZone === "SAFE" ? weather.safe : teamZone === "KRAKEN" ? weather.kraken : weather.openSea) as WeatherType;
    return (
      <div className="text-center py-2">
        <span className="text-2xl">{WEATHER_ICONS[w]}</span>
        <p className="text-sm font-bold">{WEATHER_LABELS[w]}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4 text-center py-4">
      <div>
        <p className="text-xs text-muted-foreground uppercase">Open Sea</p>
        <span className="text-3xl">{WEATHER_ICONS[weather.openSea]}</span>
        <p className="text-sm font-bold">{WEATHER_LABELS[weather.openSea]}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground uppercase">Kraken's Lair</p>
        <span className="text-3xl">{WEATHER_ICONS[weather.kraken]}</span>
        <p className="text-sm font-bold">{WEATHER_LABELS[weather.kraken]}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground uppercase">Safe Zones</p>
        <span className="text-3xl">{WEATHER_ICONS[weather.safe]}</span>
        <p className="text-sm font-bold">{WEATHER_LABELS[weather.safe]}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create DayControls**

```tsx
// src/components/game/DayControls.tsx
"use client";

import { Button } from "@/components/ui/button";

type DayControlsProps = {
  sessionId: string;
  currentDay: number;
  timerRunning: boolean;
  onDayAdvanced: (data: { day: number; weather: Record<string, string>; timerEnd: string }) => void;
  onDayEnded: (data: Record<string, unknown>) => void;
  onTimerUpdate: (timerEnd: string | null) => void;
};

export function DayControls({ sessionId, currentDay, timerRunning, onDayAdvanced, onDayEnded, onTimerUpdate }: DayControlsProps) {
  const handleAdvance = async () => {
    const res = await fetch("/api/game/advance-day", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    const data = await res.json();
    if (res.ok) onDayAdvanced(data);
  };

  const handleEndDay = async () => {
    const res = await fetch("/api/game/end-day", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    const data = await res.json();
    if (res.ok) onDayEnded(data);
  };

  const handlePause = async () => {
    await fetch("/api/game/timer/pause", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    onTimerUpdate(null);
  };

  const handleResume = async () => {
    const res = await fetch("/api/game/timer/resume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    const data = await res.json();
    if (res.ok) onTimerUpdate(data.timerEnd);
  };

  const handleExtend = async () => {
    const res = await fetch("/api/game/timer/extend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    const data = await res.json();
    if (res.ok) onTimerUpdate(data.timerEnd);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {!timerRunning && (
        <Button onClick={handleAdvance}>
          {currentDay === 0 ? "Start Day 1" : `Next Day (${currentDay + 1})`}
        </Button>
      )}
      {timerRunning && (
        <>
          <Button variant="outline" onClick={handlePause}>Pause</Button>
          <Button variant="outline" onClick={handleExtend}>+1 Min</Button>
          <Button variant="destructive" onClick={handleEndDay}>End Day</Button>
        </>
      )}
      {!timerRunning && currentDay > 0 && (
        <Button variant="outline" onClick={handleResume}>Resume</Button>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create Scoreboard**

```tsx
// src/components/game/Scoreboard.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ScoreEntry } from "@/lib/scoring";

type ScoreboardProps = {
  scores: ScoreEntry[];
  sessionId: string;
  highlightTeamId?: string;
  mode: "team" | "facilitator";
};

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  FINISHED: { label: "Home!", className: "bg-green-500/20 text-green-400" },
  SHIPWRECKED: { label: "Shipwrecked!", className: "bg-red-500/20 text-red-400" },
  STRANDED: { label: "Stranded!", className: "bg-orange-500/20 text-orange-400" },
};

export function Scoreboard({ scores, sessionId, highlightTeamId, mode }: ScoreboardProps) {
  const handleExport = async () => {
    const res = await fetch("/api/game/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, format: "csv" }),
    });
    const csv = await res.text();
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pirate-kings-results.csv";
    a.click();
  };

  return (
    <div className="space-y-4">
      <h2 className={`font-bold text-center ${mode === "facilitator" ? "text-3xl" : "text-xl"}`}>
        Final Standings
      </h2>
      <div className="space-y-2">
        {scores.map((s) => {
          const badge = STATUS_BADGES[s.status] || STATUS_BADGES.FINISHED;
          const isHighlighted = s.teamId === highlightTeamId;
          return (
            <Card key={s.teamId} className={isHighlighted ? "border-2 border-primary" : ""}>
              <CardContent className="py-3 flex items-center gap-3">
                <span className={`text-2xl font-bold w-8 ${mode === "facilitator" ? "text-4xl w-12" : ""}`}>
                  #{s.rank}
                </span>
                <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <div className="flex-1">
                  <p className="font-bold text-sm">{s.teamName}</p>
                  {s.treasure > 0 && (
                    <p className="text-xs text-muted-foreground">{s.treasure} treasure • returned day {s.returnDay}</p>
                  )}
                </div>
                <span className={`text-xs px-2 py-1 rounded ${badge.className}`}>{badge.label}</span>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {mode === "facilitator" && (
        <Button variant="outline" className="w-full" onClick={handleExport}>
          Download CSV
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Create StrandedOverlay**

```tsx
// src/components/game/StrandedOverlay.tsx
"use client";

export function StrandedOverlay({ status }: { status: string }) {
  if (status !== "STRANDED" && status !== "SHIPWRECKED") return null;

  const message = status === "STRANDED"
    ? "Your crew is stranded! You've run out of supplies."
    : "Shipwrecked! You didn't make it back to port.";

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-8">
      <div className="text-center space-y-4">
        <p className="text-6xl">💀</p>
        <h2 className="text-2xl font-bold text-red-400">{status === "STRANDED" ? "Stranded!" : "Shipwrecked!"}</h2>
        <p className="text-muted-foreground">{message}</p>
        <p className="text-sm text-muted-foreground">You can still watch the game unfold.</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add src/components/game/
git commit -m "feat: add game UI components — buy panel, timer, weather, scoreboard, stranded overlay"
```

---

### Task 6: Wire Up Facilitator Page

**Goal:** Integrate all new components into the facilitator page — day controls, weather display, timer, team status indicators, scoreboard.

**Files:**
- Modify: `src/app/facilitator/page.tsx`

**Acceptance Criteria:**
- [ ] Active phase shows day controls (Next Day, Pause, Extend, End Day)
- [ ] Weather announcement displayed for all 3 zones after advancing day
- [ ] Countdown timer synced from timerEnd
- [ ] Team cards show status changes (lost/stranded) in real-time
- [ ] Map updates when teams move
- [ ] Scoreboard phase shows leaderboard after game ends with CSV export
- [ ] "End Voyage" button available to force-end the game

**Verify:** Create game, advance days, observe weather + timer + team movement on facilitator view

**Steps:**

- [ ] **Step 1: Rewrite facilitator active phase**

Replace the active phase `return` block in `src/app/facilitator/page.tsx` (everything after `if (phase === "lobby")`) with a full implementation that includes DayControls, WeatherDisplay, DayTimer, team status indicators, and a scoreboard phase. The facilitator page should:

1. Add state for `weather`, `timerEnd`, `timerRunning`, `scores`, and a `"scoreboard"` phase
2. Listen for Socket.io events: `day-advanced`, `day-ended`, `team-moved`, `team-status-changed`, `game-ended`
3. In active phase: render DayControls + WeatherDisplay + DayTimer + MapContainer + team status list
4. On `day-advanced`: update weather, timerEnd, currentDay state
5. On `team-moved`: update team position in local state
6. On `team-status-changed`: update team status in local state (LOST/STRANDED indicators)
7. On `game-ended`: transition to scoreboard phase, show Scoreboard component
8. Add "End Voyage" button that calls `POST /api/game/end`

Wire the Socket.io listeners in the `handleStart` function (where the facilitator socket is already connected).

- [ ] **Step 2: Verify**

Start dev server, create a game, start the voyage, advance days — confirm weather displays, timer counts down, day controls work.

- [ ] **Step 3: Commit**

```bash
git add src/app/facilitator/page.tsx
git commit -m "feat: wire day controls, weather, timer, and scoreboard into facilitator page"
```

---

### Task 7: Wire Up Team Dashboard

**Goal:** Integrate all new components into the team captain's play page — buy panel, weather, timer, movement via map tap, stranded overlay, and scoreboard.

**Files:**
- Modify: `src/app/play/[teamId]/page.tsx`

**Acceptance Criteria:**
- [ ] BuyPanel appears when team is at Home Port or Trading Post
- [ ] Weather for team's zone shown after day advance
- [ ] Countdown timer visible and synced
- [ ] Tapping adjacent hex emits `submit-move` via Socket.io
- [ ] `move-confirmed` updates position, inventory, and map
- [ ] `team-lost` shows dramatic lost alert with lostUntilDay
- [ ] `team-stranded` shows StrandedOverlay
- [ ] `game-ended` shows Scoreboard with own rank highlighted
- [ ] All UI fits on 375px mobile viewport

**Verify:** On phone viewport, join game, buy supplies, move to adjacent hex, observe consumption update. Get caught in a storm → see lost or stranded state.

**Steps:**

- [ ] **Step 1: Add Socket.io event handlers and new state**

Update `src/app/play/[teamId]/page.tsx` to:

1. Add state for `weather`, `timerEnd`, `scores`, `moveError`, `isLost`
2. Listen for Socket.io events: `day-advanced`, `day-ended`, `move-confirmed`, `move-error`, `team-lost`, `team-stranded`, `purchase-confirmed`, `game-ended`
3. On `day-advanced`: set weather + timerEnd, clear moveError
4. On `move-confirmed`: update team position, inventory, doubloons, cargoCapacity
5. On `team-lost`: show alert with lostUntilDay
6. On `team-stranded`: update team status → triggers StrandedOverlay
7. On `game-ended`: set scores → transition to scoreboard

- [ ] **Step 2: Add map hex click handler**

Wire the `onHexClick` prop on MapContainer to emit `submit-move`:

```ts
const handleHexClick = (x: number, y: number) => {
  if (!team || team.status !== "ACTIVE") return;
  const socket = getSocket();
  socket.emit("submit-move", { teamId: team.id, targetX: x, targetY: y });
};
```

- [ ] **Step 3: Add BuyPanel, WeatherDisplay, DayTimer, StrandedOverlay, Scoreboard**

Render these components conditionally:
- `BuyPanel` when team is at HOME_PORT or TRADING_POST and game is ACTIVE
- `WeatherDisplay` when weather is available (mode="team", teamZone from current location)
- `DayTimer` when timerEnd is set
- `StrandedOverlay` when team status is STRANDED or SHIPWRECKED
- `Scoreboard` when scores are set (game ended)

- [ ] **Step 4: Verify on mobile viewport**

Open devtools at 375px, create game on facilitator, join as captain, buy supplies, advance day, move around.

- [ ] **Step 5: Commit**

```bash
git add src/app/play/[teamId]/page.tsx
git commit -m "feat: wire buy panel, movement, weather, and scoreboard into team dashboard"
```

---

### Task 8: Socket.io Event Broadcasting from API Routes

**Goal:** Ensure all API route actions (purchase, advance-day, end-day, timer controls, end-game) broadcast Socket.io events to connected clients.

**Files:**
- Modify: `src/app/api/game/purchase/route.ts`
- Modify: `src/app/api/game/advance-day/route.ts`
- Modify: `src/app/api/game/end-day/route.ts`
- Modify: `src/app/api/game/end/route.ts`
- Modify: `src/app/api/game/timer/pause/route.ts`
- Modify: `src/app/api/game/timer/resume/route.ts`
- Modify: `src/app/api/game/timer/extend/route.ts`

**Acceptance Criteria:**
- [ ] Purchase broadcasts `purchase-confirmed` to team room
- [ ] Advance day broadcasts `day-advanced` to game room
- [ ] End day broadcasts `day-ended` to game room
- [ ] Timer controls broadcast `timer-paused`/`timer-resumed`/`timer-updated` to game room
- [ ] End game broadcasts `game-ended` to game room
- [ ] All broadcasts use the global `__io` Socket.io instance

**Verify:** Facilitator advances day → team phone receives weather update. Captain purchases → facilitator sees transaction.

**Steps:**

- [ ] **Step 1: Create io helper**

```ts
// src/lib/io.ts
import type { Server as SocketServer } from "socket.io";

export function getIO(): SocketServer {
  const io = (globalThis as Record<string, unknown>).__io as SocketServer;
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}
```

- [ ] **Step 2: Add broadcasts to each API route**

In each route, after the successful action, call `getIO()` and emit the appropriate event. For example in `advance-day/route.ts`:

```ts
import { getIO } from "@/lib/io";

// After successful advanceDay:
const io = getIO();
io.to(`game:${sessionId}`).emit("day-advanced", result);
```

Apply this pattern to all 7 routes:
- `purchase` → `io.to(team:${teamId}).emit("purchase-confirmed", team)` + `io.to(session:${sessionId}).emit("team-purchased", ...)`
- `advance-day` → `io.to(game:${sessionId}).emit("day-advanced", result)`
- `end-day` → `io.to(game:${sessionId}).emit("day-ended", result)`
- `timer/pause` → `io.to(game:${sessionId}).emit("timer-paused", result)`
- `timer/resume` → `io.to(game:${sessionId}).emit("timer-resumed", result)`
- `timer/extend` → `io.to(game:${sessionId}).emit("timer-updated", result)`
- `end` → `io.to(game:${sessionId}).emit("game-ended", { scores })`

- [ ] **Step 3: Commit**

```bash
git add src/lib/io.ts src/app/api/game/
git commit -m "feat: broadcast Socket.io events from all API routes"
```

---

## Task Dependency Graph

```
Task 0 (Consumption Engine)     → independent, no deps
Task 1 (Purchase Logic)         → depends on Task 0
Task 2 (Day Progression)        → depends on Task 0
Task 3 (Movement + Socket.io)   → depends on Task 0, Task 2
Task 4 (Scoring & End Game)     → depends on Task 0
Task 5 (UI Components)          → depends on Task 0 (imports resource-prices)
Task 6 (Facilitator Wiring)     → depends on Task 2, Task 4, Task 5
Task 7 (Team Dashboard Wiring)  → depends on Task 1, Task 3, Task 5
Task 8 (Socket.io Broadcasting) → depends on Task 1, Task 2, Task 3, Task 4
```
