'use client'

import { useState, useCallback } from 'react'
import type { Lead } from '@/types'
import { useToast } from '@/components/ui/Toast'

type MagicTemplate = {
  id: string
  name: string
  icon: string
  description: string
}

const TEMPLATES: MagicTemplate[] = [
  { id: 'icebreaker', name: 'Icebreaker', icon: 'ac_unit', description: 'Personalized opening line for cold outreach' },
  { id: 'lead_score', name: 'Lead Score', icon: 'speed', description: 'AI-assessed partnership potential (0-100)' },
  { id: 'next_action', name: 'Next Action', icon: 'arrow_forward', description: 'Suggested next step based on lead status' },
  { id: 'research_brief', name: 'Research Brief', icon: 'search', description: 'Quick company research summary' },
]

type MagicResult = {
  leadId: string
  templateId: string
  result: string
}

type Props = {
  open: boolean
  leads: Lead[]
  onClose: () => void
}

export default function MagicFieldsPanel({ open, leads, onClose }: Props) {
  const { toastSuccess, toastError } = useToast()
  const [activeTemplate, setActiveTemplate] = useState<string>('icebreaker')
  const [results, setResults] = useState<MagicResult[]>([])
  const [generating, setGenerating] = useState<Set<string>>(new Set())
  const [bulkGenerating, setBulkGenerating] = useState(false)

  const generateForLead = useCallback(async (lead: Lead, templateId: string) => {
    const key = `${lead.id}:${templateId}`
    setGenerating((prev) => new Set(prev).add(key))
    try {
      const res = await fetch('/api/leads/magic-field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead, templateId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Generation failed')
      setResults((prev) => {
        const filtered = prev.filter((r) => !(r.leadId === lead.id && r.templateId === templateId))
        return [...filtered, { leadId: lead.id, templateId, result: json.result }]
      })
    } catch (err) {
      toastError(`${lead.company}: ${(err as Error).message}`)
    } finally {
      setGenerating((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }, [toastError])

  const generateAll = useCallback(async () => {
    setBulkGenerating(true)
    let count = 0
    for (const lead of leads.slice(0, 20)) {
      // Skip if already has result
      const existing = results.find((r) => r.leadId === lead.id && r.templateId === activeTemplate)
      if (existing) continue
      await generateForLead(lead, activeTemplate)
      count++
      // Rate limit
      if (count < leads.length) {
        await new Promise((r) => setTimeout(r, 500))
      }
    }
    setBulkGenerating(false)
    toastSuccess(`Generated ${activeTemplate} for ${count} lead(s)`)
  }, [leads, activeTemplate, results, generateForLead, toastSuccess])

  const getResult = (leadId: string, templateId: string) =>
    results.find((r) => r.leadId === leadId && r.templateId === templateId)

  const isGenerating = (leadId: string, templateId: string) =>
    generating.has(`${leadId}:${templateId}`)

  const copyResult = (text: string) => {
    navigator.clipboard.writeText(text)
    toastSuccess('Copied to clipboard')
  }

  if (!open) return null

  const activeTemplateMeta = TEMPLATES.find((t) => t.id === activeTemplate)!

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        className="relative bg-white rounded-none w-full max-w-4xl max-h-[85vh] flex flex-col"
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.15)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #e5e8f3' }}>
          <div>
            <div className="text-[10px] tracking-[0.18em] uppercase font-bold text-[#a83900]">
              AI-Powered
            </div>
            <h2 className="text-[16px] font-bold text-[#181c23] mt-0.5">
              Magic Fields
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-[#181c23]"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        {/* Template selector */}
        <div className="flex items-center gap-2 px-6 py-3" style={{ borderBottom: '1px solid #f0f0ed' }}>
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTemplate(t.id)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-bold transition-colors"
              style={{
                background: activeTemplate === t.id ? '#a83900' : 'transparent',
                color: activeTemplate === t.id ? 'white' : '#888780',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{t.icon}</span>
              {t.name}
            </button>
          ))}
          <div className="flex-1" />
          <button
            type="button"
            onClick={generateAll}
            disabled={bulkGenerating}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[12px] font-bold text-white rounded-none disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #a83900 0%, #ff5a00 100%)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>auto_awesome</span>
            {bulkGenerating ? 'Generating...' : `Generate All (${Math.min(leads.length, 20)})`}
          </button>
        </div>

        {/* Description */}
        <div className="px-6 py-2 text-[12px] text-gray-400">
          {activeTemplateMeta.description} — click per row or "Generate All" for batch
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto px-6 pb-4">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider font-bold text-gray-400" style={{ borderBottom: '1px solid #f0f0ed' }}>
                <th className="text-left py-2 pr-3" style={{ width: 200 }}>Company</th>
                <th className="text-left py-2 pr-3" style={{ width: 100 }}>Status</th>
                <th className="text-left py-2 pr-3">
                  <span className="inline-flex items-center gap-1">
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{activeTemplateMeta.icon}</span>
                    {activeTemplateMeta.name}
                  </span>
                </th>
                <th className="text-right py-2" style={{ width: 80 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {leads.slice(0, 50).map((lead) => {
                const result = getResult(lead.id, activeTemplate)
                const loading = isGenerating(lead.id, activeTemplate)

                // Parse lead score if applicable
                let scoreDisplay: React.ReactNode = null
                if (activeTemplate === 'lead_score' && result) {
                  try {
                    const parsed = JSON.parse(result.result)
                    const score = parsed.score
                    const color = score >= 70 ? '#1D9E75' : score >= 40 ? '#BA7517' : '#dc2626'
                    scoreDisplay = (
                      <div className="flex items-center gap-2">
                        <span className="text-[18px] font-extrabold" style={{ color }}>{score}</span>
                        <span className="text-[11px] text-gray-500">{parsed.rationale}</span>
                      </div>
                    )
                  } catch {
                    scoreDisplay = <span className="text-[13px]">{result.result}</span>
                  }
                }

                return (
                  <tr key={lead.id} style={{ borderBottom: '1px solid #f8f8f5' }}>
                    <td className="py-2.5 pr-3">
                      <div className="font-semibold text-[#181c23] truncate">{lead.company}</div>
                      <div className="text-[11px] text-gray-400 truncate">{lead.contactName}</div>
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className="text-[11px] font-semibold text-gray-500">{lead.status}</span>
                    </td>
                    <td className="py-2.5 pr-3">
                      {loading ? (
                        <div className="flex items-center gap-2 text-[12px] text-gray-400">
                          <div className="flex gap-1">
                            {[0, 1, 2].map((i) => (
                              <div
                                key={i}
                                className="w-1.5 h-1.5 rounded-none bg-[#a83900]"
                                style={{ animation: 'pulse 1.2s infinite', animationDelay: `${i * 0.2}s` }}
                              />
                            ))}
                          </div>
                          Generating...
                        </div>
                      ) : result ? (
                        activeTemplate === 'lead_score' && scoreDisplay ? (
                          scoreDisplay
                        ) : (
                          <div className="text-[13px] text-[#181c23] leading-snug">
                            {result.result}
                          </div>
                        )
                      ) : (
                        <span className="text-[12px] text-gray-300 italic">Not generated</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {result && (
                          <button
                            type="button"
                            onClick={() => copyResult(activeTemplate === 'lead_score' ? result.result : result.result)}
                            className="p-1 text-gray-400 hover:text-[#a83900] transition-colors"
                            title="Copy"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>content_copy</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => generateForLead(lead, activeTemplate)}
                          disabled={loading || bulkGenerating}
                          className="p-1 text-gray-400 hover:text-[#a83900] transition-colors disabled:opacity-30"
                          title={result ? 'Regenerate' : 'Generate'}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                            {result ? 'refresh' : 'auto_awesome'}
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {leads.length > 50 && (
            <div className="text-center text-[12px] text-gray-400 py-3">
              Showing first 50 of {leads.length} leads
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
