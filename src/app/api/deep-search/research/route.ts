// Server-side Deep Search endpoint using Google Gemini with Search grounding
import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

const MODEL = 'gemini-2.5-flash'

const SYSTEM_PROMPT = `You are a Headout Japan partnership analyst.

INPUT: a Klook / GetYourGuide / Viator activity title.

TASKS (use web search):
1. Identify the REAL operating company (not the OTA listing). If jointly operated, list all parties with their roles.
2. For each company, find: legal_name_en, legal_name_ja, homepage, hq_address, phone, inquiry_form_url, linkedin_url, likely_decision_maker_role (e.g. "BD / Licensing").
3. Reputation signals: rating (e.g. "4.6 (12k reviews)"), other OTAs they're listed on, recent news (last 12 months, 1-2 sentences).
4. Classify the activity into ONE service_type from this list:
   "Tours & Day Trips", "Cultural Experience", "Theme Park & Entertainment",
   "Food & Dining", "Museum & Gallery", "Outdoor & Sports",
   "Observation & Landmark", "Cruise & Water", "Transport & Pass",
   "Wellness & Spa", "Other"
5. Score partnership attractiveness 0-100 using TWO components:
   A) Base score (0-80): demand, price premium, OTA availability, negotiation leverage, fit with Headout's bundle strategy.
   B) Market demand bonus from DBJ-JTBF 2025 Survey of Western/Australian inbound visitors:
      Tier 1 (+20): Cultural Experience, Food & Dining, Outdoor & Sports
        → Traditional culture 70%+ satisfaction, local cuisine top desire, hiking/ski unique 欧米豪 demand
      Tier 2 (+15): Tours & Day Trips, Wellness & Spa, Observation & Landmark
        → Historical sites + world heritage top desire, onsen Japan-unique night demand
      Tier 3 (+10): Museum & Gallery, Cruise & Water
        → Museum high satisfaction 70%+, night cruise growing demand
      Tier 4 (+5):  Theme Park & Entertainment, Transport & Pass, Other
        → Universal appeal, not Japan-specific differentiator
   Include score_rationale mentioning both the base assessment and the market demand tier.
6. next_action: 1-2 sentences, blunt.

SCHEMA:
{
  "activity_title": string,
  "companies": [
    {
      "legal_name_en": string,
      "legal_name_ja": string | null,
      "role": string,
      "homepage": string | null,
      "hq_address": string | null,
      "phone": string | null,
      "inquiry_form_url": string | null,
      "linkedin_url": string | null,
      "likely_decision_maker_role": string | null
    }
  ],
  "reputation": {
    "rating": string | null,
    "listed_on_otas": string[],
    "recent_news": string | null
  },
  "service_type": string,
  "market_demand_tier": number,
  "score": number,
  "score_rationale": string,
  "next_action": string
}

TONE: blunt, partnership-analyst. No fluff. No emojis.

Respond with ONLY a valid JSON object matching the schema above. No markdown, no \`\`\`json fences, no prose before or after. If a field is unknown, use null. Do not invent data.`

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not configured on the server.' },
      { status: 500 }
    )
  }

  let body: { query?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body.' },
      { status: 400 }
    )
  }

  const query = body.query?.trim()
  if (!query) {
    return NextResponse.json(
      { error: 'Missing required field: query' },
      { status: 400 }
    )
  }

  const ai = new GoogleGenAI({ apiKey })
  const MAX_RETRIES = 3

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: [{ role: 'user', parts: [{ text: query }] }],
        config: {
          systemInstruction: SYSTEM_PROMPT,
          tools: [{ googleSearch: {} }],
        },
      })

      const text =
        response.candidates?.[0]?.content?.parts
          ?.filter((p) => p.text)
          .map((p) => p.text)
          .join('') ?? ''

      if (!text) {
        return NextResponse.json(
          { error: 'Gemini returned an empty response.' },
          { status: 502 }
        )
      }

      return NextResponse.json({ text })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      const isOverloaded = /high demand|unavailable|503|429/i.test(message)
      if (isOverloaded && attempt < MAX_RETRIES - 1) {
        console.log(`[deep-search/research] Gemini busy, retrying (${attempt + 1}/${MAX_RETRIES})...`)
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)))
        continue
      }
      console.error('[deep-search/research] Gemini error:', message)
      return NextResponse.json(
        { error: `Gemini API error: ${message}` },
        { status: 502 }
      )
    }
  }

  return NextResponse.json(
    { error: 'Gemini is temporarily unavailable. Please try again.' },
    { status: 502 }
  )
}
