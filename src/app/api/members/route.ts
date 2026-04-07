import { NextRequest } from 'next/server'
import { getMembers, createMember } from '@/lib/sheets'

export async function GET() {
  try {
    return Response.json(await getMembers())
  } catch (err) {
    return Response.json(
      { error: (err as Error).message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.name) {
      return Response.json({ error: 'name required' }, { status: 400 })
    }
    const member = await createMember(body)
    return Response.json(member, { status: 201 })
  } catch (err) {
    return Response.json(
      { error: (err as Error).message },
      { status: 500 }
    )
  }
}
