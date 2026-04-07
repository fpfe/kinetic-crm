import { NextRequest } from 'next/server'
import { updateLead, deleteLead } from '@/lib/sheets'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const lead = await updateLead(id, body)
    if (!lead) return Response.json({ error: 'not found' }, { status: 404 })
    return Response.json(lead)
  } catch (err) {
    return Response.json(
      { error: (err as Error).message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ok = await deleteLead(id)
    if (!ok) return Response.json({ error: 'not found' }, { status: 404 })
    return Response.json({ ok: true })
  } catch (err) {
    return Response.json(
      { error: (err as Error).message },
      { status: 500 }
    )
  }
}
