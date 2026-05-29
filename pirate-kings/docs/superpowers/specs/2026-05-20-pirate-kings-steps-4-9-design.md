# Treasure of the Pirate Kings — Steps 4–9 Design Spec

**Date:** 2026-05-20
**Scope:** Resource purchasing, day progression/weather/timer, movement/consumption, storm mechanics, stranding, endgame scoreboard
**Prerequisites:** Steps 1–3 complete (schema, hex map, session/join flow, Socket.io server)
**Project:** `C:\Users\hussi\promises-promises\pirate-kings`

---

## 1. Resource Purchasing System

### 1.1 Overview

Teams buy resources at Home Port (base prices) or Trading Posts (double prices). Storm Rigging and Spyglass are Home Port only. Purchases happen anytime during the 3-minute day window alongside movement — no enforced order.

### 1.2 Prices

| Resource | Weight (tons) | Home Port Price | Trading Post Price |
|---|---|---|---|
| Water (cask) | 50 | 25 doubloons | 50 doubloons |
| Provisions (barrel) | 10 | 10 doubloons | 20 doubloons |
| Storm Rigging | 60 | 400 doubloons | — (Home Port only) |
| Spyglass | 10 | 100 doubloons | — (Home Port only) |

### 1.3 API

`POST /api/game/purchase`

Request body:
```json
{
  "sessionId": "string",
  "teamId": "string",
  "items": [
    { "resourceType": "WATER", "quantity": 5 },
    { "resourceType": "PROVISIONS", "quantity": 10 }
  ]
}
```

### 1.4 Server Validation (atomic — all or nothing)

1. Game is ACTIVE
2. Team status is ACTIVE (not stranded/shipwrecked)
3. Team is at Home Port or a Trading Post
4. Rigging/Spyglass: only at Home Port
5. Sufficient doubloons for total cost
6. Sufficient cargo capacity for total weight
7. No negative quantities

### 1.5 On Success

- Upsert Inventory rows (increment quantity and totalWeight)
- Deduct doubloons from Team
- Reduce cargoCapacity on Team
- Create Transaction records (type: PURCHASE)
- Emit updated team state via Socket.io to `team:{teamId}`
- Emit transaction to `session:{sessionId}` for facilitator's transaction log

### 1.6 On Failure

Return specific error message: "Not enough doubloons" / "Over cargo capacity" / "Rigging only at Home Port" / etc.

---

## 2. Day Progression, Weather & Timer

### 2.1 Day Advance Flow

1. Facilitator clicks "Next Day" → `POST /api/game/advance-day`
2. Server increments `currentDay`, looks up weather from WeatherSchedule
3. Server sets `timerEnd = now + 180 seconds`, `timerRunning = true`
4. Server broadcasts `day-advanced` to `game:{sessionId}`:
   ```json
   {
     "day": 5,
     "weather": { "openSea": "CLEAR", "kraken": "TEMPEST", "safe": "CLEAR" },
     "timerEnd": "2026-05-20T14:03:00.000Z"
   }
   ```
5. All clients sync countdown from absolute `timerEnd` timestamp (not relative)

### 2.2 Timer Controls (Facilitator Only)

| Action | API | Socket.io Event | Behavior |
|---|---|---|---|
| Pause | `POST /api/game/timer/pause` | `timer-paused` with `{ remainingMs }` | Sets `timerRunning = false` |
| Resume | `POST /api/game/timer/resume` | `timer-resumed` with `{ timerEnd }` | Sets `timerEnd = now + remainingMs` |
| Extend +1 min | `POST /api/game/timer/extend` | `timer-updated` with `{ timerEnd }` | Adds 60s to `timerEnd` |
| End day early | `POST /api/game/end-day` | `day-ended` | Triggers day-end processing |

### 2.3 Day-End Processing

When the timer hits zero (or facilitator forces end):

1. Server broadcasts `day-ended` to `game:{sessionId}`
2. For each ACTIVE team that hasn't submitted a move this day:
   - Stay in place: consume resources based on weather at current location
   - Exception: Home Port = zero consumption
3. Teams on Treasure Island earn +1 treasure chest (50 tons weight, reduces cargo capacity)
4. Create LogEntry for every team (moved or not)
5. Check for stranding (Section 5)
6. Facilitator screen re-enables "Next Day" button

### 2.4 Day 25 Special

After day 25's day-end processing completes, the game auto-transitions to ENDED. No more "Next Day" — goes straight to scoreboard (Section 6).

### 2.5 Weather Display

- **Facilitator screen:** large dramatic announcement for all 3 zones, projection-optimized
- **Team phone:** shows weather for their current zone only with icon:
  - ☀️ Clear Seas
  - ⛈️ Tempest
  - 🌫️ Doldrums
  - 🌀 Maelstrom

---

## 3. Movement & Consumption Engine

### 3.1 Movement Flow

1. Captain taps adjacent hex on map during 3-minute window
2. Client emits Socket.io `submit-move` with `{ teamId, targetX, targetY }`
3. Server validates:
   - Game is ACTIVE
   - It's a valid day (currentDay > 0)
   - Team hasn't already moved this day
   - Target is adjacent to current position (hex neighbor check)
   - Team is not lost (`lostUntilDay` is null or `<= currentDay`)
   - Team is not STRANDED
4. Server determines weather at target's `weatherZone` using today's schedule
5. Server runs storm protection check (Section 4)
6. Server calculates consumption
7. Server checks resource sufficiency
   - Sufficient → deduct, move, log
   - Insufficient → stranded (Section 5)
8. Server emits `move-confirmed` to `team:{teamId}` with updated position + inventory
9. Server emits `team-moved` to `session:{sessionId}` with `{ teamId, gridX, gridY }` for facilitator map

### 3.2 Consumption Table

| Weather | Provisions | Water |
|---|---|---|
| Clear | 1 | 1 |
| Tempest (unprotected) | 5 | 2 |
| Doldrums | 1 | 3 |
| Maelstrom (unprotected) | 5 | 4 |
| Any storm WITH Rigging | 1 | 1 |
| Tempest WITH Spyglass (no Rigging) | 5 | 2 |
| Maelstrom WITH Spyglass (no Rigging) | 5 | 4 |

### 3.3 Special Locations

- **Home Port:** zero consumption regardless of weather. Team can stay indefinitely.
- **Treasure Island:** always clear weather. +1 treasure chest per day spent here. Chest weighs 50 tons (reduces cargo capacity).
- **Friendly Cove:** water consumption is 0 for the day. Provisions consumed normally.
- **Trading Posts:** always clear weather. Can buy at 2x prices.

### 3.4 One Move Per Day

Once a team submits a move, it's committed — no take-backs. This matches the original game's commitment mechanic.

### 3.5 Stay in Place

If the timer runs out and a team hasn't moved, they stay at their current location. Consumption still applies based on weather at their location (except Home Port = zero).

---

## 4. Storm Rigging & Spyglass Logic

### 4.1 Protection Check Priority

When a team is in a storm (Tempest or Maelstrom), the server checks in order:

1. **Has Rigging (quantity > 0)?**
   - Consume 1 charge (quantity decrements, e.g. 3→2)
   - Consumption reduced to 1 provisions + 1 water
   - Team is NOT lost
   - Rigging weight stays on the ship (item not discarded, just depleted)

2. **Has Spyglass (quantity > 0, no Rigging)?**
   - Consume the Spyglass (quantity 1→0, frees 10 tons cargo)
   - Full storm consumption applies (5+2 Tempest, 5+4 Maelstrom)
   - Team is NOT lost

3. **Neither?**
   - Team is LOST (see below)

### 4.2 Lost Mechanic (Auto-Resolve)

Resolved immediately in a single server operation:

1. Calculate 3 days of doubled consumption:
   - Tempest lost: `(5×2 + 2×2) × 3 = 30 provisions + 12 water`
   - Maelstrom lost: `(5×2 + 4×2) × 3 = 30 provisions + 24 water`

2. Check if team can afford the full cost:
   - **Yes:** deduct all at once, set `lostUntilDay = currentDay + 3`
   - **No:** team is immediately STRANDED (Section 5)

3. Create LogEntry with `wasLost = true`
4. Team cannot move until `currentDay > lostUntilDay`
5. Emit `team-lost` to `team:{teamId}` with dramatic alert
6. Emit `team-status-changed` to `session:{sessionId}` for facilitator

### 4.3 Doldrums

Not a storm — no rigging/spyglass check. Just extra water consumption (3 instead of 1). No lost risk.

### 4.4 Edge Case: Lost Beyond Day 25

If `lostUntilDay > 25`, the team can never return to port. They'll be scored as shipwrecked at game end (score = 0).

---

## 5. Stranded & Elimination

### 5.1 Trigger

Team cannot afford required consumption (provisions OR water insufficient) at any point:
- During a normal move
- During "stay in place" day-end processing
- During the lost-3-days auto-resolve

### 5.2 Resolution

1. Consume whatever resources remain (zero out inventory)
2. Set team status to `STRANDED`
3. Emit `team-stranded` to `team:{teamId}` with dramatic "Stranded!" message
4. Emit `team-status-changed` to `session:{sessionId}` for facilitator

### 5.3 Stranded State

- Cannot move, cannot buy, cannot take any game actions
- Ship stays visible on facilitator's map at last position
- Captain's phone shows "Your crew is stranded" screen — can still observe the game
- Scores zero at game end

### 5.4 No Rescue

No mechanic to save a stranded team. Once stranded, permanently eliminated.

### 5.5 Facilitator Visibility

Stranded teams shown with a distinct red/skull indicator on the facilitator dashboard. The team card shows "Stranded" status.

---

## 6. End Game & Scoreboard

### 6.1 Trigger

- Day 25 ends → automatic transition to ENDED
- OR facilitator clicks "End Voyage" at any time

### 6.2 Scoring Logic

For each team:
- **At Home Port + status ACTIVE:** score = treasure chest count (Inventory where resourceType = TREASURE, sum of quantity)
- **NOT at Home Port:** score = 0, status set to `SHIPWRECKED`
- **STRANDED:** score = 0 (already eliminated)

Tiebreaker: fewer total days taken to return (last LogEntry with toLocation = Home Port determines return day). First team home with the same treasure wins.

### 6.3 Game End Flow

1. `POST /api/game/end` (or auto-triggered after day 25)
2. Server computes scores for all teams
3. Updates team statuses (SHIPWRECKED for teams not at port)
4. Sets session status to `ENDED`
5. Broadcasts `game-ended` to `game:{sessionId}` with scoreboard data:
   ```json
   {
     "scores": [
       { "rank": 1, "teamId": "x", "teamName": "Red Skulls", "color": "#e53e3e", "treasure": 8, "status": "FINISHED", "returnDay": 22 },
       { "rank": 2, "teamId": "y", "teamName": "Blue Tide", "color": "#3182ce", "treasure": 5, "status": "FINISHED", "returnDay": 24 },
       { "rank": 3, "teamId": "z", "teamName": "Green Wave", "color": "#38a169", "treasure": 0, "status": "SHIPWRECKED", "returnDay": null }
     ]
   }
   ```
6. All clients transition to scoreboard view

### 6.4 Facilitator Scoreboard (Desktop/Projector)

- Leaderboard table: rank, team name (with color dot), treasure count, status badge
- Shipwrecked teams at bottom with "Shipwrecked!" label
- Stranded teams with "Stranded!" label
- Route trace: each team's path rendered as a line on a mini-map (from LogEntry history)

### 6.5 Team Scoreboard (Mobile)

- Own result at top: "You made it home with X treasure!" or "Shipwrecked!" or "Stranded!"
- Own rank highlighted
- Full leaderboard visible below

### 6.6 Export

Facilitator can download results as CSV. Columns: rank, team_name, color, treasure_count, status, return_day, route_summary.

---

## 7. Socket.io Events Summary (New)

### Server → Client

| Event | Room | Payload | Trigger |
|---|---|---|---|
| `day-advanced` | `game:{sessionId}` | `{ day, weather, timerEnd }` | Facilitator advances day |
| `timer-paused` | `game:{sessionId}` | `{ remainingMs }` | Facilitator pauses |
| `timer-resumed` | `game:{sessionId}` | `{ timerEnd }` | Facilitator resumes |
| `timer-updated` | `game:{sessionId}` | `{ timerEnd }` | Facilitator extends |
| `day-ended` | `game:{sessionId}` | `{ day, summary }` | Timer expires or forced |
| `move-confirmed` | `team:{teamId}` | `{ position, inventory, log }` | Team move processed |
| `team-moved` | `session:{sessionId}` | `{ teamId, gridX, gridY }` | Facilitator map update |
| `team-lost` | `team:{teamId}` | `{ lostUntilDay, consumed }` | Storm without protection |
| `team-stranded` | `team:{teamId}` | `{ message }` | Resources depleted |
| `team-status-changed` | `session:{sessionId}` | `{ teamId, status }` | Any team status change |
| `purchase-confirmed` | `team:{teamId}` | `{ inventory, doubloons, cargo }` | Purchase processed |
| `game-ended` | `game:{sessionId}` | `{ scores }` | Game over |

### Client → Server

| Event | Sender | Payload | Handler |
|---|---|---|---|
| `submit-move` | Captain | `{ teamId, targetX, targetY }` | Movement engine |

---

## 8. API Routes Summary (New)

| Method | Path | Description |
|---|---|---|
| POST | `/api/game/purchase` | Buy resources |
| POST | `/api/game/advance-day` | Facilitator advances to next day |
| POST | `/api/game/end-day` | Facilitator forces day end |
| POST | `/api/game/timer/pause` | Pause timer |
| POST | `/api/game/timer/resume` | Resume timer |
| POST | `/api/game/timer/extend` | Extend timer +1 min |
| POST | `/api/game/end` | End game (or auto after day 25) |

---

## 9. File Structure (New/Modified)

```
src/
├── lib/
│   ├── game-actions.ts        # ADD: purchaseResources, advanceDay, endDay, submitMove, endGame
│   ├── consumption.ts         # NEW: calculateConsumption, checkProtection, resolveLost
│   ├── scoring.ts             # NEW: calculateScores, generateCSV
│   └── __tests__/
│       ├── consumption.test.ts
│       └── scoring.test.ts
├── app/
│   ├── api/game/
│   │   ├── purchase/route.ts
│   │   ├── advance-day/route.ts
│   │   ├── end-day/route.ts
│   │   ├── end/route.ts
│   │   └── timer/
│   │       ├── pause/route.ts
│   │       ├── resume/route.ts
│   │       └── extend/route.ts
│   ├── facilitator/page.tsx   # MODIFY: add day controls, weather display, timer, scoreboard
│   └── play/[teamId]/page.tsx # MODIFY: add buy panel, move handler, weather display, scoreboard
├── components/
│   ├── game/
│   │   ├── BuyPanel.tsx       # NEW: purchase form for team captains
│   │   ├── WeatherDisplay.tsx # NEW: weather announcement (facilitator + team variants)
│   │   ├── DayTimer.tsx       # NEW: countdown timer (synced from timerEnd)
│   │   ├── DayControls.tsx    # NEW: facilitator day advance/timer controls
│   │   ├── Scoreboard.tsx     # NEW: end-game leaderboard
│   │   └── StrandedOverlay.tsx # NEW: stranded/shipwrecked team screen
│   └── map/
│       └── RouteTrace.tsx     # NEW: SVG path showing team's route history
```
