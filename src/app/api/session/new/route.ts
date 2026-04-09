import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { broadcastUpdate } from '@/lib/sse'

const COUNTRIES = [
  { name: 'Ignis Prime', color: '#ff7043', motto: 'Strength Through Fire', story: 'Born from the oldest volcanoes in the galaxy, Ignis Prime burns with fierce ambition. Its people forge alliances the way they forge steel — in heat.', famousFor: 'Its volcanic forges and ancient flame festivals', food: 6, wealth: 1, environment: 4, kushBalls: 5, relations: { rightOn: ['Solara', 'Aqualis'], allRight: ['Voidara', 'Ferron', 'Verdania'], writeOff: ['Rosara', 'Lumenor', 'Glacius', 'Dustara'] }, promises: [{ resource: 'food', target: 3, byYear: 5 }, { resource: 'wealth', target: 2, byYear: 5 }, { resource: 'environment', target: 7, byYear: 4 }] },
  { name: 'Aqualis', color: '#4fc3f7', motto: 'Flow, Adapt, Endure', story: 'A world of vast oceans and a banking system as deep as its seas. Aqualis believes in structured reward — virtue should pay.', famousFor: 'Its deep-sea vaults and elaborate reward ceremonies', food: 10, wealth: 3, environment: 6, kushBalls: 4, relations: { rightOn: ['Ignis Prime', 'Voidara'], allRight: ['Solara', 'Ferron', 'Verdania'], writeOff: ['Rosara', 'Lumenor', 'Glacius', 'Dustara'] }, promises: [{ resource: 'food', target: 8, byYear: 5 }, { resource: 'wealth', target: 1, byYear: 5 }, { resource: 'environment', target: 1, byYear: 5 }] },
  { name: 'Verdania', color: '#69f0ae', motto: 'Life Finds a Way', story: "Verdania's ancient forest canopies hold the memory of a thousand treaties. Its people never forget — and rarely forgive.", famousFor: 'Its canopy cities and legendary memory keepers', food: 8, wealth: 10, environment: 2, kushBalls: 6, relations: { rightOn: ['Lumenor', 'Glacius'], allRight: ['Voidara', 'Ignis Prime', 'Ferron'], writeOff: ['Solara', 'Rosara', 'Aqualis', 'Dustara'] }, promises: [{ resource: 'food', target: 3, byYear: 5 }, { resource: 'wealth', target: 8, byYear: 5 }, { resource: 'environment', target: 5, byYear: 4 }] },
  { name: 'Solara', color: '#fff176', motto: 'Guts, Glory, and Golden Light', story: 'The most radiant planet in the federation — by its own admission. Solara trades in sunlight and stories, always chasing the next deal.', famousFor: 'Its golden markets and radiant trade festivals', food: 10, wealth: 3, environment: 6, kushBalls: 4, relations: { rightOn: ['Voidara', 'Ignis Prime'], allRight: ['Verdania', 'Aqualis', 'Ferron'], writeOff: ['Lumenor', 'Rosara', 'Glacius', 'Dustara'] }, promises: [{ resource: 'food', target: 8, byYear: 5 }, { resource: 'wealth', target: 1, byYear: 5 }, { resource: 'environment', target: 1, byYear: 5 }] },
  { name: 'Rosara', color: '#f48fb1', motto: 'Bloom Eternal', story: 'A world of crystal spires and infinite generosity — until the gardens run dry. Rosara gives freely, but abundance has limits.', famousFor: 'Its crystal spires and famously warm hospitality', food: 1, wealth: 1, environment: 18, kushBalls: 8, relations: { rightOn: [], allRight: ['Lumenor', 'Glacius', 'Dustara'], writeOff: ['Solara', 'Aqualis', 'Voidara', 'Ignis Prime', 'Ferron', 'Verdania'] }, promises: [{ resource: 'food', target: 8, byYear: 2 }, { resource: 'wealth', target: 4, byYear: 3 }, { resource: 'environment', target: 6, byYear: 4 }] },
  { name: 'Lumenor', color: '#8c9eff', motto: 'Light Guides All', story: "Lumenor's towering light pillars illuminate three star systems. A peaceful world that wins through quiet diplomacy and luminous culture.", famousFor: 'Its light-pillar mountains and interstellar song festivals', food: 1, wealth: 5, environment: 2, kushBalls: 3, relations: { rightOn: ['Ferron', 'Dustara', 'Verdania', 'Rosara'], allRight: ['Glacius'], writeOff: ['Solara', 'Voidara', 'Ignis Prime', 'Aqualis'] }, promises: [{ resource: 'food', target: 2, byYear: 5 }, { resource: 'wealth', target: 1, byYear: 5 }, { resource: 'environment', target: 12, byYear: 3 }] },
  { name: 'Dustara', color: '#ffcc80', motto: 'Dust to Destiny', story: "Ringed in amber dust and ancient ambition, Dustara looks to the stars for a better deal. Its rings are beautiful — and completely barren.", famousFor: 'Its spectacular ring system and dust-energy program', food: 1, wealth: 1, environment: 18, kushBalls: 8, relations: { rightOn: [], allRight: ['Lumenor', 'Glacius', 'Rosara'], writeOff: ['Solara', 'Aqualis', 'Voidara', 'Ignis Prime', 'Ferron', 'Verdania'] }, promises: [{ resource: 'food', target: 8, byYear: 2 }, { resource: 'wealth', target: 4, byYear: 3 }, { resource: 'environment', target: 6, byYear: 4 }] },
  { name: 'Glacius', color: '#b2ebf2', motto: 'Cold and Unbroken', story: 'Glacius endures. Its glacier fortresses have outlasted empires. When others scramble, Glacius waits — and then strikes with precision.', famousFor: 'Its glacier fortresses and precise tactical deployments', food: 1, wealth: 5, environment: 2, kushBalls: 3, relations: { rightOn: ['Ferron', 'Dustara', 'Verdania', 'Rosara'], allRight: ['Lumenor'], writeOff: ['Solara', 'Voidara', 'Ignis Prime', 'Aqualis'] }, promises: [{ resource: 'food', target: 2, byYear: 5 }, { resource: 'wealth', target: 1, byYear: 5 }, { resource: 'environment', target: 12, byYear: 3 }] },
  { name: 'Ferron', color: '#cfd8dc', motto: 'Forged, Not Born', story: 'Every Ferron citizen is forged through hardship. A proud world with deep reserves and an even deeper grudge list.', famousFor: 'Its metallic cities and ancient forging ceremonies', food: 8, wealth: 10, environment: 2, kushBalls: 6, relations: { rightOn: ['Lumenor', 'Glacius'], allRight: ['Voidara', 'Ignis Prime', 'Verdania'], writeOff: ['Solara', 'Rosara', 'Aqualis', 'Dustara'] }, promises: [{ resource: 'food', target: 3, byYear: 5 }, { resource: 'wealth', target: 8, byYear: 5 }, { resource: 'environment', target: 5, byYear: 4 }] },
  { name: 'Voidara', color: '#ea80fc', motto: 'From the Void, We Rise', story: "Born from a dying star's collapse, Voidara has thrived on nothing and respects only those who can do the same. They are fearless.", famousFor: 'Its legendary void-warriors and fearless negotiators', food: 6, wealth: 1, environment: 4, kushBalls: 5, relations: { rightOn: ['Solara', 'Aqualis'], allRight: ['Ignis Prime', 'Ferron', 'Verdania'], writeOff: ['Rosara', 'Lumenor', 'Glacius', 'Dustara'] }, promises: [{ resource: 'food', target: 3, byYear: 5 }, { resource: 'wealth', target: 2, byYear: 5 }, { resource: 'environment', target: 7, byYear: 4 }] },
]

export async function POST(req: Request) {
  const body = await req.json()
  if (body.password !== 'admin123') {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  // Clean up old sessions
  await prisma.debriefResponse.deleteMany()
  await prisma.promiseCheck.deleteMany()
  await prisma.scandalAlliance.deleteMany()
  await prisma.scandal.deleteMany()
  await prisma.trade.deleteMany()
  await prisma.country.deleteMany()
  await prisma.session.deleteMany()

  const session = await prisma.session.create({
    data: {
      year: 1,
      phase: 'TRADING',
      countries: {
        create: COUNTRIES.map(c => ({
          name: c.name,
          color: c.color,
          motto: c.motto,
          story: c.story,
          famousFor: c.famousFor,
          food: c.food,
          wealth: c.wealth,
          environment: c.environment,
          kushBalls: c.kushBalls,
          relationsData: JSON.stringify(c.relations),
          promisesData: JSON.stringify(c.promises)
        }))
      }
    },
    include: { countries: true }
  })

  broadcastUpdate(session.id, { type: 'SESSION_CREATED', session })
  return NextResponse.json(session)
}
