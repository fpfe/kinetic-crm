import { NextRequest, NextResponse } from 'next/server'

/**
 * Calendar Sync API
 * POST: Creates/updates a Google Calendar event for a lead follow-up
 * GET:  Fetches upcoming calendar events matching a company name
 *
 * This is a proxy that the frontend calls; the actual Google Calendar
 * operations happen via the MCP connector on the client side.
 * We store the event metadata so the CRM knows which calendar event
 * belongs to which lead.
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { leadId, company, contactName, followUpDate, notes, serviceType } = body

    if (!leadId || !company || !followUpDate) {
      return NextResponse.json(
        { error: 'leadId, company, and followUpDate are required.' },
        { status: 400 }
      )
    }

    // Return the event details for the frontend to create via Google Calendar MCP
    const eventDetails = {
      summary: `Follow-up: ${company}`,
      description: [
        contactName ? `Contact: ${contactName}` : '',
        serviceType ? `Service: ${serviceType}` : '',
        notes ? `Notes: ${notes.slice(0, 500)}` : '',
        `\n---\nHeadout Japan CRM — Lead ID: ${leadId}`,
      ]
        .filter(Boolean)
        .join('\n'),
      startTime: `${followUpDate}T10:00:00`,
      endTime: `${followUpDate}T10:30:00`,
      colorId: '6', // Tangerine — matches our rust accent
    }

    return NextResponse.json(eventDetails)
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    )
  }
}
