import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

const MODEL = 'gemini-2.5-flash'

export type MagicFieldTemplate = {
  id: string
  name: string
  icon: string
  prompt: string
  description: string
}

export const BUILT_IN_TEMPLATES: MagicFieldTemplate[] = [
  {
    id: 'icebreaker',
    name: 'Icebreaker',
    icon: 'ac_unit',
    description: 'A personalized opening line for cold outreach',
    prompt: `この企業へのコールドアウトリーチ用に、1〜2文のアイスブレイカーを日本語で書いてください。
その企業のビジネスについて具体的な点に言及し、Headoutの観光体験プラットフォームとの相性が良い理由を示してください。
直接的かつ具体的に。一般的なお世辞は不要です。
必ず日本語で出力してください。アイスブレイカーのテキストのみを出力し、それ以外は何も書かないでください。`,
  },
  {
    id: 'lead_score',
    name: 'Lead Score',
    icon: 'speed',
    description: 'AI-assessed partnership potential (0-100)',
    prompt: `このリードのHeadout（日本のインバウンド観光体験マーケットプレイス）とのパートナーシップ可能性を0〜100で評価してください。

評価基準:
- 取引価値と収益ポテンシャル (0-25)
- Headoutの観光プラットフォームとの戦略的適合性 (0-25)
- 現在のステータスとメモに基づくステージ進行の可能性 (0-25)
- インバウンド観光客におけるこのサービスタイプの市場需要 (0-25)

必ず以下のJSON形式のみを出力してください: {"score": 数値, "rationale": "日本語で1文の説明"}`,
  },
  {
    id: 'next_action',
    name: 'Next Action',
    icon: 'arrow_forward',
    description: 'Suggested next step based on lead status and history',
    prompt: `このリードの現在のステータス、メモ、取引価値に基づいて、最もインパクトのある次のアクションを1つ提案してください。
具体的かつ実行可能な内容にしてください。「フォローアップする」ではなく「Q3ローンチに向けた料金提案書を送付する」や「予約連携のデモを設定する」のように書いてください。
必ず日本語で出力してください。1〜2文のアクションのみを出力し、ラベルやプレフィックスは不要です。`,
  },
  {
    id: 'research_brief',
    name: 'Research Brief',
    icon: 'search',
    description: 'Quick research summary about the company',
    prompt: `この企業について2〜3文のリサーチブリーフを日本語で書いてください。
含める内容: 事業内容、ターゲット顧客、観光体験マーケットプレイスとの相性が良い理由。
必要に応じてウェブ検索を使用してください。必ず日本語で出力してください。ブリーフのテキストのみを出力してください。`,
  },
]

function buildLeadContext(lead: Record<string, string>): string {
  const parts: string[] = []
  if (lead.company) parts.push(`Company: ${lead.company}`)
  if (lead.contactName) parts.push(`Contact: ${lead.contactName}`)
  if (lead.serviceType) parts.push(`Service Type: ${lead.serviceType}`)
  if (lead.status) parts.push(`Pipeline Status: ${lead.status}`)
  if (lead.region) parts.push(`Region: ${lead.region}`)
  if (lead.dealValue && lead.dealValue !== '0') parts.push(`Deal Value: ¥${lead.dealValue}`)
  if (lead.leadSource) parts.push(`Lead Source: ${lead.leadSource}`)
  if (lead.tags) parts.push(`Tags: ${lead.tags}`)
  if (lead.notes) parts.push(`Notes: ${lead.notes.slice(0, 800)}`)
  return parts.join('\n')
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY is not configured.' }, { status: 500 })
  }

  let body: { lead: Record<string, string>; templateId?: string; customPrompt?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  if (!body.lead?.company) {
    return NextResponse.json({ error: 'Lead with company name is required.' }, { status: 400 })
  }

  // Find the prompt — either built-in template or custom
  let prompt: string
  if (body.customPrompt) {
    prompt = body.customPrompt
  } else if (body.templateId) {
    const template = BUILT_IN_TEMPLATES.find((t) => t.id === body.templateId)
    if (!template) {
      return NextResponse.json({ error: `Unknown template: ${body.templateId}` }, { status: 400 })
    }
    prompt = template.prompt
  } else {
    return NextResponse.json({ error: 'Either templateId or customPrompt is required.' }, { status: 400 })
  }

  const leadContext = buildLeadContext(body.lead)
  const userMessage = `${leadContext}\n\n---\n\n${prompt}`

  const useSearch = body.templateId === 'research_brief' || body.templateId === 'icebreaker'

  const ai = new GoogleGenAI({ apiKey })
  const MAX_RETRIES = 3

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        config: {
          systemInstruction: 'あなたはCRMシステムのAIアシスタントです。指示に正確に従ってください。簡潔で実行可能な内容にしてください。特に指定がない限り、必ず日本語で回答してください。',
          ...(useSearch ? { tools: [{ googleSearch: {} }] } : {}),
        },
      })

      const text =
        response.candidates?.[0]?.content?.parts
          ?.filter((p) => p.text)
          .map((p) => p.text)
          .join('') ?? ''

      if (!text) {
        return NextResponse.json({ error: 'Empty response.' }, { status: 502 })
      }

      return NextResponse.json({ result: text.trim() })
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
