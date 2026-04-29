// Lead Finder search — server-side, powered by Gemini + Google Search grounding
import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

const MODEL = 'gemini-2.5-flash'

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not configured on the server.' },
      { status: 500 }
    )
  }

  let body: { keywords?: string; city?: string; existingNames?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const keywords = body.keywords?.trim()
  const city = body.city?.trim() || 'Tokyo'
  const existingNames = body.existingNames || '(none)'

  if (!keywords) {
    return NextResponse.json(
      { error: 'Missing required field: keywords' },
      { status: 400 }
    )
  }

  const systemPrompt = `You are a business development researcher for Headout, an experience OTA whose primary inbound tourist segments are European, American, and Middle Eastern travelers to Japan.

Search the web and find REAL, EXISTING experience operators in ${city}, Japan matching: "${keywords}".

CRITICAL RELEVANCE RULE:
Every company you return MUST directly operate or offer experiences matching the search query "${keywords}".
- If the query is "Japanese Garden", return ONLY companies that operate Japanese gardens or garden tours.
- If the query is "Food & Dining", return ONLY restaurants, food tour operators, cooking classes, etc.
- Do NOT return unrelated operators. A go-kart company is NOT relevant to a garden query.
- If fewer than 5 relevant operators exist, return fewer. Quality over quantity.

Rules:
- Only return companies verified via web search. Do NOT hallucinate.
- Return null for any contact details not findable - do not guess.
- Return 5-8 companies (fewer is OK if not enough relevant ones exist).
- Return ONLY a raw JSON array. No markdown, no backticks. Start with [ end with ].

SCORING (0-100):
Classify each company into ONE service_type: "Tours & Day Trips", "Cultural Experience", "Theme Park & Entertainment", "Food & Dining", "Museum & Gallery", "Outdoor & Sports", "Observation & Landmark", "Cruise & Water", "Transport & Pass", "Wellness & Spa", "Other".

Score = Base (0-80) + Market Demand Bonus.
Base score factors: demand, price premium, OTA availability, negotiation leverage, fit with Headout's bundle strategy.
Market demand bonus (from DBJ-JTBF 2025 Survey of Western/Australian inbound visitors):
  Tier 1 (+20): Cultural Experience, Food & Dining, Outdoor & Sports
    → Traditional culture 70%+ satisfaction, local cuisine top desire, hiking/ski unique demand
  Tier 2 (+15): Tours & Day Trips, Wellness & Spa, Observation & Landmark
    → Historical sites + world heritage top desire, onsen Japan-unique night demand
  Tier 3 (+10): Museum & Gallery, Cruise & Water
    → Museum high satisfaction 70%+, night cruise growing demand
  Tier 4 (+5): Theme Park & Entertainment, Transport & Pass, Other
    → Universal appeal, not Japan-specific differentiator

Schema per company:
{
  "id": "unique-slug",
  "name": "English company name",
  "name_jp": "Japanese name or null",
  "website": "https://...",
  "city": "${city}",
  "category": "${keywords}",
  "service_type": "one of the service types above",
  "market_demand_tier": 1-4,
  "description": "2-3 factual sentences",
  "experience_types": ["..."],
  "inbound_strategy": "string or null",
  "recent_news": "string or null",
  "klook_listed": true,
  "klook_url": "string or null",
  "klook_gap": "string",
  "priority_tourists": ["Europe","US","Middle East"],
  "priority_score": 0-100,
  "score_rationale": "1 sentence: base assessment + market demand tier justification",
  "contact_person": "string or null",
  "contact_email": "string or null",
  "contact_phone": "string or null",
  "address": "string"
}

Skip companies already in this list (case-insensitive name match): ${existingNames}`

  const ai = new GoogleGenAI({ apiKey })
  const MAX_RETRIES = 3

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: [
          {
            role: 'user',
            parts: [{ text: `Find ${keywords} operators in ${city}.` }],
          },
        ],
        config: {
          systemInstruction: systemPrompt,
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
        console.log(`[lead-finder/search] Gemini busy, retrying (${attempt + 1}/${MAX_RETRIES})...`)
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)))
        continue
      }
      console.error('[lead-finder/search] Gemini error:', message)
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
