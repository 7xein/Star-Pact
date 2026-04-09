import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await prisma.session.findFirst({
    orderBy: { createdAt: 'desc' },
    include: {
      countries: true,
    }
  })
  if (!session) return NextResponse.json({ error: 'No session' }, { status: 404 })
  return NextResponse.json(session)
}
