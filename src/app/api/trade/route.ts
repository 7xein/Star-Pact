import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { broadcastUpdate } from '@/lib/sse'

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

  // Check write-off in either direction
  if (senderRelations.writeOff.includes(receiver.name) || receiverRelations.writeOff.includes(sender.name)) {
    return NextResponse.json({ error: 'Trade blocked: write-off relationship' }, { status: 400 })
  }

  // Check all-right cap (2 units per resource)
  const isAllRight = senderRelations.allRight.includes(receiver.name) || receiverRelations.allRight.includes(sender.name)
  if (isAllRight) {
    if (offerAmount > 2 || requestAmount > 2) {
      return NextResponse.json({ error: 'Diplomatic Clearance: max 2 units per resource' }, { status: 400 })
    }
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
