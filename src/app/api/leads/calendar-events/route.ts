import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

/**
 * GET /api/leads/calendar-events?company=...&startTime=...&endTime=...
 * Searches Google Calendar for events matching a company name.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const company = searchParams.get('company')
  const startTime = searchParams.get('startTime')
  const endTime = searchParams.get('endTime')

  if (!company) {
    return NextResponse.json({ error: 'company is required' }, { status: 400 })
  }

  try {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY

    // If no service account creds, return empty (calendar events are supplementary)
    if (!email || !key) {
      return NextResponse.json({ events: [] })
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: email,
        private_key: key.replace(/\\\\n/g, '\n').replace(/\\n/g, '\n').trim(),
      },
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    })

    const calendar = google.calendar({ version: 'v3', auth })
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary'

    const res = await calendar.events.list({
      calendarId,
      q: company,
      timeMin: startTime || new Date().toISOString(),
      timeMax: endTime || new Date(Date.now() + 90 * 86400000).toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    })

    const events = (res.data.items || []).map((evt) => ({
      id: evt.id,
      summary: evt.summary || '',
      start: evt.start?.dateTime || evt.start?.date || '',
      end: evt.end?.dateTime || evt.end?.date || '',
      description: evt.description || '',
      htmlLink: evt.htmlLink || '',
    }))

    return NextResponse.json({ events })
  } catch (err) {
    console.error('[calendar-events] Failed to fetch events:', err)
    // Don't fail hard — calendar events are supplementary
    return NextResponse.json({ events: [] })
  }
}
