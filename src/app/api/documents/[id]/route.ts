import { NextRequest } from 'next/server'
import { deleteDocument } from '@/lib/sheets'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ok = await deleteDocument(id)
    if (!ok) return Response.json({ error: 'not found' }, { status: 404 })
    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
