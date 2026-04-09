import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { broadcastUpdate } from '@/lib/sse'

export async function POST(req: Request) {
  const body = await req.json()
  const { tradeId, accept } = body

  const trade = await prisma.trade.findUnique({
    where: { id: tradeId },
    include: { sender: true, receiver: true, session: true }
  })
  if (!trade) return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
  if (trade.status !== 'PENDING') return NextResponse.json({ error: 'Trade already resolved' }, { status: 400 })

  if (!accept) {
    const updated = await prisma.trade.update({ where: { id: tradeId }, data: { status: 'REJECTED' } })
    broadcastUpdate(trade.sessionId, { type: 'TRADE_REJECTED', trade: updated })
    return NextResponse.json(updated)
  }

  // Atomic transaction
  const result = await prisma.$transaction(async (tx) => {
    const sender = await tx.country.findUnique({ where: { id: trade.senderId } })
    const receiver = await tx.country.findUnique({ where: { id: trade.receiverId } })
    if (!sender || !receiver) throw new Error('Country not found')

    const senderOfferField = trade.offerResource as keyof typeof sender
    const receiverRequestField = trade.requestResource as keyof typeof receiver

    const senderOfferAmt = sender[senderOfferField] as number
    const receiverRequestAmt = receiver[receiverRequestField] as number

    if (senderOfferAmt < trade.offerAmount) throw new Error('Sender insufficient resources')
    if (receiverRequestAmt < trade.requestAmount) throw new Error('Receiver insufficient resources')

    const updatedSender = await tx.country.update({
      where: { id: trade.senderId },
      data: {
        [trade.offerResource]: { decrement: trade.offerAmount },
        [trade.requestResource]: { increment: trade.requestAmount }
      }
    })

    const updatedReceiver = await tx.country.update({
      where: { id: trade.receiverId },
      data: {
        [trade.offerResource]: { increment: trade.offerAmount },
        [trade.requestResource]: { decrement: trade.requestAmount }
      }
    })

    const updatedTrade = await tx.trade.update({ where: { id: tradeId }, data: { status: 'ACCEPTED' } })
    return { trade: updatedTrade, sender: updatedSender, receiver: updatedReceiver }
  })

  broadcastUpdate(trade.sessionId, { type: 'TRADE_ACCEPTED', ...result })
  return NextResponse.json(result)
}
