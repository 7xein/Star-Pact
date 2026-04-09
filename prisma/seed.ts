import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'path'

const dbPath = path.join(process.cwd(), 'dev.db')
const adapter = new PrismaBetterSqlite3({ url: dbPath })
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any)

const COUNTRIES = [
  {
    name: 'Antica',
    color: 'red',
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
    color: '#eab308',
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
    color: '#2d6a4f',
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
    color: '#f472b6',
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
    color: '#86efac',
    motto: 'The Good, the Great, and the Green',
    story: 'An eco-nation trying to survive in a world that doesn\'t share its values.',
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
    color: '#7c3aed',
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
    color: '#f97316',
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
    color: '#2563eb',
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
    color: '#94a3b8',
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
    color: '#7dd3fc',
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

async function main() {
  // Delete existing sessions
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
    }
  })

  console.log(`Created session: ${session.id}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
