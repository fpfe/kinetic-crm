import { NextRequest } from 'next/server'
import { getLeads, createLead } from '@/lib/sheets'

export async function GET() {
  try {
    const leads = await getLeads()
    return Response.json(leads)
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
    const lead = await createLead(body)
    return Response.json(lead, { status: 201 })
  } catch (err) {
    return Response.json(
      { error: (err as Error).message },
      { status: 500 }
    )
  }
}
