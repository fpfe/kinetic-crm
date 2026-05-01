import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

const MODEL = 'gemini-2.5-flash'

const SYSTEM_PROMPT = `You are a company research assistant for Headout Japan, a tourism experience platform.

INPUT: A company name (and optionally region, service type, and existing notes).

TASK: Research the company using web search and return structured enrichment data.

Find:
1. Official website URL
2. Company description (1-2 sentences, what they do)
3. Japanese company name (if applicable)
4. Key contact person name and role (CEO, founder, BD manager, etc.)
5. Contact email (from website contact page, press page, or public listing)
6. Contact phone (from website)
7. Physical address
8. Social media links (Instagram, Facebook, LinkedIn — whatever exists)
9. Notable facts (awards, press mentions, TripAdvisor ranking, Google rating, number of reviews)
10. Competitor/partner companies in same space

SCHEMA (respond with ONLY this JSON, no markdown fences):
{
  "companyNameJa": string | null,
  "website": string | null,
  "description": string | null,
  "keyContact": {
    "name": string | null,
    "role": string | null,
    "email": string | null,
    "phone": string | null
  },
  "address": string | null,
  "socialLinks": {
    "instagram": string | null,
    "facebook": string | null,
    "linkedin": string | null,
    "tripadvisor": string | null,
    "google_maps": string | null
  },
  "notableFacts": string[],
  "competitors": string[],
  "suggestedTags": string[]
}

RULES:
- Use web search to find real, current data. Do not invent.
- If a field cannot be found, use null.
- suggestedTags: 2-5 lowercase tags relevant to this company (e.g. "knife", "sakai", "workshop", "cultural", "premium")
- notableFacts: 2-4 bullet points of notable information
- competitors: 1-3 similar companies in the same region/category
- TONE: factual, concise. No fluff.`

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not configured.' },
      { status: 500 }
    )
  }

  let body: { company: string; region?: string; serviceType?: string; notes?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const company = body.company?.trim()
  if (!company) {
    return NextResponse.json({ error: 'Missing required field: company' }, { status: 400 })
  }

  // Build context string
  const contextParts = [`Company: ${company}`]
  if (body.region) contextParts.push(`Region: ${body.region}`)
  if (body.serviceType) contextParts.push(`Service type: ${body.serviceType}`)
  if (body.notes) contextParts.push(`Existing notes: ${body.notes.slice(0, 500)}`)
  const userMessage = contextParts.join('\n')

  const ai = new GoogleGenAI({ apiKey })
  const MAX_RETRIES = 3

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
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
        return NextResponse.json({ error: 'Empty response from AI.' }, { status: 502 })
      }

      // Parse JSON from response (strip markdown fences if present)
      const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      try {
        const data = JSON.parse(cleaned)
        return NextResponse.json(data)
      } catch {
        // If JSON parsing fails, return the raw text for debugging
        return NextResponse.json({ error: 'Failed to parse enrichment data', raw: text }, { status: 502 })
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      const isOverloaded = /high demand|unavailable|503|429/i.test(message)
      if (isOverloaded && attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)))
        continue
      }
      return NextResponse.json({ error: `AI error: ${message}` }, { status: 502 })
    }
  }

  return NextResponse.json({ error: 'AI temporarily unavailable.' }, { status: 502 })
}
