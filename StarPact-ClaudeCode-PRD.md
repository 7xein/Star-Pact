# Star Pact — Claude Code Build Prompt

Paste everything below this line into Claude Code:

---

I want to build a working web prototype of a training simulation called **"Star Pact"**. It is mechanically identical to "Promises, Promises" but reskinned as satirical bureaucratic space politics. Ten newly elected planetary governors manage three planetary resources across five simulated years, trading with allies, and hiring smugglers to raid rivals.

There are two interfaces: a **Facilitator Screen** (shown on a projector) and a **Participant Mobile View** (accessed by scanning a QR code on their phone).

**Tech stack for the prototype:**
- Next.js (App Router) with TypeScript
- SQLite with Prisma (zero-setup local database)
- Tailwind CSS for styling
- Server-Sent Events (SSE) for real-time updates (not WebSockets)
- `qrcode` npm library for QR generation

---

## RESOURCE NAMING

| Original | Star Pact |
|----------|-----------|
| Food | Energy |
| Wealth | Population |
| Environment | Oxygen |
| Kush Balls | Smugglers |
| Scandal | Piracy Raid |
| Right-on | Warp Lane Access |
| All right | Diplomatic Clearance |
| Write off | Blockaded |
| Countries | Planets |

---

## CORE PROTOTYPE FEATURES (build in this order)

1. **Session Creation** — Facilitator visits `/facilitator`, enters password ("admin123" for prototype), clicks "New Session." Seeds all 10 planets with starting resources.

2. **Facilitator Dashboard** (`/facilitator/dashboard`) — Shows: current year (1–5), current phase (TRADING / PROMISE_CHECK / RAID / YEAR_END / DEBRIEF), countdown timer with Start / Pause / Next Phase / Next Year buttons, scoreboard of all 10 planets showing Energy / Population / Oxygen / Smugglers. QR code always visible in corner linking to `/join`.

3. **Participant Join** (`/join`) — Shows all 10 planets as cards in their theme colors. Participant taps their planet to enter their mobile view. Store selection in a cookie.

4. **Participant Mobile View** (`/play`) — Tabs: Passport (planet name, color, motto, backstory, famous for, relations history), Resources (live Energy/Population/Oxygen/Smugglers), Promises (target + deadline year + progress bar), Relationships (Warp Lane Access / Diplomatic Clearance / Blockaded lists). Action buttons (Trade, Launch Raid) appear only during correct phases.

5. **Trading** — During TRADING phase: select target planet, specify offer and request (resource type + amount), submit. Target accepts or rejects. Blockaded planets non-selectable. Diplomatic Clearance capped at 2 units per resource per transaction. Warp Lane Access has no cap.

6. **Promise Check** — Facilitator advances to PROMISE_CHECK: system evaluates each planet's resources against promises due this year. Facilitator screen shows pass/fail. Participant view shows notification.

7. **Piracy Raid** — During RAID phase: planet taps "Launch Raid," selects target planet and resource type + amount to contest. 60-second alliance window — other planets join attacker or defender side. Facilitator taps "Resolve Raid" — server generates random 50/50 outcome (crypto.randomInt). Winner's side takes contested resources from loser's side. Each losing ally gives up the full disputed amount. Each raid costs the attacker 1 Smuggler regardless of outcome. Raid blocked if attacker has 0 Smugglers.

8. **Debrief** — After Year 5, participant mobile view shows 5 reflection questions as a form. Participants submit answers. Facilitator screen shows live response feed.

---

## ALL 10 PLANET DATA — seed exactly as follows

### 1. ZORBLAX | Color: #dc2626 | Motto: "We Peaked Centuries Ago"
**Backstory:** Zorblax was once the crown jewel of the galaxy — towering intellect, breathtaking architecture, remarkable cuisine. That was 400 years ago. Today, Zorblax coasts entirely on its historical reputation, issuing lengthy press releases about past achievements and sending strongly-worded letters to anyone who questions their relevance.
**Famous For:** Zorblax invented the Galactic Standard Bureaucratic Form (GSBF-7), a 47-page document required for any inter-planetary transaction. They are extremely proud of this. No one else is.
**Relations History:** Zorblax distributed millions of GSBF-7 forms to Plumeria, Blargh, Gloopiter, and Snorvia, insisting all trade go through proper channels. The forms were so complex that trade ground to a halt for three years. Relations remain complicated.
**Starting:** Energy: 8 | Population: 10 | Oxygen: 2 | Smugglers: 6
**Promises:** Energy→3 by Y5 | Population→8 by Y5 | Oxygen→5 by Y4
**Warp Lane Access:** Veluptia, Cramdor
**Diplomatic Clearance:** Fizznak, Quorb, Snorvia
**Blockaded:** Plumeria, Blargh, Gloopiter, Mertox

---

### 2. PLUMERIA | Color: #eab308 | Motto: "Technically Not Our Fault"
**Backstory:** Plumerians are a cheerful, outdoorsy people who built an entire civilization around extreme sports and elaborate excuses. Their legal system consists entirely of liability waivers. Their tourism board's slogan is "Visit Plumeria — You Probably Won't Die."
**Famous For:** Gravity Flakes — a breakfast cereal that, consumed in zero-gravity, expands to 40 times its original size. Marketed as "the snack that fills you up." It filled up several cargo bays instead.
**Relations History:** Cramdor, Blargh, Mertox, and Veluptia placed enormous orders for Gravity Flakes. Their space stations were rendered inoperable for months due to cereal expansion incidents. Plumeria's statement noted the instructions "clearly stated zero-gravity not recommended." The instructions did not say this.
**Starting:** Energy: 10 | Population: 3 | Oxygen: 6 | Smugglers: 4
**Promises:** Energy→8 by Y5 | Population→1 by Y5 | Oxygen→1 by Y5
**Warp Lane Access:** Fizznak, Quorb
**Diplomatic Clearance:** Snorvia, Gloopiter, Zorblax
**Blockaded:** Veluptia, Blargh, Cramdor, Mertox

---

### 3. SNORVIA | Color: #166534 | Motto: "We Remember Everything. Everything."
**Backstory:** Snorvia is home to the galaxy's largest archive of grudges, meticulously catalogued and cross-referenced. Snorvians have photographic memory and an ancestral commitment to holding onto slights across generations. Their national holiday is "Remembrance of the Incident." There are 14 such holidays.
**Famous For:** "The Little Book of Planetary Blunders" — a children's guide to other civilizations' most embarrassing historical mistakes, with illustrations. It was meant warmly. It was not received warmly.
**Relations History:** Plumeria, Mertox, Blargh, and Gloopiter ordered millions of copies. A chapter titled "The Top 10 Dumbest Things Your Planet Ever Did" caused immediate diplomatic incidents. When Snorvia suggested everyone "just forget about it," the irony was not lost on anyone.
**Starting:** Energy: 8 | Population: 10 | Oxygen: 2 | Smugglers: 6
**Promises:** Energy→3 by Y5 | Population→8 by Y5 | Oxygen→5 by Y4
**Warp Lane Access:** Veluptia, Cramdor
**Diplomatic Clearance:** Fizznak, Quorb, Zorblax
**Blockaded:** Plumeria, Blargh, Gloopiter, Mertox

---

### 4. BLARGH | Color: #ec4899 | Motto: "Whatever You Need, Darling"
**Backstory:** Blargh is the galaxy's premier resort destination — crystalline oceans, seventeen moons, a hospitality industry so aggressively pleasant it makes visitors mildly uncomfortable. Their economy is built on tourism and saying yes to absolutely everything, which has historically caused problems.
**Famous For:** The Blargh Shadowbloom — a rapidly growing space plant providing shade for beach resorts. It also grows through hull plating and reproduces every 72 hours. Details were not disclosed in the brochure.
**Relations History:** Plumeria, Zorblax, Snorvia, Fizznak, Gloopiter, and Quorb placed bulk orders for Shadowbloom seeds. Within one season, space stations were structurally compromised by plant growth. Six planets spent fortunes on removal. Blargh issued a wellness newsletter about "embracing nature." The lawsuits are ongoing.
**Starting:** Energy: 1 | Population: 1 | Oxygen: 18 | Smugglers: 8
**Promises:** Energy→8 by Y2 | Population→4 by Y3 | Oxygen→6 by Y4
**Warp Lane Access:** None
**Diplomatic Clearance:** Veluptia, Cramdor, Mertox
**Blockaded:** Plumeria, Gloopiter, Fizznak, Quorb, Zorblax, Snorvia

---

### 5. MERTOX | Color: #4ade80 | Motto: "The Good, The Sustainable, The Smug"
**Backstory:** Mertox is a beacon of environmental consciousness, renewable energy, and unsolicited advice. Mertoxians compost everything, including their opinions, which they redistribute as fertilizer for other planets' "intellectual growth." They mean well. They are exhausting.
**Famous For:** The Cosmic Nutri-Pod — a nutrient capsule combining the flavours of seventeen vegetables into one sustainable snack. Six planets ordered it. It tasted exactly like sadness compressed into a pellet.
**Relations History:** Mertox invited Plumeria, Zorblax, Snorvia, Fizznak, Gloopiter, and Quorb on a sponsored "Wellness Delegation" tour. The trip ended when several governors requested a meal with actual protein. Mertox filed an official complaint about "nutritional imperialism." Relations collapsed.
**Starting:** Energy: 1 | Population: 1 | Oxygen: 18 | Smugglers: 8
**Promises:** Energy→8 by Y2 | Population→4 by Y3 | Oxygen→6 by Y4
**Warp Lane Access:** None
**Diplomatic Clearance:** Veluptia, Cramdor, Blargh
**Blockaded:** Plumeria, Gloopiter, Fizznak, Quorb, Zorblax, Snorvia

---

### 6. FIZZNAK | Color: #7c3aed | Motto: "Bold, True, and Slightly Radioactive"
**Backstory:** Fizznak is a planet of industry, large families, and spectacular stained-glass architecture — making their cities look like enormous decorative lampshades. Fizznakians are loyal, loud, and have an inexplicable tradition of naming their children after spacecraft components.
**Famous For:** Fizznak's stained glass appears in cathedrals, government buildings, and luxury yachts across the galaxy. They also branched into stained-glass-hulled spacecraft, which were beautiful and almost entirely non-functional as spacecraft.
**Relations History:** Cramdor, Blargh, Mertox, and Veluptia each commissioned stained-glass spacecraft. The vessels were magnificent. They shattered upon re-entry. Fizznak disputed that "re-entry durability" was ever part of the spec. The invoice remains unpaid.
**Starting:** Energy: 6 | Population: 1 | Oxygen: 4 | Smugglers: 5
**Promises:** Energy→3 by Y5 | Population→2 by Y5 | Oxygen→7 by Y4
**Warp Lane Access:** Plumeria, Gloopiter
**Diplomatic Clearance:** Quorb, Zorblax, Snorvia
**Blockaded:** Blargh, Veluptia, Cramdor, Mertox

---

### 7. QUORB | Color: #f97316 | Motto: "We Need Only Us (And Possibly A Trade Deal)"
**Backstory:** Quorb is a fiercely independent planet of mountain peaks, tropical flowers, and an entire species of pets that are inexplicably also government officials. Quorbians are warm to each other and deeply suspicious of outsiders. Their immigration form is 200 pages. Page 198 asks if you have "vibes."
**Famous For:** The BarkTranslator Collar — converts pet communications into recognizable words. It works. This has caused significant political complications, as several Quorbian cabinet ministers are dogs who now have strong opinions about trade policy.
**Relations History:** Mertox, Veluptia, Cramdor, and Blargh placed large orders for BarkTranslator Collars. The collars worked perfectly. The translated communications from their own pets were so alarming that two planetary governments faced internal revolts. Quorb noted they "cannot be held responsible for what your pets think of you."
**Starting:** Energy: 6 | Population: 1 | Oxygen: 4 | Smugglers: 5
**Promises:** Energy→3 by Y5 | Population→2 by Y5 | Oxygen→7 by Y4
**Warp Lane Access:** Plumeria, Gloopiter
**Diplomatic Clearance:** Fizznak, Zorblax, Snorvia
**Blockaded:** Blargh, Veluptia, Cramdor, Mertox

---

### 8. GLOOPITER | Color: #2563eb | Motto: "The Rewarded (By Ourselves, For Ourselves)"
**Backstory:** Gloopiter is a planet of vast fertile plains, enormous coastlines, and a technology sector so advanced it has become entirely incomprehensible to the other nine planets. Gloopiterians are polite, enormously wealthy, and mildly astonished that everyone else hasn't figured things out yet.
**Famous For:** The Ageless Mirror — lets users choose how old they appear in their reflection. The technology was flawless. The four planets that imported it experienced a complete societal collapse of vanity-related productivity. Everyone spent 6 hours a day looking at themselves.
**Relations History:** Veluptia, Mertox, Blargh, and Cramdor imported Ageless Mirrors by the millions. Economic output dropped 40%. Several elections were decided entirely by how good candidates looked in their mirrors. Gloopiter filed the complaints under "not our department."
**Starting:** Energy: 10 | Population: 3 | Oxygen: 6 | Smugglers: 4
**Promises:** Energy→8 by Y5 | Population→1 by Y5 | Oxygen→1 by Y5
**Warp Lane Access:** Quorb, Fizznak
**Diplomatic Clearance:** Plumeria, Zorblax, Snorvia
**Blockaded:** Blargh, Veluptia, Cramdor, Mertox

---

### 9. VELUPTIA | Color: #94a3b8 | Motto: "Sing A Song (Invoice To Follow)"
**Backstory:** Veluptia is the cultural capital of the galaxy — theatre, musicals, opera, interpretive zero-gravity dance. Every planet wants Veluptian performers. Veluptians know this and have priced accordingly. Their national pastime is performing. Their second national pastime is talking about their performances.
**Famous For:** Veluptia announced a galaxy-wide "Week of Performances" — a touring spectacular that sold out instantly. The performances were transcendent. The audience behavior was described in Veluptian press as "catastrophically rude." A seven-part documentary was produced. It won seventeen awards.
**Relations History:** Plumeria, Fizznak, Quorb, and Gloopiter bought out the entire performance run. Audiences talked, ate loudly, and a Plumerian governor snored audibly during the finale. Veluptia's tabloids ran "Barbaric Foreigners Ruin Art" for six consecutive weeks.
**Starting:** Energy: 1 | Population: 5 | Oxygen: 2 | Smugglers: 3
**Promises:** Energy→2 by Y5 | Population→1 by Y5 | Oxygen→12 by Y3
**Warp Lane Access:** Zorblax, Mertox, Snorvia, Blargh
**Diplomatic Clearance:** Cramdor
**Blockaded:** Plumeria, Fizznak, Quorb, Gloopiter

---

### 10. CRAMDOR | Color: #7dd3fc | Motto: "To Defend and Snack"
**Backstory:** Cramdor is a boisterous, fun-loving planet famous for miniature collectible figurines and a disproportionate military history for their size. Cramdorians are warm hosts, enthusiastic traders, and deeply committed to the bit.
**Famous For:** Boxed sets of fully autonomous miniature robot soldiers — each unit independently operational, historically accurate, and approximately 4 centimeters tall. A sensation, until they started acting independently.
**Relations History:** Plumeria, Fizznak, Quorb, and Gloopiter ordered millions of sets. Within weeks, the tiny armies marched out of toy boxes and began "occupying" kitchen counters, communications equipment, and a planetary defence console. Cramdor's legal position: the robots were "acting within their programming."
**Starting:** Energy: 1 | Population: 5 | Oxygen: 2 | Smugglers: 3
**Promises:** Energy→2 by Y5 | Population→1 by Y5 | Oxygen→12 by Y3
**Warp Lane Access:** Zorblax, Mertox, Snorvia, Blargh
**Diplomatic Clearance:** Veluptia
**Blockaded:** Plumeria, Fizznak, Quorb, Gloopiter

---

## BUSINESS RULES TO ENFORCE

- Blockaded relationships block trades in both directions (if either side has the other as Blockaded, trade is blocked)
- Diplomatic Clearance trades: max 2 units of any single resource per transaction
- All resource changes (trades, raids) must be atomic database transactions
- Timer state lives server-side, not client-side
- Raid dice roll must use server-side crypto.randomInt, not Math.random()
- Participants can only see their own planet's resources
- Each raid costs the attacker 1 Smuggler regardless of outcome
- A planet with 0 Smugglers cannot launch a raid
- Phase order per year: TRADING → PROMISE_CHECK → RAID → YEAR_END (repeat years 1–5, then DEBRIEF)

---

## DEBRIEF QUESTIONS (show on participant mobile view)

1. "How does this simulation represent your real organization?"
2. "Did you focus on your planet's survival or the Federation's success? What does that mirror at work?"
3. "How do departments in your organization 'raid' each other's resources?"
4. "How safe did you feel after the first piracy raid — and who did you trust?"
5. "What would you do differently — in the simulation, and at work?"

---

## BUILD ORDER

1. Scaffold Next.js project and install all dependencies
2. Set up Prisma with SQLite and create the full schema
3. Write the seed file with all 10 planets
4. Build the facilitator dashboard (scoreboard + phase controls)
5. Build the participant join screen and mobile view
6. Add SSE for real-time sync
7. Add trading system
8. Add promise check
9. Add piracy raid mechanic
10. Add debrief

After each major step, tell me how to test it in the browser before moving on.
