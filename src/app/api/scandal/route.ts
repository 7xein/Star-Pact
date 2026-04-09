import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { broadcastUpdate } from '@/lib/sse'

export async function POST(req: Request) {
  const body = await req.json()
  const { sessionId, attackerId, defenderId, resource, amount } = body

  const session = await prisma.session.findUnique({ where: { id: sessionId } })
  if (!session) return NextResponse.json({ error: 'No session' }, { status: 404 })
  if (session.phase !== 'SCANDAL') return NextResponse.json({ error: 'Not in raid phase' }, { status: 400 })

  const attacker = await prisma.country.findUnique({ where: { id: attackerId } })
  if (!attacker) return NextResponse.json({ error: 'Planet not found' }, { status: 404 })
  if (attacker.kushBalls < 1) return NextResponse.json({ error: 'Need at least 1 Smuggler to launch a raid' }, { status: 400 })

  const windowEndsAt = new Date(Date.now() + 60 * 1000)

  const scandal = await prisma.$transaction(async (tx) => {
    await tx.country.update({ where: { id: attackerId }, data: { kushBalls: { decrement: 1 } } })
    return tx.scandal.create({
      data: { sessionId, attackerId, defenderId, resource, amount, status: 'OPEN', year: session.year, windowEndsAt },
      include: { attacker: true, defender: true }
    })
  })

  broadcastUpdate(sessionId, { type: 'SCANDAL_LAUNCHED', scandal })
  return NextResponse.json(scandal)
}
