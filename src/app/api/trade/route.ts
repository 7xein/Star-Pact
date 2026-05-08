import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { broadcastUpdate } from '@/lib/sse'

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId')
  const countryId = req.nextUrl.searchParams.get('countryId')
  if (!sessionId || !countryId) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  // Pending trades where I'm the receiver
  const incoming = await prisma.trade.findMany({
    where: { sessionId, receiverId: countryId, status: 'PENDING' },
    include: { sender: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  // Recently resolved trades where I'm the sender (last 30 seconds)
  const since = new Date(Date.now() - 30_000)
  const resolved = await prisma.trade.findMany({
    where: { sessionId, senderId: countryId, status: { in: ['ACCEPTED', 'REJECTED'] }, createdAt: { gte: since } },
    include: { receiver: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({
    incoming: incoming.map(t => ({ ...t, senderName: t.sender.name })),
    resolved: resolved.map(t => ({ ...t, receiverName: t.receiver.name })),
  })
}

export async function POST(req: Request) {
  const body = await req.json()
  const { sessionId, senderId, receiverId, offerResource, offerAmount, requestResource, requestAmount } = body

  const session = await prisma.session.findUnique({ where: { id: sessionId } })
  if (!session) return NextResponse.json({ error: 'No session' }, { status: 404 })
  if (session.phase !== 'TRADING') return NextResponse.json({ error: 'Not in trading phase' }, { status: 400 })

  const sender = await prisma.country.findUnique({ where: { id: senderId } })
  const receiver = await prisma.country.findUnique({ where: { id: receiverId } })
  if (!sender || !receiver) return NextResponse.json({ error: 'Country not found' }, { status: 404 })

  const senderRelations = JSON.parse(sender.relationsData)
  const receiverRelations = JSON.parse(receiver.relationsData)

  // Check write-off (blockaded) in either direction
  if (senderRelations.writeOff.includes(receiver.name) || receiverRelations.writeOff.includes(sender.name)) {
    return NextResponse.json({ error: 'Trade blocked: blockaded relationship' }, { status: 400 })
  }

  // Check sender has enough
  const senderAmount = sender[offerResource as keyof typeof sender] as number
  if (senderAmount < offerAmount) {
    return NextResponse.json({ error: 'Insufficient resources' }, { status: 400 })
  }

  const trade = await prisma.trade.create({
    data: {
      sessionId,
      senderId,
      receiverId,
      offerResource,
      offerAmount,
      requestResource,
      requestAmount,
      status: 'PENDING',
      year: session.year,
      phase: session.phase
    }
  })

  broadcastUpdate(sessionId, { type: 'TRADE_OFFER', trade, senderName: sender.name, receiverName: receiver.name })
  return NextResponse.json(trade)
}
