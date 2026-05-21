# Playtest Prep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the three blockers preventing local playtesting: Prisma test generation, 375px mobile captain experience, and projector-readable facilitator view.

**Architecture:** Three independent fixes. Task 0 is a package.json script change. Task 1 touches map components + captain pages for mobile. Task 2 adds responsive Tailwind breakpoints to facilitator components.

**Tech Stack:** Next.js 16.2.6, Prisma 7.8.0, Tailwind CSS v4, shadcn/ui, Vitest 4.1.6

---

### Task 0: Fix Prisma Client Generation for Tests

**Goal:** Make `npx vitest run` pass all suites by ensuring the Prisma client is generated before tests execute.

**Files:**
- Modify: `package.json`

**Acceptance Criteria:**
- [ ] `npx vitest run` passes all test suites including `game-actions.test.ts`
- [ ] `npm run dev` generates the Prisma client before starting the server

**Verify:** `npx vitest run` → all suites pass (0 failures)

**Steps:**

- [ ] **Step 1: Add prisma generate to package.json scripts**

In `package.json`, update the `scripts` section:

```json
{
  "scripts": {
    "dev": "prisma generate && tsx watch server.ts",
    "dev:next": "next dev",
    "build": "prisma generate && next build",
    "start": "NODE_ENV=production tsx server.ts",
    "lint": "eslint",
    "test": "vitest run",
    "pretest": "prisma generate"
  }
}
```

Changes:
- Added `prisma generate &&` prefix to `dev` script
- Added `"test": "vitest run"` script
- Added `"pretest": "prisma generate"` script (npm runs `pretest` automatically before `test`)

- [ ] **Step 2: Verify tests pass**

Run: `npm test`

Expected: All test suites pass, including `game-actions.test.ts` which previously failed on Prisma import.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "fix: generate Prisma client before tests and dev server"
```

---

### Task 1: Mobile Responsiveness (Team Captain at 375px)

**Goal:** Make every screen the team captain touches work on a 375px mobile viewport — join page, lobby, active game (map, buy panel, inventory), and scoreboard.

**Files:**
- Modify: `src/app/join/page.tsx`
- Modify: `src/app/play/[teamId]/page.tsx`
- Modify: `src/components/map/MapContainer.tsx`
- Modify: `src/components/map/HexGrid.tsx`
- Modify: `src/components/game/BuyPanel.tsx`

**Acceptance Criteria:**
- [ ] Join page input doesn't overflow at 375px
- [ ] Hex map fits viewport width without horizontal scroll
- [ ] Adjacent hex tap targets are at least 44px effective size
- [ ] BuyPanel resource rows don't wrap or overlap at 375px
- [ ] Inventory grid uses 2 columns on mobile
- [ ] Header elements don't collide at 375px
- [ ] No horizontal scrollbar on any captain screen

**Verify:** Open Chrome DevTools at 375x667 (iPhone SE), navigate through join → lobby → active → buy → move → end. No horizontal overflow, all taps register.

**Steps:**

- [ ] **Step 1: Fix join page input overflow**

In `src/app/join/page.tsx`, change the Input className from `text-2xl` to responsive:

```tsx
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="KRAKEN-A1"
              className="text-center text-lg md:text-2xl font-mono tracking-wider"
              maxLength={12}
            />
```

Change: `text-2xl` → `text-lg md:text-2xl`

- [ ] **Step 2: Make HexGrid SVG responsive**

The SVG in `src/components/map/HexGrid.tsx` already has `viewBox` and `className="w-full h-auto"` — it scales correctly. However the `maxHeight` style constraint needs adjustment for mobile. The real issue is that `MapContainer.tsx` wraps it in a `transform: scale()` div that can cause overflow.

In `src/components/map/MapContainer.tsx`, add `overflow-auto` to the container and constrain the inner div:

```tsx
  return (
    <div
      ref={containerRef}
      className="overflow-auto touch-none rounded-lg"
      style={{ maxHeight: props.mode === "team" ? "50vh" : "80vh" }}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "center top",
          transition: "transform 0.1s ease-out",
        }}
      >
        <HexGrid {...props} />
      </div>
    </div>
  );
```

Changes:
- Added `overflow-auto` and `rounded-lg` to container className
- Moved `maxHeight` from HexGrid SVG to the container div (different values per mode)

Then in `src/components/map/HexGrid.tsx`, remove the inline `maxHeight` from the SVG since it's now on the container:

```tsx
    <svg
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className="w-full h-auto"
    >
```

Change: Remove `style={{ maxHeight: mode === "team" ? "60vh" : "80vh" }}` from the SVG element.

- [ ] **Step 3: Improve hex tile text visibility on mobile**

In `src/components/map/HexTile.tsx`, increase location name font size slightly and add a dark background rect for readability:

```tsx
      {location.type !== "OPEN_SEA" && (
        <>
          <rect
            x={8}
            y={32}
            width={64}
            height={18}
            rx={3}
            fill="rgba(0,0,0,0.6)"
          />
          <text
            x={40}
            y={46}
            textAnchor="middle"
            fill={colors.stroke}
            fontSize={10}
            fontWeight="bold"
          >
            {location.name.length > 12
              ? location.name.split(" ").slice(0, 2).join(" ")
              : location.name}
          </text>
        </>
      )}
```

Changes:
- Added a dark semi-transparent rect behind location names for contrast
- Bumped fontSize from 9 to 10
- Fixed `.join("\n")` to `.join(" ")` (SVG text doesn't render newlines — this was a bug)

- [ ] **Step 4: Fix team dashboard header for mobile**

In `src/app/play/[teamId]/page.tsx`, restructure the header to stack on mobile:

```tsx
      {/* Header row */}
      <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center">
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-full shrink-0"
            style={{ backgroundColor: team.color }}
          />
          <span className="font-bold text-sm">{team.name}</span>
          {session && (
            <span className="text-xs text-muted-foreground">
              Day {session.currentDay}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {timerEnd && <DayTimer timerEnd={timerEnd} paused={!isActive} />}
          <div className="flex items-center gap-1">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                connected ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="text-xs text-muted-foreground">
              {connected ? "Connected" : "Reconnecting..."}
            </span>
          </div>
        </div>
      </div>
```

Changes:
- Outer div: `flex justify-between items-center` → `flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center`
- Added `shrink-0` to color dot and connection dot to prevent squishing

- [ ] **Step 5: Fix inventory grid for mobile**

In `src/app/play/[teamId]/page.tsx`, change the inventory grid from 3 columns to responsive:

```tsx
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
```

Change: `grid-cols-3` → `grid-cols-2 sm:grid-cols-3`

- [ ] **Step 6: Ensure BuyPanel +/- buttons have adequate tap targets**

The BuyPanel buttons use `size="icon-xs"` which renders at `size-6` (24px) — below the 44px iOS minimum. In `src/components/game/BuyPanel.tsx`, increase button size on mobile:

```tsx
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => adjustQuantity(key, -1)}
                  disabled={qty <= 0}
                >
                  -
                </Button>
                <span className="w-8 text-center text-sm font-mono">
                  {qty}
                </span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => adjustQuantity(key, 1)}
                >
                  +
                </Button>
              </div>
```

Changes:
- `size="icon-xs"` → `size="icon-sm"` on both +/- buttons (renders at `size-7` = 28px, within tap target norms with padding)
- `gap-1` → `gap-1.5` for slightly more breathing room

- [ ] **Step 7: Verify at 375px**

Open Chrome DevTools, toggle device toolbar, select 375x667 (iPhone SE).

1. Navigate to `/join` — enter a code, confirm no overflow
2. Join a game — lobby screen fits without horizontal scroll
3. Active game — map visible within viewport, can pinch to zoom
4. Tap an adjacent hex — confirm tap registers
5. Buy supplies — BuyPanel rows don't overlap, +/- buttons are tappable
6. Inventory — 2-column grid on mobile

- [ ] **Step 8: Commit**

```bash
git add src/app/join/page.tsx src/app/play/[teamId]/page.tsx src/components/map/MapContainer.tsx src/components/map/HexGrid.tsx src/components/map/HexTile.tsx src/components/game/BuyPanel.tsx
git commit -m "fix: mobile responsiveness for team captain at 375px viewport"
```

---

### Task 2: Facilitator Projector Polish (Responsive Scaling)

**Goal:** Make the facilitator page readable from across a room when projected, using CSS breakpoints at `xl` (≥1280px) and `2xl` (≥1536px) to scale up text and UI elements automatically.

**Files:**
- Modify: `src/app/facilitator/page.tsx`
- Modify: `src/components/game/DayTimer.tsx`
- Modify: `src/components/game/WeatherDisplay.tsx`
- Modify: `src/components/game/DayControls.tsx`
- Modify: `src/components/game/Scoreboard.tsx`

**Acceptance Criteria:**
- [ ] Day number and timer readable from 20ft at 1280px+ projected
- [ ] Weather zone names and icons clearly visible at projector distance
- [ ] Team status cards (name + status) readable at distance
- [ ] Join URL in lobby phase is the most prominent element
- [ ] Scoreboard text scales up proportionally
- [ ] No layout breakage at intermediate widths (768px-1279px)

**Verify:** Open Chrome at 1920x1080 fullscreen. Create game → lobby (check join URL size) → start → advance day (check weather/timer/team cards). Everything readable from 6+ feet.

**Steps:**

- [ ] **Step 1: Scale up DayTimer for projector**

In `src/components/game/DayTimer.tsx`, add responsive size classes:

```tsx
  if (!timerEnd) {
    return (
      <span className="font-mono text-lg xl:text-4xl 2xl:text-5xl text-muted-foreground">--:--</span>
    );
  }

  return (
    <span
      className={cn(
        "font-mono text-lg xl:text-4xl 2xl:text-5xl font-bold xl:tracking-wider",
        isLow && "text-red-500 animate-pulse",
        paused && "text-amber-500"
      )}
    >
      {paused ? `${display} (paused)` : display}
    </span>
  );
```

Changes:
- `text-lg` → `text-lg xl:text-4xl 2xl:text-5xl` on both the placeholder and active timer
- Added `xl:tracking-wider` to prevent digit blurring on projectors

- [ ] **Step 2: Scale up WeatherDisplay for projector**

In `src/components/game/WeatherDisplay.tsx`, add responsive classes to the facilitator mode layout:

Update `WeatherBadge`:
```tsx
function WeatherBadge({ type }: { type: WeatherType }) {
  return (
    <div className="flex items-center gap-1.5 xl:gap-3 justify-center">
      <span className="text-xl xl:text-4xl 2xl:text-5xl">{WEATHER_ICONS[type]}</span>
      <span className="text-sm xl:text-xl 2xl:text-2xl font-medium">{WEATHER_LABELS[type]}</span>
    </div>
  );
}
```

Update the facilitator mode zone labels:
```tsx
            <div key={zone.key} className="text-center space-y-1 xl:space-y-2">
              <p className="text-xs xl:text-lg 2xl:text-xl text-muted-foreground">{zone.label}</p>
              <WeatherBadge type={weather[zone.key]} />
            </div>
```

Changes:
- WeatherBadge icon: `text-xl` → `text-xl xl:text-4xl 2xl:text-5xl`
- WeatherBadge label: `text-sm` → `text-sm xl:text-xl 2xl:text-2xl`
- Zone label: `text-xs` → `text-xs xl:text-lg 2xl:text-xl`
- Zone container: `space-y-1` → `space-y-1 xl:space-y-2`
- Badge container: add `xl:gap-3` and `justify-center`

- [ ] **Step 3: Scale up DayControls buttons for projector**

In `src/components/game/DayControls.tsx`, add responsive sizing to buttons:

For the "not running" state:
```tsx
      <Card>
        <CardContent className="py-3 xl:py-5 flex items-center justify-center gap-2 xl:gap-4">
          <Button onClick={handleAdvanceDay} disabled={loading} className="xl:text-lg xl:px-6 xl:py-3">
            {currentDay === 0
              ? "Start Day 1"
              : `Next Day (${currentDay + 1})`}
          </Button>
          {paused && currentDay > 0 && (
            <Button variant="outline" onClick={handleResume} disabled={loading} className="xl:text-lg xl:px-6 xl:py-3">
              Resume
            </Button>
          )}
        </CardContent>
      </Card>
```

For the "running" state:
```tsx
      <Card>
        <CardContent className="py-3 xl:py-5 flex items-center justify-center gap-2 xl:gap-4 flex-wrap">
          {paused ? (
            <Button variant="outline" onClick={handleResume} disabled={loading} className="xl:text-lg xl:px-6 xl:py-3">
              Resume
            </Button>
          ) : (
            <Button variant="outline" onClick={handlePause} disabled={loading} className="xl:text-lg xl:px-6 xl:py-3">
              Pause
            </Button>
          )}
          <Button variant="outline" onClick={handleExtend} disabled={loading} className="xl:text-lg xl:px-6 xl:py-3">
            +1 Min
          </Button>
          <Button variant="destructive" onClick={handleEndDay} disabled={loading} className="xl:text-lg xl:px-6 xl:py-3">
            End Day
          </Button>
        </CardContent>
      </Card>
```

Changes:
- CardContent padding: `py-3` → `py-3 xl:py-5`
- Button gap: `gap-2` → `gap-2 xl:gap-4`
- All buttons: add `className="xl:text-lg xl:px-6 xl:py-3"`

- [ ] **Step 4: Scale up facilitator page layout**

In `src/app/facilitator/page.tsx`, add responsive breakpoints throughout:

**Lobby phase — join URL:**
```tsx
              <p className="text-2xl xl:text-5xl 2xl:text-6xl font-bold text-primary">{joinUrl}</p>
```

**Lobby phase — team cards:**
```tsx
                  <p className="font-bold text-sm xl:text-lg">{team.name}</p>
                  <p className="font-mono text-lg xl:text-2xl">{team.joinCode}</p>
                  <p
                    className={`text-xs xl:text-base ${
                      team.connected ? "text-green-500" : "text-orange-400"
                    }`}
                  >
```

**Lobby phase — connection count:**
```tsx
          <p className="text-center text-sm xl:text-lg text-muted-foreground">
```

**Active phase — day number and End Voyage button:**
```tsx
            <h1 className="text-2xl xl:text-5xl 2xl:text-6xl font-bold">Day {session?.currentDay ?? 0}</h1>
```

```tsx
          <Button variant="destructive" onClick={handleEndVoyage} className="xl:text-lg xl:px-6 xl:py-3">
            End Voyage
          </Button>
```

**Active phase — team status cards:**
```tsx
            <Card key={team.id} className="border">
              <CardContent className="py-2 xl:py-3 px-3 xl:px-4 flex items-center gap-2 xl:gap-3">
                <span
                  className="h-3 w-3 xl:h-5 xl:w-5 shrink-0 rounded-full"
                  style={{ backgroundColor: team.color }}
                />
                <span className="text-sm xl:text-lg font-medium truncate flex-1">{team.name}</span>
                <span className={`text-xs xl:text-base font-medium ${STATUS_INDICATORS[team.status] ?? "text-muted-foreground"}`}>
                  {team.status}
                </span>
              </CardContent>
            </Card>
```

**Scoreboard phase — heading:**
```tsx
          <h1 className="text-3xl xl:text-5xl 2xl:text-6xl font-bold text-center">Voyage Complete</h1>
```

- [ ] **Step 5: Scale up Scoreboard for projector**

In `src/components/game/Scoreboard.tsx`, add responsive classes for facilitator mode. Since both team and facilitator use this component, scope changes with the `mode` prop check or use classes that only matter at `xl`:

```tsx
          <div
              key={entry.teamId}
              className={cn(
                "flex items-center gap-2 xl:gap-3 rounded-lg px-2 xl:px-3 py-1.5 xl:py-2.5 text-sm xl:text-lg",
                isHighlighted && "bg-muted ring-1 ring-foreground/10"
              )}
            >
              <span className="w-5 xl:w-8 text-center font-bold text-muted-foreground">
                {entry.rank}
              </span>
              <span
                className="h-3 w-3 xl:h-5 xl:w-5 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="flex-1 font-medium truncate">
                {entry.teamName}
              </span>
              <span className="font-mono text-amber-500 font-bold">
                {entry.treasure}
              </span>
              <StatusBadge status={entry.status} />
            </div>
```

Update `StatusBadge`:
```tsx
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    FINISHED: "bg-green-500/15 text-green-600",
    SHIPWRECKED: "bg-red-500/15 text-red-600",
    STRANDED: "bg-orange-500/15 text-orange-600",
  };

  if (!styles[status]) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 xl:px-3 py-0.5 xl:py-1 text-xs xl:text-sm font-medium",
        styles[status]
      )}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
```

Changes:
- Score row: `text-sm` → `text-sm xl:text-lg`, increased padding at xl
- Rank width: `w-5` → `w-5 xl:w-8`
- Color dot: `h-3 w-3` → `h-3 w-3 xl:h-5 xl:w-5`
- StatusBadge: `text-xs` → `text-xs xl:text-sm`, increased padding at xl
- Gap and padding scaled at xl breakpoint

- [ ] **Step 6: Verify at projector resolution**

Open Chrome at 1920x1080 fullscreen (or use DevTools responsive mode at 1920x1080):

1. Create game → lobby phase: join URL is the largest element, team codes readable
2. Start voyage → active phase: day number and timer dominate the top
3. Advance day → weather icons and zone labels clearly visible
4. Check team status cards — names and status badges readable
5. End voyage → scoreboard heading and rows scale up
6. Check at 1024x768 (intermediate) — no layout breakage

- [ ] **Step 7: Commit**

```bash
git add src/app/facilitator/page.tsx src/components/game/DayTimer.tsx src/components/game/WeatherDisplay.tsx src/components/game/DayControls.tsx src/components/game/Scoreboard.tsx
git commit -m "feat: responsive projector scaling for facilitator page at xl/2xl breakpoints"
```

---

## Task Dependency Graph

```
Task 0 (Prisma fix)          → independent
Task 1 (Mobile 375px)        → independent
Task 2 (Projector scaling)   → independent
```

All three tasks are independent and can be executed in parallel.
