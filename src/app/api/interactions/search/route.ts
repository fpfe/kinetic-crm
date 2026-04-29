import { NextRequest } from 'next/server'
import { searchInteractions } from '@/lib/sheets'

/**
 * GET /api/interactions/search?q=pricing
 * Returns an array of leadIds whose interactions match the query.
 */
export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q')?.trim()
    if (!q) return Response.json([])
    const leadIds = await searchInteractions(q)
    return Response.json(leadIds)
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
