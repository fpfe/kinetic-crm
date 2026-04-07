import { NextRequest } from 'next/server'
import { getServiceTypes, addServiceType } from '@/lib/sheets'

export async function GET() {
  try {
    return Response.json(await getServiceTypes())
  } catch (err) {
    return Response.json(
      { error: (err as Error).message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json()
    if (!name || typeof name !== 'string') {
      return Response.json({ error: 'name required' }, { status: 400 })
    }
    const created = await addServiceType(name)
    return Response.json({ name: created }, { status: 201 })
  } catch (err) {
    return Response.json(
      { error: (err as Error).message },
      { status: 500 }
    )
  }
}
