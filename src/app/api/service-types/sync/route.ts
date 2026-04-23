import { getServiceTypes, addServiceType } from '@/lib/sheets'
import { DEFAULT_SERVICE_TYPES } from '@/types'

/**
 * POST /api/service-types/sync
 * Ensures all DEFAULT_SERVICE_TYPES exist in the Google Sheet.
 * Does not remove old types — just adds missing new ones.
 */
export async function POST() {
  try {
    const existing = await getServiceTypes()
    const added: string[] = []

    for (const type of DEFAULT_SERVICE_TYPES) {
      if (!existing.includes(type)) {
        await addServiceType(type)
        added.push(type)
      }
    }

    return Response.json({
      ok: true,
      existing: existing.length,
      added,
      total: existing.length + added.length,
    })
  } catch (err) {
    return Response.json(
      { error: (err as Error).message },
      { status: 500 }
    )
  }
}
