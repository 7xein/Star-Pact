import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { broadcastUpdate } from '@/lib/sse'

export async function POST(req: Request) {
  const body = await req.json()
  const { sessionId, countryId, q1, q2, q3, q4, q5 } = body

  const response = await prisma.debriefResponse.create({
    data: { sessionId, countryId, q1, q2, q3, q4, q5 },
    include: { country: true }
  })

  broadcastUpdate(sessionId, { type: 'DEBRIEF_RESPONSE', response })
  return NextResponse.json(response)
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('sessionId')
  if (!sessionId) return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })

  const responses = await prisma.debriefResponse.findMany({
    where: { sessionId },
    include: { country: true },
    orderBy: { createdAt: 'asc' }
  })
  return NextResponse.json(responses)
}
