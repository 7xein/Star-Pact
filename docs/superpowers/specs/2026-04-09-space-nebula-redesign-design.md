# Star Pact — Space & Nebula Redesign Spec

**Date:** 2026-04-09  
**Scope:** Full visual redesign of all pages — `globals.css`, participant mobile views (`/join`, `/play`), and facilitator dashboard (`/facilitator/dashboard`)  
**Approach:** Full Page Redesign (Approach B) — rewrite global styles and update page markup. No new architectural layers.

---

## 1. Design System

### 1.1 Nebula Palette

| Token | Value | Usage |
|---|---|---|
| `--void` | `#07021a` | Page background (replaces `#0a0a1a`) |
| `--deep-space` | `#100828` | Card background base |
| `--nebula-dark` | `#1e0d4e` | Elevated surface tint |
| `--nebula-core` | `#9b59b6` | Primary accent (replaces cyan `#00f5ff`) |
| `--stardust` | `#d4a0ff` | Primary accent light / text highlight |
| `--magenta` | `#e91eff` | High-energy moments (raid alerts, urgent timers) |
| `--card-bg` | `rgba(255,255,255,0.03)` | Frosted glass card background |
| `--card-border` | `rgba(155,89,182,0.18)` | Default card border |
| `--divider` | `rgba(155,89,182,0.12)` | Horizontal/vertical rules |

Background treatment: two radial nebula gradients fixed at opposite corners (bottom-left purple, top-right blue), layered over `--void`. Static — no animation required.

### 1.2 Phase Badge Colours

These are unchanged from the current system — each phase retains its distinct colour to avoid confusion during gameplay.

| Phase | Colour |
|---|---|
| TRADING | Blue `#3498db` |
| PROMISE_CHECK | Nebula purple `#9b59b6` |
| SCANDAL / RAID | Red `#e74c3c` |
| YEAR_END | Amber `#f39c12` |
| DEBRIEF | Green `#2ecc71` |

### 1.3 Typography

No change — retain current font stack:
- **Display:** Orbitron (all headings, labels, badges, buttons, tab names)
- **Body:** Inter (body copy, resource values context, debrief responses)

### 1.4 Core UI Components

- **Buttons:** `btn-purple` (replaces `btn-cyan`), `btn-red`, `btn-ghost` — same structure, colours updated to nebula palette
- **Cards:** `.sp-card` — same frosted glass pattern, border colour updated to `--card-border`
- **Inputs:** Border updated to `rgba(155,89,182,0.3)`, focus ring in nebula purple

---

## 2. Planet Colour Tokens

Each of the 10 planets gets a CSS custom property `--planet-color` set at the page root. This single variable cascades to all planet-specific UI: sphere gradients, card borders, text colour, glow effects, and resource bar fills.

The 10 planets and their assigned colours are **placeholders** — the actual planet names come from the database seed. The colours below must be mapped to the real `country.color` hex values in `prisma/seed.ts`. During implementation, replace placeholder names with the real ones and verify no two planets share a similar hue.

| Placeholder Name | Colour | Hex | Surface Detail |
|---|---|---|---|
| Ignis Prime | Red-orange | `#ff7043` | Volcanic craters + lava band |
| Aqualis | Deep ocean blue | `#4fc3f7` | Ocean swirl rings + cloud band |
| Verdania | Vivid green | `#69f0ae` | Dark forest landmass patches |
| Solara | Bright yellow | `#fff176` | Sunspots + outer corona glow halo |
| Rosara | Hot pink | `#f48fb1` | Crystal facet lines |
| Lumenor | Cobalt indigo | `#8c9eff` | Light pillar beam through sphere |
| Dustara | Warm amber | `#ffcc80` | Saturn-style tilted ring + dust bands |
| Glacius | Electric cyan | `#b2ebf2` | Ice polar cap + crack lines |
| Ferron | Steel grey | `#cfd8dc` | Metallic grid surface texture |
| Voidara | Vivid magenta | `#ea80fc` | Void rift dark slash with glowing edge |

**Colour separation rule:** No two planets may use colours within 30° of each other on the hue wheel. The pairs above were designed to avoid: red-orange vs amber, deep blue vs cyan, cobalt vs magenta.

---

## 3. Participant Mobile View (`/join` and `/play`)

**Identity mode: Immersive Atmosphere (Option B)**

The player's planet colour floods their entire screen experience. When on Ignis Prime, the screen *feels* like Ignis Prime.

### 3.1 Join Screen (`/join`)

- **Background:** Neutral nebula (`--void` + corner gradients) throughout — the join screen always shows all 10 planets and never holds a per-planet flooded state. Tapping a card immediately navigates to `/play`.
- **Planet cards:** Each card has its own individual colour treatment:
  - Background tinted with that planet's colour at low opacity
  - Border in `rgba(<planet-color>, 0.3)`
  - A planet sphere (38×38px, radial gradient with surface details — see §2)
  - Planet name in the planet's colour
  - Motto in the planet's colour at 50% opacity
- **On tap:** Stores `countryId` + `sessionId` in cookies, navigates to `/play`

### 3.2 Play Screen (`/play`)

**Header (all tabs):**
- Background: `linear-gradient(180deg, rgba(--planet-color, 0.25), transparent)` — planet colour bleeds down from the top
- Bottom border: `1px solid rgba(--planet-color, 0.25)`
- Planet sphere (32×32px) with surface detail in the top-left
- Planet name in Orbitron, colour `--planet-color`, with glow
- Governor name + world descriptor in small text below
- Year badge (nebula purple) + Phase badge (phase colour) side by side

**Tab bar:**
- 4 tabs with Lucide React SVG icons (see §3.3)
- Active tab: top border `2px solid --planet-color`, label in `--planet-color`
- Inactive tabs: label in `rgba(255,255,255,0.3)`

**Tab names (renamed from current):**

| Old Name | New Name | Icon (Lucide) |
|---|---|---|
| Passport | Codex | `<Layers>` |
| Resources | Resources | `<Activity>` |
| Promises | Pacts | `<Clock>` |
| Relations | Orbit | `<Globe>` |

**Resources tab:**
- 2×2 grid of resource cards
- Energy card: background `rgba(--planet-color, 0.07)`, border `rgba(--planet-color, 0.2)` — planet-tinted
- Population, Oxygen, Rockets cards: neutral dark glass
- Resource values in Orbitron bold
- Rockets count is visible on the participant's own screen

**Pacts tab (formerly Promises):**
- Progress bar fills use `--planet-color` when on track, red when at risk
- At-risk warning card: red border + warning label

**Codex tab (formerly Passport):** No structural change — planet lore text displayed as-is.

**Orbit tab (formerly Relations):** No structural change — diplomatic status categories displayed as-is.

---

## 4. Facilitator Dashboard (`/facilitator/dashboard`)

**Identity mode: Planet Portrait (Option C)**

The dashboard stays neutral dark nebula. Each planet is a *character* anchored by its sphere — the rest of the UI does not flood with colour.

### 4.1 Header Bar

- **Logo:** "STAR PACT" in Orbitron 900, colour `--stardust` (`#d4a0ff`), text-shadow nebula purple glow (replaces cyan glow)
- **Subtitle:** "FEDERATION COMMAND · FACILITATOR CONSOLE" in Orbitron, colour `#3d2860`
- **Year:** Orbitron 900, colour `--stardust`
- **Phase badge:** Phase-specific colour (unchanged)

### 4.2 Timer + Controls Strip

No layout change. Colour updates:
- Timer value: `--stardust`
- Start button: `btn-purple`
- Input border: nebula purple

### 4.3 Planet Scoreboard

**Section header:** SVG orbit diagram icon (two ellipses + centre circle, Lucide-style stroke) replaces the 🪐 emoji. Label: "Planetary Resource Status".

**Planet card layout (per planet):**
- Background: `rgba(255,255,255,0.02)` with left-side atmosphere bleed: `linear-gradient(90deg, rgba(--planet-color, 0.09), transparent)` over 70px
- Border: `1px solid rgba(--planet-color, 0.2)` on hover/default; slightly brighter on hover
- **Planet sphere** (38×38px): radial gradient sphere with unique surface detail (see §2 table). Dustara gets a Saturn-style tilted ring wrapper.
- **Planet name:** Orbitron 700, `--planet-color`, letter-spacing 1.5px
- **Resources — 3 in a row (NRG · OXY · POP only):**
  - Layout: flex row, three equal cells divided by `1px solid rgba(255,255,255,0.06)`
  - Each cell: value in Orbitron bold coloured with `--planet-color`, label in tiny caps below (`rgba(255,255,255,0.22)`)
  - Order: **NRG → OXY → POP**
  - **Rockets count is NOT shown on the facilitator dashboard** — visible only on the participant's own mobile view
- **Pact dots** (top-right): 3 dots, 7×7px each — green (met), amber (at risk), red (failed), dim white (pending)

**Pact dot legend** (below the grid):
- 9×9px dots with matching glow
- Labels in Orbitron, `rgba(200,180,255,0.55)` — visible at normal reading distance

### 4.4 Right Column

**QR Code panel:** No layout change. QR code colours updated — dark modules in `--stardust`, background `--void`.

**Trade Activity Log:**
- Section header: SVG arrow icon + "Trade Activity Log" label
- Each entry: `font-size: 0.68rem` Orbitron for planet names, `0.72rem` Inter for resource detail
- Status colours: accepted → blue `#4fc3f7`, pending → nebula purple `#c9a9ff`, rejected → red `#ff7875`
- Full resource names shown (e.g. "2 ⚡ Energy ↔ 3 💨 Oxygen")

---

## 5. Resource & Stat Renaming

| Old Label | New Label | Icon |
|---|---|---|
| Smugglers | Rockets | 🚀 |
| KushBalls (internal field) | *(field name unchanged in DB)* | — |

The `kushBalls` database field name is **not renamed** — only the display label and icon change in the UI layer (`RES_LABELS` and `RES_ICONS` maps in the dashboard, and equivalent in the play page).

---

## 6. Files to Change

| File | What changes |
|---|---|
| `src/app/globals.css` | Full palette rewrite: `--cyan` → `--nebula-core`, nebula background, updated component classes |
| `src/app/join/page.tsx` | Planet cards redesigned with spheres + individual planet colour treatment |
| `src/app/play/page.tsx` | Header with sphere + atmosphere gradient; tab bar with Lucide icons + new tab names; resource cards tinted; pact bars use planet colour |
| `src/app/facilitator/dashboard/page.tsx` | Logo glow updated; planet scoreboard cards with spheres + atmosphere bleed + 3-resource row; rockets hidden; trade log visibility improved; pact dot legend updated |
| `package.json` | Add `lucide-react` dependency |

---

## 7. Out of Scope

- No database schema changes
- No API route changes
- No animation rework (existing animations retained, colours updated)
- No new pages or routes
- No component extraction into a shared library
- Planet names/mottos/lore: not changed (content stays as seeded)
