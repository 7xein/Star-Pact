import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('sessionId')
  const year = searchParams.get('year')
  if (!sessionId) return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })

  const checks = await prisma.promiseCheck.findMany({
    where: { sessionId, ...(year ? { year: parseInt(year) } : {}) },
    include: { country: true },
    orderBy: { country: { name: 'asc' } }
  })
  return NextResponse.json(checks)
}
