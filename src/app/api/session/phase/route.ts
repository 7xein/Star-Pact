import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { broadcastUpdate } from '@/lib/sse'

const PHASES = ['TRADING', 'PROMISE_CHECK', 'SCANDAL', 'YEAR_END']

export async function POST(req: Request) {
  const body = await req.json()
  const { action, sessionId } = body  // action: NEXT_PHASE | NEXT_YEAR | START_TIMER | PAUSE_TIMER

  const session = await prisma.session.findUnique({ where: { id: sessionId } })
  if (!session) return NextResponse.json({ error: 'No session' }, { status: 404 })

  let update: Record<string, unknown> = {}

  if (action === 'NEXT_PHASE') {
    const currentIndex = PHASES.indexOf(session.phase)
    if (currentIndex < PHASES.length - 1) {
      const nextPhase = PHASES[currentIndex + 1]
      update = { phase: nextPhase, timerRunning: false, timerEnd: null }

      // Auto-run promise check
      if (nextPhase === 'PROMISE_CHECK') {
        await runPromiseCheck(sessionId, session.year)
      }
    } else {
      // Move to next year
      if (session.year < 5) {
        update = { year: session.year + 1, phase: 'TRADING', timerRunning: false, timerEnd: null }
      } else {
        update = { phase: 'DEBRIEF', timerRunning: false, timerEnd: null }
      }
    }
  } else if (action === 'NEXT_YEAR') {
    if (session.year < 5) {
      update = { year: session.year + 1, phase: 'TRADING', timerRunning: false, timerEnd: null }
    } else {
      update = { phase: 'DEBRIEF', timerRunning: false, timerEnd: null }
    }
  } else if (action === 'START_TIMER') {
    const durationMs = (body.minutes || 5) * 60 * 1000
    update = { timerRunning: true, timerEnd: new Date(Date.now() + durationMs) }
  } else if (action === 'PAUSE_TIMER') {
    update = { timerRunning: false }
  }

  const updated = await prisma.session.update({
    where: { id: sessionId },
    data: update,
    include: { countries: true }
  })

  broadcastUpdate(sessionId, { type: 'SESSION_UPDATE', session: updated })
  return NextResponse.json(updated)
}

async function runPromiseCheck(sessionId: string, year: number) {
  const countries = await prisma.country.findMany({ where: { sessionId } })

  for (const country of countries) {
    const promises = JSON.parse(country.promisesData) as Array<{ resource: string; target: number; byYear: number }>

    for (const promise of promises) {
      if (promise.byYear === year) {
        const actual = country[promise.resource as keyof typeof country] as number
        const passed = actual >= promise.target

        await prisma.promiseCheck.create({
          data: {
            sessionId,
            countryId: country.id,
            year,
            resource: promise.resource,
            required: promise.target,
            actual,
            passed
          }
        })
      }
    }
  }
}
