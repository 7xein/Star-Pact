# Space & Nebula Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign all Star Pact pages with a deep-space nebula palette, per-planet sphere identity, Lucide SVG tab icons, and renamed tabs/resource labels.

**Architecture:** CSS custom property remapping means `--cyan` is revalued to nebula purple — all existing class references (`.glow-cyan`, `.btn-cyan`, `var(--cyan)`) automatically inherit the new colour with zero JSX find-replace. Planet spheres are defined as local function components in each page file. No shared library is created.

**Tech Stack:** Next.js 16.2.1, React 19, Tailwind CSS 4, Prisma 7 (SQLite), lucide-react (new), TypeScript 5.

> ⚠️ **Before writing any code** read `node_modules/next/dist/docs/` — this Next.js version has breaking changes from training data. Heed deprecation notices.

---

### Task 0: Install lucide-react

**Goal:** Add the `lucide-react` package so SVG icons are available for the tab bar in Task 4.

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json` (auto-updated by npm)

**Acceptance Criteria:**
- [ ] `lucide-react` appears in `package.json` dependencies
- [ ] `npm run build` exits 0

**Verify:** `npm run build` → exits 0 with no errors

**Steps:**

- [ ] **Step 1: Install the package**

```bash
cd C:/Users/hussi/promises-promises
npm install lucide-react
```

Expected output: `added N packages` (no errors)

- [ ] **Step 2: Verify package.json was updated**

Open `package.json` and confirm `lucide-react` appears in `"dependencies"`.

- [ ] **Step 3: Verify build still passes**

```bash
npm run build
```

Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add lucide-react for SVG tab icons"
```

---

### Task 1: Rewrite globals.css — Nebula Palette

**Goal:** Replace the cyan sci-fi palette with a deep-space nebula palette by updating CSS custom properties, the background treatment, and all component colour rules.

**Files:**
- Modify: `src/app/globals.css`

**Acceptance Criteria:**
- [ ] `--cyan` resolves to `#9b59b6` (nebula purple), not `#00f5ff`
- [ ] `--bg-base` resolves to `#07021a`
- [ ] `--stardust` is defined as `#d4a0ff`
- [ ] `body::before` renders two corner nebula gradients, not a star field
- [ ] `.phase-trading` badge is blue, not cyan
- [ ] `npm run build` exits 0

**Verify:** `npm run build` → exits 0

**Steps:**

- [ ] **Step 1: Update CSS custom properties in `:root`**

Replace the entire `:root` block:

```css
:root {
  --bg-base:    #07021a;
  --void:       #07021a;
  --cyan:       #9b59b6;
  --cyan-dim:   rgba(155, 89, 182, 0.2);
  --cyan-glow:  0 0 10px #9b59b6, 0 0 20px rgba(155, 89, 182, 0.4);
  --stardust:   #d4a0ff;
  --nebula-dark: #1e0d4e;
  --red-raid:   #ff3b3b;
  --red-glow:   0 0 10px #ff3b3b, 0 0 20px rgba(255, 59, 59, 0.4);
  --card-bg:    rgba(255, 255, 255, 0.03);
  --card-border: rgba(155, 89, 182, 0.18);
  --divider:    rgba(155, 89, 182, 0.12);
  --font-display: 'Orbitron', sans-serif;
  --font-body:    'Inter', sans-serif;
}
```

- [ ] **Step 2: Replace body::before (star field → nebula gradients)**

Replace the entire `body::before` rule:

```css
body::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse at 5% 95%,  rgba(183, 0, 255, 0.08) 0%, transparent 45%),
    radial-gradient(ellipse at 95% 5%,  rgba(0, 60, 255, 0.07)  0%, transparent 45%),
    radial-gradient(ellipse at 50% 50%, rgba(80, 0, 160, 0.04)  0%, transparent 60%);
}
```

- [ ] **Step 3: Update `.phase-trading` badge to blue**

Find the `.phase-trading` rule and replace it:

```css
.phase-trading {
  background: rgba(52, 152, 219, 0.15);
  color: #74b9ff;
  border: 1px solid rgba(52, 152, 219, 0.3);
}
```

- [ ] **Step 4: Update `.sp-modal` shadow to nebula**

Find `.sp-modal` and update the `box-shadow`:

```css
.sp-modal {
  background: #0d0d24;
  border: 1px solid var(--card-border);
  border-radius: 16px;
  padding: 1.5rem;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 0 40px rgba(155, 89, 182, 0.12);
}
```

- [ ] **Step 5: Verify build passes**

```bash
npm run build
```

Expected: exits 0. If TypeScript errors appear, they relate to a later task — fix only CSS-related issues here.

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: rewrite globals.css with nebula palette — cyan remapped to purple"
```

---

### Task 2: Update planet colours in seed.ts and reseed database

**Goal:** Replace overly dark, low-contrast, or similar planet hex colours with vivid, clearly distinct values, then reseed the database so all subsequent UI work uses the correct colours.

**Files:**
- Modify: `prisma/seed.ts`

**Acceptance Criteria:**
- [ ] No two planet colours are within 30° of each other on the hue wheel
- [ ] All colours are bright enough to glow against `#07021a`
- [ ] `prisma/seed.ts` compiles without error
- [ ] Database is reseeded (10 countries exist with new colours)

**Verify:** `npm run build` exits 0; run `npx prisma db seed` without error.

**Steps:**

- [ ] **Step 1: Update the `color` field for each planet in `COUNTRIES`**

In `prisma/seed.ts`, update the `color` values in the `COUNTRIES` array as follows (all other fields stay exactly the same):

```ts
// Antica — vivid red
{ name: 'Antica', color: '#ef4444', ... }

// Portswana — vivid yellow
{ name: 'Portswana', color: '#ffd740', ... }

// Samosia — vivid spring green (was #2d6a4f — too dark)
{ name: 'Samosia', color: '#69f0ae', ... }

// Bintu — soft pink
{ name: 'Bintu', color: '#f48fb1', ... }

// Mertante — soft mint (distinct from Samosia vivid green)
{ name: 'Mertante', color: '#c8e6c9', ... }

// Rostotto — vivid magenta (distinct from nebula UI purple #9b59b6)
{ name: 'Rostotto', color: '#e040fb', ... }

// Jasna — orange (was #f97316 — same, just confirming)
{ name: 'Jasna', color: '#ff7043', ... }

// Geldar — sky blue (was #2563eb — too dark)
{ name: 'Geldar', color: '#4fc3f7', ... }

// Halportia — steel grey (was #94a3b8 — slightly brighter)
{ name: 'Halportia', color: '#b0bec5', ... }

// Barria — teal (distinct from Geldar sky blue)
{ name: 'Barria', color: '#80deea', ... }
```

Apply only the `color` field changes. The full updated `COUNTRIES` array with only color fields changed:

```ts
const COUNTRIES = [
  {
    name: 'Antica',
    color: '#ef4444',
    motto: 'Tomorrow Be True',
    story: 'A proud nation with a long memory and a short fuse.',
    famousFor: 'Its fiery debates and ancient wine festivals',
    food: 8, wealth: 10, environment: 2, kushBalls: 6,
    relations: {
      rightOn: ['Halportia', 'Barria'],
      allRight: ['Rostotto', 'Jasna', 'Samosia'],
      writeOff: ['Portswana', 'Bintu', 'Geldar', 'Mertante']
    },
    promises: [
      { resource: 'food', target: 3, byYear: 5 },
      { resource: 'wealth', target: 8, byYear: 5 },
      { resource: 'environment', target: 5, byYear: 4 }
    ]
  },
  {
    name: 'Portswana',
    color: '#ffd740',
    motto: 'Guts, Glory, and Good Looks',
    story: 'A nation of traders and storytellers, always looking for the next deal.',
    famousFor: 'Its golden markets and colorful festivals',
    food: 10, wealth: 3, environment: 6, kushBalls: 4,
    relations: {
      rightOn: ['Rostotto', 'Jasna'],
      allRight: ['Samosia', 'Geldar', 'Antica'],
      writeOff: ['Halportia', 'Bintu', 'Barria', 'Mertante']
    },
    promises: [
      { resource: 'food', target: 8, byYear: 5 },
      { resource: 'wealth', target: 1, byYear: 5 },
      { resource: 'environment', target: 1, byYear: 5 }
    ]
  },
  {
    name: 'Samosia',
    color: '#69f0ae',
    motto: 'We Never Forget',
    story: 'A nation with a long memory, deep forests, and an even deeper grudge list.',
    famousFor: 'Its ancient forests and legendary memory keepers',
    food: 8, wealth: 10, environment: 2, kushBalls: 6,
    relations: {
      rightOn: ['Halportia', 'Barria'],
      allRight: ['Rostotto', 'Jasna', 'Antica'],
      writeOff: ['Portswana', 'Bintu', 'Geldar', 'Mertante']
    },
    promises: [
      { resource: 'food', target: 3, byYear: 5 },
      { resource: 'wealth', target: 8, byYear: 5 },
      { resource: 'environment', target: 5, byYear: 4 }
    ]
  },
  {
    name: 'Bintu',
    color: '#f48fb1',
    motto: 'Whatever Your Heart Desires',
    story: 'A generous nation that believes in abundance — but is running low on food.',
    famousFor: 'Its lush gardens and famously warm hospitality',
    food: 1, wealth: 1, environment: 18, kushBalls: 8,
    relations: {
      rightOn: [],
      allRight: ['Halportia', 'Barria', 'Mertante'],
      writeOff: ['Portswana', 'Geldar', 'Rostotto', 'Jasna', 'Antica', 'Samosia']
    },
    promises: [
      { resource: 'food', target: 8, byYear: 2 },
      { resource: 'wealth', target: 4, byYear: 3 },
      { resource: 'environment', target: 6, byYear: 4 }
    ]
  },
  {
    name: 'Mertante',
    color: '#c8e6c9',
    motto: 'The Good, the Great, and the Green',
    story: "An eco-nation trying to survive in a world that doesn't share its values.",
    famousFor: 'Its renewable energy program and eco-architecture',
    food: 1, wealth: 1, environment: 18, kushBalls: 8,
    relations: {
      rightOn: [],
      allRight: ['Halportia', 'Barria', 'Bintu'],
      writeOff: ['Portswana', 'Geldar', 'Rostotto', 'Jasna', 'Antica', 'Samosia']
    },
    promises: [
      { resource: 'food', target: 8, byYear: 2 },
      { resource: 'wealth', target: 4, byYear: 3 },
      { resource: 'environment', target: 6, byYear: 4 }
    ]
  },
  {
    name: 'Rostotto',
    color: '#e040fb',
    motto: 'Bold and True',
    story: 'A warrior nation that respects strength above all else.',
    famousFor: 'Its legendary warriors and fearless negotiators',
    food: 6, wealth: 1, environment: 4, kushBalls: 5,
    relations: {
      rightOn: ['Portswana', 'Geldar'],
      allRight: ['Jasna', 'Antica', 'Samosia'],
      writeOff: ['Bintu', 'Halportia', 'Barria', 'Mertante']
    },
    promises: [
      { resource: 'food', target: 3, byYear: 5 },
      { resource: 'wealth', target: 2, byYear: 5 },
      { resource: 'environment', target: 7, byYear: 4 }
    ]
  },
  {
    name: 'Jasna',
    color: '#ff7043',
    motto: 'We Need Only Us',
    story: 'A fiercely independent nation that prefers to rely on its own resources.',
    famousFor: 'Its self-sufficiency movement and vibrant street art',
    food: 6, wealth: 1, environment: 4, kushBalls: 5,
    relations: {
      rightOn: ['Portswana', 'Geldar'],
      allRight: ['Rostotto', 'Antica', 'Samosia'],
      writeOff: ['Bintu', 'Halportia', 'Barria', 'Mertante']
    },
    promises: [
      { resource: 'food', target: 3, byYear: 5 },
      { resource: 'wealth', target: 2, byYear: 5 },
      { resource: 'environment', target: 7, byYear: 4 }
    ]
  },
  {
    name: 'Geldar',
    color: '#4fc3f7',
    motto: 'The Rewarded',
    story: 'A prosperous nation that believes prosperity is a sign of virtue.',
    famousFor: 'Its banking system and elaborate reward ceremonies',
    food: 10, wealth: 3, environment: 6, kushBalls: 4,
    relations: {
      rightOn: ['Jasna', 'Rostotto'],
      allRight: ['Portswana', 'Antica', 'Samosia'],
      writeOff: ['Bintu', 'Halportia', 'Barria', 'Mertante']
    },
    promises: [
      { resource: 'food', target: 8, byYear: 5 },
      { resource: 'wealth', target: 1, byYear: 5 },
      { resource: 'environment', target: 1, byYear: 5 }
    ]
  },
  {
    name: 'Halportia',
    color: '#b0bec5',
    motto: 'Sing a Song',
    story: 'A peaceful nation known for music, nature, and quiet diplomacy.',
    famousFor: 'Its song festivals and pristine mountain ranges',
    food: 1, wealth: 5, environment: 2, kushBalls: 3,
    relations: {
      rightOn: ['Antica', 'Mertante', 'Samosia', 'Bintu'],
      allRight: ['Barria'],
      writeOff: ['Portswana', 'Rostotto', 'Jasna', 'Geldar']
    },
    promises: [
      { resource: 'food', target: 2, byYear: 5 },
      { resource: 'wealth', target: 1, byYear: 5 },
      { resource: 'environment', target: 12, byYear: 3 }
    ]
  },
  {
    name: 'Barria',
    color: '#80deea',
    motto: 'To Defend and Defeat',
    story: 'A nation built on the principle that the best offense is a good defense.',
    famousFor: 'Its fortress cities and unbroken defensive record',
    food: 1, wealth: 5, environment: 2, kushBalls: 3,
    relations: {
      rightOn: ['Antica', 'Mertante', 'Samosia', 'Bintu'],
      allRight: ['Halportia'],
      writeOff: ['Portswana', 'Rostotto', 'Jasna', 'Geldar']
    },
    promises: [
      { resource: 'food', target: 2, byYear: 5 },
      { resource: 'wealth', target: 1, byYear: 5 },
      { resource: 'environment', target: 12, byYear: 3 }
    ]
  }
]
```

- [ ] **Step 2: Reseed the database**

```bash
npx prisma db seed
```

Expected output:
```
Created session: <some-uuid>
```

- [ ] **Step 3: Verify build passes**

```bash
npm run build
```

Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: update planet colours to vivid, well-separated nebula palette"
```

---

### Task 3: Redesign join/page.tsx — Planet Sphere Cards

**Goal:** Replace the left-border planet cards on the join screen with sphere + motto cards using each planet's colour for tinting, and update the loading state icon.

**Files:**
- Modify: `src/app/join/page.tsx`

**Acceptance Criteria:**
- [ ] Each planet card shows a circular sphere (38×38px) with a radial gradient and surface details
- [ ] Each card's background is tinted with the planet's colour at low opacity
- [ ] Each card's border uses the planet's colour at 30% opacity
- [ ] Loading state no longer uses 🪐 emoji
- [ ] `npm run build` exits 0 with no TypeScript errors

**Verify:** `npm run build` → exits 0

**Steps:**

- [ ] **Step 1: Replace the entire file content**

Replace `src/app/join/page.tsx` with:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Country {
  id: string
  name: string
  color: string
  motto: string
}

interface Session {
  id: string
  countries: Country[]
}

// Returns inner surface detail elements rendered inside the sphere div.
// The sphere div must have position:relative and overflow:hidden.
function PlanetSphereDetails({ name }: { name: string }) {
  switch (name) {
    case 'Antica':
      return <>
        <div style={{ position:'absolute', top:'28%', left:'22%', width:6, height:6, borderRadius:'50%', background:'rgba(0,0,0,0.4)' }} />
        <div style={{ position:'absolute', top:'55%', left:'55%', width:5, height:5, borderRadius:'50%', background:'rgba(0,0,0,0.35)' }} />
        <div style={{ position:'absolute', top:'40%', left:0, right:0, height:5, background:'linear-gradient(90deg,transparent,rgba(255,160,50,0.45),transparent)' }} />
      </>
    case 'Portswana':
      return <>
        <div style={{ position:'absolute', top:'30%', left:'40%', width:7, height:7, borderRadius:'50%', background:'rgba(160,80,0,0.4)' }} />
        <div style={{ position:'absolute', top:'55%', left:'20%', width:5, height:5, borderRadius:'50%', background:'rgba(160,80,0,0.3)' }} />
      </>
    case 'Samosia':
      return <>
        <div style={{ position:'absolute', top:'20%', left:'30%', width:13, height:9, borderRadius:'40%', background:'rgba(0,100,30,0.55)' }} />
        <div style={{ position:'absolute', top:'55%', left:'15%', width:10, height:8, borderRadius:'40%', background:'rgba(0,100,30,0.45)' }} />
      </>
    case 'Bintu':
      return <>
        <div style={{ position:'absolute', top:'15%', left:'50%', width:1, height:22, background:'rgba(255,255,255,0.25)', transform:'rotate(30deg)' }} />
        <div style={{ position:'absolute', top:'15%', left:'60%', width:1, height:18, background:'rgba(255,255,255,0.18)', transform:'rotate(-20deg)' }} />
        <div style={{ position:'absolute', top:'55%', left:'25%', width:1, height:16, background:'rgba(255,255,255,0.2)', transform:'rotate(45deg)' }} />
      </>
    case 'Mertante':
      return <>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:10, background:'linear-gradient(180deg,rgba(255,255,255,0.5),rgba(255,255,255,0.08))', borderRadius:'50% 50% 0 0' }} />
        <div style={{ position:'absolute', top:'35%', left:0, right:0, height:4, background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)' }} />
      </>
    case 'Rostotto':
      return <>
        <div style={{ position:'absolute', top:0, left:'40%', width:5, height:'100%', background:'linear-gradient(90deg,transparent,rgba(0,0,0,0.5),transparent)', transform:'rotate(20deg)' }} />
        <div style={{ position:'absolute', top:0, left:'42%', width:2, height:'100%', background:'linear-gradient(180deg,transparent,rgba(224,64,251,0.6),transparent)', transform:'rotate(20deg)' }} />
      </>
    case 'Jasna':
      return <>
        <div style={{ position:'absolute', top:'30%', left:0, right:0, height:4, background:'rgba(120,50,0,0.4)' }} />
        <div style={{ position:'absolute', top:'55%', left:0, right:0, height:3, background:'rgba(120,50,0,0.3)' }} />
      </>
    case 'Geldar':
      return <>
        <div style={{ position:'absolute', top:'20%', left:'10%', width:16, height:16, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.25)' }} />
        <div style={{ position:'absolute', top:'35%', left:0, right:0, height:5, background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)' }} />
      </>
    case 'Halportia':
      return <div style={{ position:'absolute', inset:0, backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 9px,rgba(255,255,255,0.07) 9px,rgba(255,255,255,0.07) 10px),repeating-linear-gradient(90deg,transparent,transparent 9px,rgba(255,255,255,0.07) 9px,rgba(255,255,255,0.07) 10px)' }} />
    case 'Barria':
      return <>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:10, background:'linear-gradient(180deg,rgba(255,255,255,0.65),rgba(255,255,255,0.08))', borderRadius:'50% 50% 0 0' }} />
        <div style={{ position:'absolute', top:'28%', left:'30%', width:1, height:13, background:'rgba(255,255,255,0.3)', transform:'rotate(15deg)' }} />
        <div style={{ position:'absolute', top:'35%', left:'55%', width:1, height:9, background:'rgba(255,255,255,0.25)', transform:'rotate(-25deg)' }} />
      </>
    default:
      return null
  }
}

function PlanetSphere({ name, color }: { name: string; color: string }) {
  return (
    <div style={{
      position: 'relative',
      width: 38,
      height: 38,
      borderRadius: '50%',
      overflow: 'hidden',
      flexShrink: 0,
      background: `radial-gradient(circle at 35% 30%, ${color}ee, ${color}55)`,
      boxShadow: `0 0 16px ${color}cc, 0 0 4px ${color}55`,
    }}>
      <PlanetSphereDetails name={name} />
    </div>
  )
}

export default function JoinPage() {
  const [session, setSession] = useState<Session | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/session')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setSession(data) })
      .catch(console.error)
  }, [])

  const join = (country: Country) => {
    document.cookie = `countryId=${country.id}; path=/; max-age=86400`
    document.cookie = `sessionId=${session?.id}; path=/; max-age=86400`
    router.push('/play')
  }

  if (!session) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div style={{ width:48, height:48, borderRadius:'50%', margin:'0 auto 16px', background:'radial-gradient(circle at 35% 35%, #9b59b6, #4a0080)', boxShadow:'0 0 24px rgba(155,89,182,0.8)' }} />
        <p className="font-display text-sm tracking-widest" style={{ color:'var(--stardust)' }}>CONNECTING TO FEDERATION...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6 pt-4">
          <h1 className="font-display text-3xl font-black tracking-widest mb-1" style={{ color:'var(--stardust)', textShadow:'0 0 30px rgba(155,89,182,0.7)' }}>
            STAR PACT
          </h1>
          <p className="font-display text-xs tracking-widest uppercase" style={{ color:'rgba(155,89,182,0.5)' }}>Select Your Planet</p>
        </div>

        <div style={{ borderTop:'1px solid var(--divider)' }} className="mb-6" />

        <div className="grid grid-cols-2 gap-3">
          {session.countries.map((c, i) => (
            <button
              key={c.id}
              onClick={() => join(c)}
              className="sp-card text-left p-3 transition-all duration-200 hover:scale-105 active:scale-95 anim-fade-in"
              style={{
                background: `rgba(255,255,255,0.02)`,
                border: `1px solid ${c.color}4d`,
                animationDelay: `${i * 0.04}s`,
                animationFillMode: 'both',
              }}
            >
              <div className="flex items-center gap-3 mb-2">
                <PlanetSphere name={c.name} color={c.color} />
                <p className="font-display font-bold text-xs tracking-wider leading-tight"
                  style={{ color: c.color, textShadow: `0 0 8px ${c.color}60` }}>
                  {c.name.toUpperCase()}
                </p>
              </div>
              <p className="text-xs leading-tight" style={{ color:'rgba(255,255,255,0.4)' }}>{c.motto}</p>
            </button>
          ))}
        </div>

        <p className="text-center text-xs mt-6 font-display tracking-widest" style={{ color:'rgba(155,89,182,0.25)' }}>
          FEDERATION INTAKE TERMINAL v1.0
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: exits 0, no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/join/page.tsx
git commit -m "feat: redesign join page with planet sphere cards"
```

---

### Task 4: Update play/page.tsx — Header, Tabs, Resource Labels, Spheres

**Goal:** Add planet sphere to the header with atmosphere gradient, replace emoji tab icons with Lucide SVG icons, rename tabs (Codex/Resources/Pacts/Orbit), rename Smugglers→Rockets, and update inline hardcoded cyan colours.

**Files:**
- Modify: `src/app/play/page.tsx`

**Acceptance Criteria:**
- [ ] Tab icons are Lucide SVG (Layers/Activity/Clock/Globe), not emojis
- [ ] Tab labels read CODEX, RESOURCES, PACTS, ORBIT
- [ ] Header shows planet sphere + atmosphere gradient, not a left-border card
- [ ] Smugglers label is gone; resource reads "Rockets" with 🚀 icon
- [ ] Rocket count IS visible on the participant's own Resources tab
- [ ] Pact progress bar fills use `myColor` when ≥ 100%, amber when 60–99%, red when < 60%
- [ ] Raid modal copy says "Costs 1 Rocket" not "Costs 1 Smuggler"
- [ ] `npm run build` exits 0 with no TypeScript errors

**Verify:** `npm run build` → exits 0

**Steps:**

- [ ] **Step 1: Add lucide-react import at the top of the file**

After the existing React import line, add:

```tsx
import { Layers, Activity, Clock, Globe } from 'lucide-react'
```

- [ ] **Step 2: Update RES_LABELS and RES_ICONS**

Replace:
```tsx
const RES_LABELS: Record<string, string> = { food: 'Energy', wealth: 'Population', environment: 'Oxygen', kushBalls: 'Smugglers' }
const RES_ICONS: Record<string, string>  = { food: '⚡', wealth: '👥', environment: '🌿', kushBalls: '🕵️' }
```

With:
```tsx
const RES_LABELS: Record<string, string> = { food: 'Energy', wealth: 'Population', environment: 'Oxygen', kushBalls: 'Rockets' }
const RES_ICONS: Record<string, string>  = { food: '⚡', wealth: '👥', environment: '💨', kushBalls: '🚀' }
```

- [ ] **Step 3: Update TabId type and TABS array**

Replace:
```tsx
type TabId = 'passport' | 'resources' | 'promises' | 'relations'
```

With:
```tsx
type TabId = 'codex' | 'resources' | 'pacts' | 'orbit'
```

Replace the `TABS` constant (inside the render function, before the return):
```tsx
const TABS: { id: TabId; icon: React.ReactNode; label: string }[] = [
  { id: 'codex',     icon: <Layers size={18} />,   label: 'Codex' },
  { id: 'resources', icon: <Activity size={18} />, label: 'Resources' },
  { id: 'pacts',     icon: <Clock size={18} />,    label: 'Pacts' },
  { id: 'orbit',     icon: <Globe size={18} />,    label: 'Orbit' },
]
```

- [ ] **Step 4: Update tab icon rendering in the tab bar**

Find the tab bar button content (currently renders `<span className="text-base">{t.icon}</span>`).

Replace the inner JSX of the tab bar button:
```tsx
<button key={t.id} onClick={() => setTab(t.id)} className="flex-1 py-3 flex flex-col items-center gap-0.5 transition-colors"
  style={{
    background: tab === t.id ? `${myColor}15` : 'transparent',
    borderBottom: tab === t.id ? `2px solid ${myColor}` : '2px solid transparent',
    color: tab === t.id ? myColor : 'rgba(148,163,184,0.7)',
  }}>
  <span className="flex items-center justify-center" style={{ height: 20 }}>{t.icon}</span>
  <span className="font-display tracking-widest" style={{ fontSize: '0.55rem' }}>{t.label.toUpperCase()}</span>
</button>
```

- [ ] **Step 5: Add PlanetSphereDetails and PlanetSphere local components**

Add these two functions immediately before the `export default function PlayPage()` line. (These are the same surface detail definitions as in join/page.tsx — they must be duplicated, the spec prohibits a shared library.)

```tsx
function PlanetSphereDetails({ name }: { name: string }) {
  switch (name) {
    case 'Antica':
      return <>
        <div style={{ position:'absolute', top:'28%', left:'22%', width:6, height:6, borderRadius:'50%', background:'rgba(0,0,0,0.4)' }} />
        <div style={{ position:'absolute', top:'55%', left:'55%', width:5, height:5, borderRadius:'50%', background:'rgba(0,0,0,0.35)' }} />
        <div style={{ position:'absolute', top:'40%', left:0, right:0, height:5, background:'linear-gradient(90deg,transparent,rgba(255,160,50,0.45),transparent)' }} />
      </>
    case 'Portswana':
      return <>
        <div style={{ position:'absolute', top:'30%', left:'40%', width:7, height:7, borderRadius:'50%', background:'rgba(160,80,0,0.4)' }} />
        <div style={{ position:'absolute', top:'55%', left:'20%', width:5, height:5, borderRadius:'50%', background:'rgba(160,80,0,0.3)' }} />
      </>
    case 'Samosia':
      return <>
        <div style={{ position:'absolute', top:'20%', left:'30%', width:13, height:9, borderRadius:'40%', background:'rgba(0,100,30,0.55)' }} />
        <div style={{ position:'absolute', top:'55%', left:'15%', width:10, height:8, borderRadius:'40%', background:'rgba(0,100,30,0.45)' }} />
      </>
    case 'Bintu':
      return <>
        <div style={{ position:'absolute', top:'15%', left:'50%', width:1, height:22, background:'rgba(255,255,255,0.25)', transform:'rotate(30deg)' }} />
        <div style={{ position:'absolute', top:'15%', left:'60%', width:1, height:18, background:'rgba(255,255,255,0.18)', transform:'rotate(-20deg)' }} />
        <div style={{ position:'absolute', top:'55%', left:'25%', width:1, height:16, background:'rgba(255,255,255,0.2)', transform:'rotate(45deg)' }} />
      </>
    case 'Mertante':
      return <>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:10, background:'linear-gradient(180deg,rgba(255,255,255,0.5),rgba(255,255,255,0.08))', borderRadius:'50% 50% 0 0' }} />
        <div style={{ position:'absolute', top:'35%', left:0, right:0, height:4, background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)' }} />
      </>
    case 'Rostotto':
      return <>
        <div style={{ position:'absolute', top:0, left:'40%', width:5, height:'100%', background:'linear-gradient(90deg,transparent,rgba(0,0,0,0.5),transparent)', transform:'rotate(20deg)' }} />
        <div style={{ position:'absolute', top:0, left:'42%', width:2, height:'100%', background:'linear-gradient(180deg,transparent,rgba(224,64,251,0.6),transparent)', transform:'rotate(20deg)' }} />
      </>
    case 'Jasna':
      return <>
        <div style={{ position:'absolute', top:'30%', left:0, right:0, height:4, background:'rgba(120,50,0,0.4)' }} />
        <div style={{ position:'absolute', top:'55%', left:0, right:0, height:3, background:'rgba(120,50,0,0.3)' }} />
      </>
    case 'Geldar':
      return <>
        <div style={{ position:'absolute', top:'20%', left:'10%', width:16, height:16, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.25)' }} />
        <div style={{ position:'absolute', top:'35%', left:0, right:0, height:5, background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)' }} />
      </>
    case 'Halportia':
      return <div style={{ position:'absolute', inset:0, backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 9px,rgba(255,255,255,0.07) 9px,rgba(255,255,255,0.07) 10px),repeating-linear-gradient(90deg,transparent,transparent 9px,rgba(255,255,255,0.07) 9px,rgba(255,255,255,0.07) 10px)' }} />
    case 'Barria':
      return <>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:10, background:'linear-gradient(180deg,rgba(255,255,255,0.65),rgba(255,255,255,0.08))', borderRadius:'50% 50% 0 0' }} />
        <div style={{ position:'absolute', top:'28%', left:'30%', width:1, height:13, background:'rgba(255,255,255,0.3)', transform:'rotate(15deg)' }} />
        <div style={{ position:'absolute', top:'35%', left:'55%', width:1, height:9, background:'rgba(255,255,255,0.25)', transform:'rotate(-25deg)' }} />
      </>
    default:
      return null
  }
}

function PlanetSphere({ name, color, size = 32 }: { name: string; color: string; size?: number }) {
  return (
    <div style={{
      position: 'relative',
      width: size,
      height: size,
      borderRadius: '50%',
      overflow: 'hidden',
      flexShrink: 0,
      background: `radial-gradient(circle at 35% 30%, ${color}ee, ${color}55)`,
      boxShadow: `0 0 14px ${color}cc, 0 0 4px ${color}55`,
    }}>
      <PlanetSphereDetails name={name} />
    </div>
  )
}
```

- [ ] **Step 6: Replace the Header JSX**

Find and replace the header block (the `{/* ── Header ── */}` comment through its closing `</div>`):

```tsx
{/* ── Header ── */}
<div className="relative overflow-hidden px-4 pt-4 pb-3"
  style={{
    background: `linear-gradient(180deg, ${myColor}28 0%, ${myColor}08 60%, transparent 100%)`,
    borderBottom: `1px solid ${myColor}28`,
  }}>
  <div className="flex items-center gap-3">
    <PlanetSphere name={myCountry.name} color={myColor} size={32} />
    <div>
      <h1 className="font-display font-black tracking-wider"
        style={{ fontSize: '1rem', lineHeight: 1.1, color: myColor, textShadow: `0 0 12px ${myColor}80` }}>
        {myCountry.name}
      </h1>
      <p className="font-display uppercase"
        style={{ fontSize: '0.5rem', letterSpacing: '1.5px', color: `${myColor}70` }}>
        Planetary Governor
      </p>
    </div>
    <div className="ml-auto text-right">
      <p className="font-display font-black" style={{ fontSize: '1.5rem', lineHeight: 1, color: 'var(--stardust)', textShadow: '0 0 12px rgba(155,89,182,0.6)' }}>
        Y{session.year}
      </p>
      <span className={`phase-badge ${PHASE_CLASS[session.phase] || 'phase-yearend'}`} style={{ fontSize: '0.5rem' }}>
        {PHASE_LABELS[session.phase]?.split(' ').slice(1).join(' ') || session.phase}
      </span>
    </div>
  </div>
</div>
```

- [ ] **Step 7: Update notification toast — fix hardcoded cyan rgba**

Find the notification toast inline style:
```tsx
background: notifType === 'raid' ? 'rgba(255,59,59,0.2)' : notifType === 'error' ? 'rgba(255,59,59,0.15)' : 'rgba(0,245,255,0.1)',
```

Replace with:
```tsx
background: notifType === 'raid' ? 'rgba(255,59,59,0.2)' : notifType === 'error' ? 'rgba(255,59,59,0.15)' : 'rgba(155,89,182,0.1)',
```

- [ ] **Step 8: Update tab conditional checks — passport→codex, promises→pacts, relations→orbit**

Find and replace these four occurrences:

| Find | Replace |
|---|---|
| `tab === 'passport'` | `tab === 'codex'` |
| `tab === 'resources'` | `tab === 'resources'` (unchanged) |
| `tab === 'promises'` | `tab === 'pacts'` |
| `tab === 'relations'` | `tab === 'orbit'` |

Also update the Pacts section header label from `GALACTIC TREATY COMMITMENTS` to `GALACTIC PACT COMMITMENTS` (inside the `tab === 'pacts'` block):
```tsx
<p className="font-display text-xs tracking-widest text-slate-500 px-1">GALACTIC PACT COMMITMENTS</p>
```

- [ ] **Step 9: Update Pacts progress bar — use myColor when on track**

Inside the `tab === 'pacts'` block, find:
```tsx
const color = pct >= 100 ? '#22c55e' : pct >= 60 ? '#fbbf24' : 'var(--red-raid)'
```

Replace with:
```tsx
const color = pct >= 100 ? myColor : pct >= 60 ? '#fbbf24' : 'var(--red-raid)'
```

- [ ] **Step 10: Update raid modal copy — Smuggler → Rocket**

Find inside the raid modal:
```tsx
<p className="text-xs text-slate-500 mb-4">⚠️ This action will hire your smugglers. Costs 1 Smuggler. Choose your target wisely.</p>
```

Replace with:
```tsx
<p className="text-xs text-slate-500 mb-4">⚠️ This action deploys your rockets. Costs 1 Rocket. Choose your target wisely.</p>
```

- [ ] **Step 11: Verify build passes**

```bash
npm run build
```

Expected: exits 0 with no TypeScript errors. Common errors to watch for:
- `Type 'string' is not assignable to type 'TabId'` — check all `setTab()` calls use the new id strings
- `Property 'passport' does not exist on type` — check all tab conditionals were updated in Step 8

- [ ] **Step 12: Commit**

```bash
git add src/app/play/page.tsx
git commit -m "feat: redesign play page — sphere header, Lucide tab icons, renamed tabs, Rockets"
```

---

### Task 5: Update facilitator/dashboard/page.tsx — Logo, Scoreboard, Resources, Trade Log

**Goal:** Update the facilitator dashboard with the nebula logo style, planet sphere portrait cards with 3-resource horizontal rows (Rockets hidden), SVG orbit section icon, QR code colour update, improved trade log visibility, and pact dot legend.

**Files:**
- Modify: `src/app/facilitator/dashboard/page.tsx`

**Acceptance Criteria:**
- [ ] "STAR PACT" logo uses `--stardust` colour with nebula glow (not cyan glow)
- [ ] Each planet card shows a sphere + left atmosphere bleed + 3 resources in a row (NRG · OXY · POP)
- [ ] Rockets count is NOT shown on any planet card
- [ ] Section header uses SVG orbit icon (not 🪐 emoji)
- [ ] QR code dark colour is `#d4a0ff`, light colour is `#07021a`
- [ ] Trade log entries use `font-size: 0.68rem` for planet names and `0.72rem` for resource details
- [ ] Pact dot legend appears below the planet grid with labels: Pact met / At risk / Failed / Pending
- [ ] `npm run build` exits 0 with no TypeScript errors

**Verify:** `npm run build` → exits 0

**Steps:**

- [ ] **Step 1: Update RES_LABELS and RES_ICONS**

Replace:
```tsx
const RES_LABELS: Record<string, string> = {
  food: 'Energy', wealth: 'Population', environment: 'Oxygen', kushBalls: 'Smugglers'
}
const RES_ICONS: Record<string, string> = {
  food: '⚡', wealth: '👥', environment: '🌿', kushBalls: '🕵️'
}
```

With:
```tsx
const RES_LABELS: Record<string, string> = {
  food: 'Energy', wealth: 'Population', environment: 'Oxygen', kushBalls: 'Rockets'
}
const RES_ICONS: Record<string, string> = {
  food: '⚡', wealth: '👥', environment: '💨', kushBalls: '🚀'
}
```

- [ ] **Step 2: Update QR code colours**

Find:
```tsx
QRCode.toDataURL(`${window.location.origin}/join`, { width: 160, margin: 1, color: { dark: '#00f5ff', light: '#0a0a1a' } }).then(setQrUrl)
```

Replace with:
```tsx
QRCode.toDataURL(`${window.location.origin}/join`, { width: 160, margin: 1, color: { dark: '#d4a0ff', light: '#07021a' } }).then(setQrUrl)
```

- [ ] **Step 3: Add PlanetSphereDetails and PlanetSphere local components**

Add these two functions immediately before `export default function FacilitatorDashboard()`. These are identical to the versions in play/page.tsx but with a default `size` of `34`:

```tsx
function PlanetSphereDetails({ name }: { name: string }) {
  switch (name) {
    case 'Antica':
      return <>
        <div style={{ position:'absolute', top:'28%', left:'22%', width:6, height:6, borderRadius:'50%', background:'rgba(0,0,0,0.4)' }} />
        <div style={{ position:'absolute', top:'55%', left:'55%', width:5, height:5, borderRadius:'50%', background:'rgba(0,0,0,0.35)' }} />
        <div style={{ position:'absolute', top:'40%', left:0, right:0, height:5, background:'linear-gradient(90deg,transparent,rgba(255,160,50,0.45),transparent)' }} />
      </>
    case 'Portswana':
      return <>
        <div style={{ position:'absolute', top:'30%', left:'40%', width:7, height:7, borderRadius:'50%', background:'rgba(160,80,0,0.4)' }} />
        <div style={{ position:'absolute', top:'55%', left:'20%', width:5, height:5, borderRadius:'50%', background:'rgba(160,80,0,0.3)' }} />
      </>
    case 'Samosia':
      return <>
        <div style={{ position:'absolute', top:'20%', left:'30%', width:13, height:9, borderRadius:'40%', background:'rgba(0,100,30,0.55)' }} />
        <div style={{ position:'absolute', top:'55%', left:'15%', width:10, height:8, borderRadius:'40%', background:'rgba(0,100,30,0.45)' }} />
      </>
    case 'Bintu':
      return <>
        <div style={{ position:'absolute', top:'15%', left:'50%', width:1, height:22, background:'rgba(255,255,255,0.25)', transform:'rotate(30deg)' }} />
        <div style={{ position:'absolute', top:'15%', left:'60%', width:1, height:18, background:'rgba(255,255,255,0.18)', transform:'rotate(-20deg)' }} />
        <div style={{ position:'absolute', top:'55%', left:'25%', width:1, height:16, background:'rgba(255,255,255,0.2)', transform:'rotate(45deg)' }} />
      </>
    case 'Mertante':
      return <>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:10, background:'linear-gradient(180deg,rgba(255,255,255,0.5),rgba(255,255,255,0.08))', borderRadius:'50% 50% 0 0' }} />
        <div style={{ position:'absolute', top:'35%', left:0, right:0, height:4, background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)' }} />
      </>
    case 'Rostotto':
      return <>
        <div style={{ position:'absolute', top:0, left:'40%', width:5, height:'100%', background:'linear-gradient(90deg,transparent,rgba(0,0,0,0.5),transparent)', transform:'rotate(20deg)' }} />
        <div style={{ position:'absolute', top:0, left:'42%', width:2, height:'100%', background:'linear-gradient(180deg,transparent,rgba(224,64,251,0.6),transparent)', transform:'rotate(20deg)' }} />
      </>
    case 'Jasna':
      return <>
        <div style={{ position:'absolute', top:'30%', left:0, right:0, height:4, background:'rgba(120,50,0,0.4)' }} />
        <div style={{ position:'absolute', top:'55%', left:0, right:0, height:3, background:'rgba(120,50,0,0.3)' }} />
      </>
    case 'Geldar':
      return <>
        <div style={{ position:'absolute', top:'20%', left:'10%', width:16, height:16, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.25)' }} />
        <div style={{ position:'absolute', top:'35%', left:0, right:0, height:5, background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)' }} />
      </>
    case 'Halportia':
      return <div style={{ position:'absolute', inset:0, backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 9px,rgba(255,255,255,0.07) 9px,rgba(255,255,255,0.07) 10px),repeating-linear-gradient(90deg,transparent,transparent 9px,rgba(255,255,255,0.07) 9px,rgba(255,255,255,0.07) 10px)' }} />
    case 'Barria':
      return <>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:10, background:'linear-gradient(180deg,rgba(255,255,255,0.65),rgba(255,255,255,0.08))', borderRadius:'50% 50% 0 0' }} />
        <div style={{ position:'absolute', top:'28%', left:'30%', width:1, height:13, background:'rgba(255,255,255,0.3)', transform:'rotate(15deg)' }} />
        <div style={{ position:'absolute', top:'35%', left:'55%', width:1, height:9, background:'rgba(255,255,255,0.25)', transform:'rotate(-25deg)' }} />
      </>
    default:
      return null
  }
}

function PlanetSphere({ name, color, size = 34 }: { name: string; color: string; size?: number }) {
  return (
    <div style={{
      position: 'relative',
      width: size,
      height: size,
      borderRadius: '50%',
      overflow: 'hidden',
      flexShrink: 0,
      background: `radial-gradient(circle at 35% 30%, ${color}ee, ${color}55)`,
      boxShadow: `0 0 16px ${color}cc, 0 0 4px ${color}55`,
    }}>
      <PlanetSphereDetails name={name} />
    </div>
  )
}
```

- [ ] **Step 4: Update the logo in the header bar**

Find:
```tsx
<h1 className="font-display text-3xl font-black tracking-widest glow-cyan">STAR PACT</h1>
```

Replace with:
```tsx
<h1 className="font-display text-3xl font-black tracking-widest" style={{ color: 'var(--stardust)', textShadow: '0 0 30px rgba(155,89,182,0.7), 0 0 60px rgba(155,89,182,0.3)' }}>STAR PACT</h1>
```

- [ ] **Step 5: Update the "INITIALIZING" loading state**

Find:
```tsx
<p className="font-display text-sm tracking-widest glow-cyan">INITIALIZING COMMAND CENTER...</p>
```

Replace with:
```tsx
<p className="font-display text-sm tracking-widest" style={{ color: 'var(--stardust)' }}>INITIALIZING COMMAND CENTER...</p>
```

- [ ] **Step 6: Replace the Planet Scoreboard section header (🪐 → SVG)**

Find:
```tsx
<p className="font-display text-xs tracking-widest text-slate-500 mb-3">🪐 PLANETARY RESOURCE STATUS</p>
```

Replace with:
```tsx
<div className="flex items-center gap-2 mb-3">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9b59b6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <ellipse cx="12" cy="12" rx="11" ry="4.2" transform="rotate(-30 12 12)"/>
    <ellipse cx="12" cy="12" rx="11" ry="4.2" transform="rotate(30 12 12)"/>
  </svg>
  <p className="font-display text-xs tracking-widest text-slate-500">PLANETARY RESOURCE STATUS</p>
</div>
```

- [ ] **Step 7: Replace the planet scoreboard card rendering**

Find the planet scoreboard card mapping (inside `{/* Planet Scoreboard */}`). It currently renders:

```tsx
{session.countries.map(c => {
  const dots = getPromiseDots(c, promiseChecks)
  const col = resolveColor(c.color)
  return (
    <div key={c.id} className="sp-card p-3" style={{ borderLeft: `3px solid ${col}` }}>
      <div className="flex items-start justify-between mb-2">
        <p className="font-display text-xs font-bold tracking-wide" style={{ color: col, textShadow: `0 0 8px ${col}60` }}>{c.name}</p>
        <div className="flex gap-1 mt-0.5">
          {dots.map((d, i) => (
            <div key={i} className="w-2 h-2 rounded-full" style={{ background: d === 'green' ? '#22c55e' : d === 'amber' ? '#fbbf24' : d === 'red' ? 'var(--red-raid)' : 'rgba(255,255,255,0.15)' }} />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {(['food','wealth','environment','kushBalls'] as const).map(r => (
          <div key={r} className="flex items-center gap-1">
            <span className="text-xs">{RES_ICONS[r]}</span>
            <span className="font-display text-sm font-bold" style={{ color: col }}>{c[r]}</span>
            <span className="text-xs text-slate-600">{RES_LABELS[r].slice(0,3)}</span>
          </div>
        ))}
      </div>
    </div>
  )
})}
```

Replace the entire mapping with:

```tsx
{session.countries.map(c => {
  const dots = getPromiseDots(c, promiseChecks)
  const col = resolveColor(c.color)
  return (
    <div key={c.id} style={{
      borderRadius: 8,
      padding: '10px 12px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      background: `linear-gradient(90deg, ${col}09 0%, transparent 70px), rgba(255,255,255,0.02)`,
      border: `1px solid ${col}33`,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <PlanetSphere name={c.name} color={col} size={34} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="font-display font-bold tracking-wide mb-1" style={{ fontSize: '0.6rem', letterSpacing: '1.5px', textTransform: 'uppercase', color: col, textShadow: `0 0 8px ${col}60` }}>
          {c.name}
        </p>
        <div style={{ display: 'flex' }}>
          {(['food', 'environment', 'wealth'] as const).map((r, idx) => (
            <div key={r} style={{
              flex: 1, textAlign: 'center',
              borderRight: idx < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              padding: '0 4px',
            }}>
              <div className="font-display font-bold" style={{ fontSize: '0.75rem', color: col, lineHeight: 1 }}>{c[r]}</div>
              <div style={{ fontSize: '0.45rem', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 1 }}>
                {RES_LABELS[r].slice(0, 3)}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
        {dots.map((d, i) => (
          <div key={i} style={{
            width: 7, height: 7, borderRadius: '50%',
            background: d === 'green' ? '#22c55e' : d === 'amber' ? '#fbbf24' : d === 'red' ? 'var(--red-raid)' : 'rgba(255,255,255,0.15)',
            boxShadow: d === 'green' ? '0 0 5px #22c55e' : d === 'amber' ? '0 0 5px #fbbf24' : d === 'red' ? '0 0 5px var(--red-raid)' : 'none',
          }} />
        ))}
      </div>
    </div>
  )
})}
```

- [ ] **Step 8: Add pact dot legend below the planet grid**

After the closing `</div>` of the planet grid `className="grid grid-cols-2 gap-2"`, add:

```tsx
{/* Pact dot legend */}
<div style={{ display:'flex', gap:16, marginTop:10, paddingTop:10, borderTop:'1px solid rgba(155,89,182,0.12)', flexWrap:'wrap' }}>
  {[
    { color: '#22c55e', shadow: '#22c55e', label: 'Pact met' },
    { color: '#fbbf24', shadow: '#fbbf24', label: 'At risk' },
    { color: 'var(--red-raid)', shadow: '#ff3b3b', label: 'Failed' },
    { color: 'rgba(255,255,255,0.18)', shadow: 'none', label: 'Pending' },
  ].map(({ color, shadow, label }) => (
    <div key={label} style={{ display:'flex', alignItems:'center', gap:6 }}>
      <div style={{ width:9, height:9, borderRadius:'50%', background:color, boxShadow: shadow !== 'none' ? `0 0 5px ${shadow}` : 'none' }} />
      <span className="font-display" style={{ fontSize:'0.6rem', letterSpacing:'1px', color:'rgba(200,180,255,0.55)' }}>{label}</span>
    </div>
  ))}
</div>
```

- [ ] **Step 9: Improve trade log visibility**

Find the trade feed entries inside `{/* Trade Feed */}`. Each entry renders:
```tsx
<div key={t.id} className="trade-feed-entry text-xs p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--divider)' }}>
  <p className="font-display text-xs" style={{ color: t.status === 'ACCEPTED' ? '#22c55e' : t.status === 'REJECTED' ? 'var(--red-raid)' : 'var(--cyan)' }}>
    {t.status === 'ACCEPTED' ? '✓' : t.status === 'REJECTED' ? '✗' : '⏳'} {t.senderName} → {t.receiverName}
  </p>
  <p className="text-slate-400 mt-0.5">
    {t.offerAmount} {RES_ICONS[t.offerResource]} ↔ {t.requestAmount} {RES_ICONS[t.requestResource]}
  </p>
</div>
```

Replace with:
```tsx
<div key={t.id} className="trade-feed-entry p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}>
  <p className="font-display" style={{
    fontSize: '0.68rem', letterSpacing: '1px', marginBottom: 3,
    color: t.status === 'ACCEPTED' ? '#4fc3f7' : t.status === 'REJECTED' ? '#ff7875' : '#c9a9ff',
  }}>
    {t.status === 'ACCEPTED' ? '✓' : t.status === 'REJECTED' ? '✗' : '⏳'} {t.senderName} → {t.receiverName}
  </p>
  <p style={{ fontSize: '0.72rem', color: 'rgba(220,200,255,0.6)' }}>
    {t.offerAmount} {RES_ICONS[t.offerResource]} {RES_LABELS[t.offerResource]} ↔ {t.requestAmount} {RES_ICONS[t.requestResource]} {RES_LABELS[t.requestResource]}
  </p>
</div>
```

- [ ] **Step 10: Verify build passes**

```bash
npm run build
```

Expected: exits 0. TypeScript errors to watch for:
- `'food' | 'environment' | 'wealth'` tuple access on `Country` — these are all valid fields
- `PlanetSphere` not found — ensure Step 3 functions are placed before `export default`

- [ ] **Step 11: Commit**

```bash
git add src/app/facilitator/dashboard/page.tsx
git commit -m "feat: redesign facilitator dashboard — sphere portraits, 3-resource row, nebula palette"
```

---

## Self-Review

**Spec coverage check:**

| Spec Requirement | Covered By |
|---|---|
| Nebula palette — void bg, purple accent, stardust | Task 1 |
| Phase badge colours | Task 1 (TRADING updated; others auto-update via var) |
| 10 planet colour tokens — distinct, vivid | Task 2 |
| Planet sphere surface details per planet | Tasks 3, 4, 5 (PlanetSphereDetails) |
| Join screen — sphere cards, individual planet tinting | Task 3 |
| Play screen — immersive atmosphere header | Task 4 |
| Play screen — Lucide tab icons | Task 0 + Task 4 |
| Tab renames: Codex / Resources / Pacts / Orbit | Task 4 |
| Rockets label + 🚀 icon (Smugglers renamed) | Tasks 4, 5 |
| Rockets visible on participant screen | Task 4 (kept in RESOURCES array) |
| Rockets NOT visible on facilitator dashboard | Task 5 (only food/environment/wealth rendered) |
| Pact progress bars use planet colour when on track | Task 4 |
| Facilitator — neutral nebula backdrop | Task 1 |
| Facilitator — planet portrait cards with sphere | Task 5 |
| Facilitator — 3 resources in a row (NRG·OXY·POP) | Task 5 |
| Facilitator — SVG orbit section icon | Task 5 |
| Facilitator — pact dot legend | Task 5 |
| Facilitator — trade log improved visibility | Task 5 |
| QR code nebula colours | Task 5 |
| lucide-react installed | Task 0 |

All spec requirements are covered. No gaps found.

**Placeholder scan:** No TBD, TODO, or incomplete sections.

**Type consistency:**
- `TabId` updated in one place (line 74); all `setTab()` calls and conditional checks updated in Steps 8 of Task 4.
- `PlanetSphere` and `PlanetSphereDetails` defined with identical signatures in Tasks 3, 4, 5 — default `size` differs (38 in join, 32 in play, 34 in dashboard) but all accept the same props.
- `(['food', 'environment', 'wealth'] as const)` in Task 5 Step 7 — all three are valid keys of the `Country` interface.
