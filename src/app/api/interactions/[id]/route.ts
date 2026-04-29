import { NextRequest } from 'next/server'
import { updateInteraction, deleteInteraction } from '@/lib/sheets'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const patch = await request.json()
    const updated = await updateInteraction(id, patch)
    if (!updated) return Response.json({ error: 'not found' }, { status: 404 })
    return Response.json(updated)
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ok = await deleteInteraction(id)
    if (!ok) return Response.json({ error: 'not found' }, { status: 404 })
    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
