// Lead Finder email generation — server-side, powered by Gemini
import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { readFileSync } from 'fs'
import { join } from 'path'

const MODEL = 'gemini-2.5-flash'

// Load the cold email style guide (updated by user feedback)
let STYLE_GUIDE = ''
try {
  STYLE_GUIDE = readFileSync(
    join(process.cwd(), 'src/config/cold-email-style.md'),
    'utf-8'
  )
} catch {
  console.warn('[lead-finder/email] cold-email-style.md not found, using defaults')
}

/** Strip LINE messages, follow-ups, and anything else after the email signature */
function cleanEmailOutput(raw: string): string {
  const lines = raw.split('\n')
  const result: string[] = []
  let signatureLineCount = 0

  for (const line of lines) {
    // Stop at separator lines (---, ===, ___ etc.)
    if (/^[-=_]{3,}\s*$/.test(line.trim()) && result.length > 3) {
      break
    }
    // Stop at LINE message indicators
    if (/^(LINE|ライン|LINEメッセージ)/i.test(line.trim())) {
      break
    }

    // Detect signature — both formats:
    // Japanese: "安 承俊（アン スンジュン）" or English: "Seungjun Ahn | Head of BD Japan | Headout"
    const isSigLine =
      /安\s*承俊/.test(line) ||
      /アン\s*スンジュン/.test(line) ||
      /Seungjun.*Ahn/i.test(line)

    if (isSigLine) {
      signatureLineCount++
      result.push(line)
      // Allow up to 2 signature lines (e.g., title + name), then stop
      if (signatureLineCount >= 2) break
      continue
    }

    // If we already started the signature block, only allow more signature lines or blank lines
    if (signatureLineCount > 0 && line.trim().length > 0) {
      // Check if this could be part of the sig (title line like "Headout 日本事業開発本部長")
      if (/Headout|日本事業開発/i.test(line)) {
        result.push(line)
        signatureLineCount++
        continue
      }
      break
    }

    result.push(line)
  }

  return result.join('\n').trim()
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not configured on the server.' },
      { status: 500 }
    )
  }

  let body: {
    companyName?: string
    city?: string
    description?: string
    whyCompany?: string
    whyHeadout?: string
    meetingDates?: string
    otherNotes?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const companyName = body.companyName?.trim()
  if (!companyName) {
    return NextResponse.json(
      { error: 'Missing required field: companyName' },
      { status: 400 }
    )
  }

  const systemPrompt = `以下のスタイルガイドに厳密に従って、コールドメールを1通だけ作成してください。

=== スタイルガイド ===
${STYLE_GUIDE}
=== スタイルガイド終了 ===

=== 今回のメール情報 ===
送付先: ${companyName}（${body.city || '日本'}）
相手の情報: ${body.description ?? ''}
この会社を選んだ理由: ${body.whyCompany ?? ''}
Headoutが役立てる点: ${body.whyHeadout ?? ''}
希望日程: ${body.meetingDates ?? ''}
その他: ${body.otherNotes ?? ''}

【最重要ルール】出力はメール本文のみ。「件名:」から署名まで。署名の後は何も書かないこと。LINE版・フォローアップ・代替案・区切り線(---)は一切禁止。`

  const ai = new GoogleGenAI({ apiKey })
  const MAX_RETRIES = 3

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: [
          { role: 'user', parts: [{ text: 'メールを作成してください。メール本文のみ出力し、それ以外は何も書かないでください。' }] },
        ],
        config: {
          systemInstruction: systemPrompt,
        },
      })

      let text =
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

      // HARD CLEANUP: strip everything after the signature or "---" separator
      text = cleanEmailOutput(text)

      return NextResponse.json({ text })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      const isOverloaded = /high demand|unavailable|503|429/i.test(message)
      if (isOverloaded && attempt < MAX_RETRIES - 1) {
        console.log(`[lead-finder/email] Gemini busy, retrying (${attempt + 1}/${MAX_RETRIES})...`)
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)))
        continue
      }
      console.error('[lead-finder/email] Gemini error:', message)
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
