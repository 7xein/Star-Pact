import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { broadcastUpdate } from '@/lib/sse'

const COUNTRIES = [
  { name: 'Ignis Prime', color: '#ff7043', motto: 'We burned first. We will burn last.', story: 'Ancient, proud, and structured, Ignis Prime values tradition above all. When other planets improvised their way through chaos, Ignis Prime held full council before making any move — and expected everyone else to do the same.', famousFor: 'Its elaborate meeting protocols and strict chain of command — once delayed an emergency evacuation to finish the agenda', food: 6, wealth: 1, environment: 4, kushBalls: 5, relations: { rightOn: ['Glacius', 'Voidara'], allRight: ['Lumenor', 'Dustara', 'Ferron'], writeOff: ['Solara', 'Rosara', 'Aqualis', 'Verdania'] }, promises: [{ resource: 'food', target: 3, byYear: 5 }, { resource: 'wealth', target: 2, byYear: 5 }, { resource: 'environment', target: 7, byYear: 4 }] },
  { name: 'Aqualis', color: '#4fc3f7', motto: 'We solved it yesterday.', story: 'Advanced and efficient, Aqualis operates several steps ahead of everyone else. The problem is they rarely explain how — their solutions work perfectly, they just never come with instructions anyone else can follow.', famousFor: 'Elegant solutions nobody else can replicate — once resolved a planetary crisis and declined to explain how', food: 10, wealth: 3, environment: 6, kushBalls: 4, relations: { rightOn: ['Solara', 'Lumenor'], allRight: ['Dustara'], writeOff: ['Rosara', 'Voidara', 'Ferron', 'Verdania', 'Ignis Prime', 'Glacius'] }, promises: [{ resource: 'food', target: 8, byYear: 5 }, { resource: 'wealth', target: 1, byYear: 5 }, { resource: 'environment', target: 1, byYear: 5 }] },
  { name: 'Verdania', color: '#69f0ae', motto: 'Survival must be sustainable.', story: 'Verdania does things the right way or not at all. Principled and long-sighted, they refused faster fuel methods even under pressure — because the right path takes longer, and they are completely fine with that.', famousFor: 'Unwavering principles and long-term thinking — turned down a quick win to protect future generations', food: 8, wealth: 10, environment: 2, kushBalls: 6, relations: { rightOn: ['Rosara'], allRight: ['Voidara', 'Ferron'], writeOff: ['Solara', 'Aqualis', 'Lumenor', 'Dustara', 'Ignis Prime', 'Glacius'] }, promises: [{ resource: 'food', target: 3, byYear: 5 }, { resource: 'wealth', target: 8, byYear: 5 }, { resource: 'environment', target: 5, byYear: 4 }] },
  { name: 'Solara', color: '#fff176', motto: "If it's not dangerous, it's not worth doing.", story: 'Solara acts first and thinks later — and somehow survives every time. Fearless to a fault, its pilots rush into danger zones at full speed, trusting instinct and momentum over strategy or planning.', famousFor: 'Rushing headfirst into danger and calling it heroism — their rescue missions have occasionally needed rescuing', food: 10, wealth: 3, environment: 6, kushBalls: 4, relations: { rightOn: ['Aqualis', 'Lumenor'], allRight: ['Glacius', 'Dustara'], writeOff: ['Voidara', 'Ferron', 'Rosara', 'Verdania', 'Ignis Prime'] }, promises: [{ resource: 'food', target: 8, byYear: 5 }, { resource: 'wealth', target: 1, byYear: 5 }, { resource: 'environment', target: 1, byYear: 5 }] },
  { name: 'Rosara', color: '#f48fb1', motto: 'Even in war, comfort is mandatory.', story: 'Warm, welcoming, and endlessly generous, Rosara believes safety and care are non-negotiable even in crisis. They built overcrowded safe zones for everyone — whether those people wanted them or not.', famousFor: 'Elaborate comfort stations and safe spaces — their shelters have cushions, warm drinks, and a very long waiting list', food: 1, wealth: 1, environment: 18, kushBalls: 8, relations: { rightOn: ['Verdania'], allRight: ['Voidara', 'Ferron'], writeOff: ['Solara', 'Aqualis', 'Lumenor', 'Dustara', 'Ignis Prime', 'Glacius'] }, promises: [{ resource: 'food', target: 8, byYear: 2 }, { resource: 'wealth', target: 4, byYear: 3 }, { resource: 'environment', target: 6, byYear: 4 }] },
  { name: 'Lumenor', color: '#8c9eff', motto: "If it shines, it's worth building.", story: 'Creative, bold, and obsessed with beauty, Lumenor builds things that look stunning and work adequately. Their battle ships were the most impressive vessels in the fleet — and broke down spectacularly in their first engagement.', famousFor: 'Spectacular creations that inspire awe and occasional catastrophe — their technology is breathtaking right up until it fails', food: 1, wealth: 5, environment: 2, kushBalls: 3, relations: { rightOn: ['Solara', 'Aqualis'], allRight: ['Ignis Prime', 'Glacius', 'Dustara'], writeOff: ['Rosara', 'Voidara', 'Ferron', 'Verdania'] }, promises: [{ resource: 'food', target: 2, byYear: 5 }, { resource: 'wealth', target: 1, byYear: 5 }, { resource: 'environment', target: 12, byYear: 3 }] },
  { name: 'Dustara', color: '#ffcc80', motto: 'Trust instinct. Distrust everyone else.', story: 'Independent and deeply suspicious, Dustara trusts its own read on a situation over any alliance or policy. Their surveillance systems have an uncomfortable talent for revealing what leaders actually think.', famousFor: 'Inconvenient truths and unsolicited transparency — their tech once exposed three leaders\' private thoughts during a live broadcast', food: 1, wealth: 1, environment: 18, kushBalls: 8, relations: { rightOn: ['Solara', 'Aqualis'], allRight: ['Ignis Prime', 'Glacius', 'Lumenor'], writeOff: ['Rosara', 'Voidara', 'Ferron', 'Verdania'] }, promises: [{ resource: 'food', target: 8, byYear: 2 }, { resource: 'wealth', target: 4, byYear: 3 }, { resource: 'environment', target: 6, byYear: 4 }] },
  { name: 'Glacius', color: '#b2ebf2', motto: 'We remember. That is enough.', story: 'Calm, precise, and observant, Glacius forgets nothing. While others scramble, Glacius watches, records, and waits — then produces a detailed report of every mistake you made at the most inconvenient moment possible.', famousFor: 'Meticulous record-keeping — once shared a comprehensive report of every other planet\'s failures at a diplomatic summit', food: 1, wealth: 5, environment: 2, kushBalls: 3, relations: { rightOn: ['Ignis Prime', 'Lumenor'], allRight: ['Dustara', 'Voidara', 'Ferron'], writeOff: ['Solara', 'Rosara', 'Aqualis', 'Verdania'] }, promises: [{ resource: 'food', target: 2, byYear: 5 }, { resource: 'wealth', target: 1, byYear: 5 }, { resource: 'environment', target: 12, byYear: 3 }] },
  { name: 'Ferron', color: '#cfd8dc', motto: "What's the worst that could happen?", story: 'Energetic, unpredictable, and surprisingly effective, Ferron adapts faster than anyone. Their defense systems have a tendency to act on their own initiative — which has worked out roughly half the time.', famousFor: 'Creative solutions with unintended side effects — their autonomous defense grid once locked out their own military for three days', food: 8, wealth: 10, environment: 2, kushBalls: 6, relations: { rightOn: ['Voidara', 'Ignis Prime'], allRight: ['Rosara', 'Verdania', 'Glacius'], writeOff: ['Solara', 'Lumenor', 'Dustara', 'Aqualis'] }, promises: [{ resource: 'food', target: 3, byYear: 5 }, { resource: 'wealth', target: 8, byYear: 5 }, { resource: 'environment', target: 5, byYear: 4 }] },
  { name: 'Voidara', color: '#ea80fc', motto: "If it's not dramatic, it's not worth doing.", story: 'Voidara treats every moment as a performance. Their diplomats deliver statements as theatrical productions, their warnings arrive as spoken-word art, and some of their most critical messages were initially mistaken for entertainment.', famousFor: 'Unforgettable performances and occasionally misunderstood warnings — their evacuation announcement won three arts awards', food: 6, wealth: 1, environment: 4, kushBalls: 5, relations: { rightOn: ['Ignis Prime', 'Ferron'], allRight: ['Rosara', 'Verdania', 'Glacius'], writeOff: ['Solara', 'Lumenor', 'Dustara', 'Aqualis'] }, promises: [{ resource: 'food', target: 3, byYear: 5 }, { resource: 'wealth', target: 2, byYear: 5 }, { resource: 'environment', target: 7, byYear: 4 }] },
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
