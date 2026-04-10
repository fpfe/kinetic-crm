import { NextRequest } from 'next/server'
import { getNotesByLeadId, getAllNotes, createNote } from '@/lib/sheets'

export async function GET(request: NextRequest) {
  try {
    const leadId = request.nextUrl.searchParams.get('leadId')
    if (!leadId) return Response.json(await getAllNotes())
    return Response.json(await getNotesByLeadId(leadId))
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const item = await createNote(body)
    return Response.json(item, { status: 201 })
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
