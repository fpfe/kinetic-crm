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
4. Score partnership attractiveness 0-100 based on: demand, price premium, OTA availability, negotiation leverage, fit with Headout's bundle strategy. Include a 1-sentence score_rationale.
5. next_action: 1-2 sentences, blunt.

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

  try {
    const ai = new GoogleGenAI({ apiKey })

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
    console.error('[deep-search/research] Gemini error:', message)
    return NextResponse.json(
      { error: `Gemini API error: ${message}` },
      { status: 502 }
    )
  }
}
