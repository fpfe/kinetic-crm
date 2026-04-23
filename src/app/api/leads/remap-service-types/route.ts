import { getLeads, updateLead } from '@/lib/sheets'

/**
 * POST /api/leads/remap-service-types
 *
 * One-time migration: maps old messy serviceType values
 * to the new standardized categories.
 * Safe to run multiple times — skips leads that already
 * have a valid new category.
 */

const NEW_CATEGORIES = [
  'Tours & Day Trips',
  'Cultural Experience',
  'Theme Park & Entertainment',
  'Food & Dining',
  'Museum & Gallery',
  'Outdoor & Sports',
  'Observation & Landmark',
  'Cruise & Water',
  'Transport & Pass',
  'Wellness & Spa',
  'Other',
]

/** Map old value → new category. Case-insensitive matching. */
function remapServiceType(old: string): string | null {
  if (!old) return 'Other'
  const lower = old.toLowerCase().trim()

  // Already a valid new category
  if (NEW_CATEGORIES.some((c) => c.toLowerCase() === lower)) return null

  // Tours & Day Trips
  if (
    lower.includes('tour') ||
    lower.includes('day trip') ||
    lower.includes('sightseeing') ||
    lower === 'animation tour' ||
    lower === 'tour operator'
  )
    return 'Tours & Day Trips'

  // Cultural Experience
  if (
    lower.includes('cultural') ||
    lower.includes('tea ceremony') ||
    lower.includes('traditional arts') ||
    lower.includes('workshop') ||
    lower.includes('kimono') ||
    lower.includes('heritage')
  )
    return 'Cultural Experience'

  // Theme Park & Entertainment
  if (
    lower.includes('entertainment') ||
    lower.includes('theme park') ||
    lower.includes('go kart') ||
    lower.includes('amusement') ||
    lower.includes('game') ||
    lower.includes('show')
  )
    return 'Theme Park & Entertainment'

  // Food & Dining
  if (
    lower.includes('food') ||
    lower.includes('dining') ||
    lower.includes('restaurant') ||
    lower.includes('sushi') ||
    lower.includes('cooking') ||
    lower.includes('ramen') ||
    lower.includes('izakaya')
  )
    return 'Food & Dining'

  // Museum & Gallery
  if (
    lower.includes('museum') ||
    lower.includes('gallery') ||
    lower.includes('aquarium') ||
    lower.includes('art collective') ||
    lower.includes('national institute')
  )
    return 'Museum & Gallery'

  // Outdoor & Sports
  if (
    lower.includes('outdoor') ||
    lower.includes('sport') ||
    lower.includes('rafting') ||
    lower.includes('hiking') ||
    lower.includes('cycling') ||
    lower.includes('adventure')
  )
    return 'Outdoor & Sports'

  // Observation & Landmark
  if (
    lower.includes('observation') ||
    lower.includes('landmark') ||
    lower.includes('tower') ||
    lower.includes('skytree')
  )
    return 'Observation & Landmark'

  // Cruise & Water
  if (
    lower.includes('cruise') ||
    lower.includes('boat') ||
    lower.includes('water')
  )
    return 'Cruise & Water'

  // Transport & Pass
  if (
    lower.includes('transport') ||
    lower.includes('train') ||
    lower.includes('pass') ||
    lower.includes('airport') ||
    lower.includes('transfer') ||
    lower.includes('sim')
  )
    return 'Transport & Pass'

  // Wellness & Spa
  if (
    lower.includes('onsen') ||
    lower.includes('spa') ||
    lower.includes('massage') ||
    lower.includes('wellness')
  )
    return 'Wellness & Spa'

  // Operator (generic) — check what the lead does from context
  if (lower.startsWith('operator')) {
    // If it mentions specific activities, try to match
    if (lower.includes('sushi') || lower.includes('cook') || lower.includes('food'))
      return 'Food & Dining'
    if (lower.includes('museum') || lower.includes('national') || lower.includes('heritage'))
      return 'Museum & Gallery'
    if (lower.includes('art'))
      return 'Museum & Gallery'
    // Generic operator → Tours & Day Trips as default
    return 'Tours & Day Trips'
  }

  // Activity Provider / Venue
  if (
    lower.includes('activity provider') ||
    lower.includes('venue')
  )
    return 'Theme Park & Entertainment'

  // Fallback
  return 'Other'
}

export async function POST() {
  try {
    const leads = await getLeads()
    const updates: { id: string; from: string; to: string }[] = []
    const skipped: string[] = []

    for (const lead of leads) {
      const newType = remapServiceType(lead.serviceType)
      if (newType === null) {
        // Already valid
        skipped.push(lead.serviceType)
        continue
      }
      if (newType === lead.serviceType) {
        skipped.push(lead.serviceType)
        continue
      }
      updates.push({ id: lead.id, from: lead.serviceType, to: newType })
    }

    // Apply updates (with delay to avoid Google Sheets rate limits)
    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))
    for (let i = 0; i < updates.length; i++) {
      const u = updates[i]
      await updateLead(u.id, { serviceType: u.to })
      // Wait 500ms between each update to stay under quota
      if (i < updates.length - 1) await delay(500)
    }

    return Response.json({
      ok: true,
      totalLeads: leads.length,
      updated: updates.length,
      skipped: skipped.length,
      changes: updates.map((u) => `"${u.from}" → "${u.to}"`),
    })
  } catch (err) {
    return Response.json(
      { error: (err as Error).message },
      { status: 500 }
    )
  }
}
