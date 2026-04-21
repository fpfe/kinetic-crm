// Lead source distribution — horizontal bar breakdown for the dashboard
'use client'

import type { Lead } from '@/types'

type Props = {
  leads: Lead[]
}

function colorFor(source: string): string {
  if (source === 'Deep Search') return '#a83900'
  if (source === 'Lead Finder') return '#2563eb'
  return '#6b7280'
}

export default function LeadSourceBreakdown({ leads }: Props) {
  const counts = new Map<string, number>()
  for (const lead of leads) {
    const src = (lead.leadSource || 'Unknown').trim() || 'Unknown'
    counts.set(src, (counts.get(src) ?? 0) + 1)
  }

  const rows = Array.from(counts.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)

  const max = rows.length > 0 ? Math.max(...rows.map((r) => r.count), 1) : 1

  return (
    <div className="bg-white border border-gray-200 rounded-none p-5 xl:col-span-1">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[12px] uppercase tracking-[0.18em] font-bold text-[#5b4137]/60">
          Lead Sources
        </h2>
        <span className="text-[11px] font-bold text-[#181c23]/50 tracking-wider">
          {leads.length} total
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="text-[13px] text-gray-500 py-6 text-center">
          No leads yet.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map((r) => {
            const pct = Math.round((r.count / max) * 100)
            const fill = colorFor(r.source)
            return (
              <div key={r.source}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-bold text-gray-600 uppercase tracking-wider truncate">
                    {r.source}
                  </span>
                  <span className="text-[13px] font-bold text-[#181c23] ml-3">
                    {r.count}
                  </span>
                </div>
                <div
                  className="bg-[#dfe2ed] rounded-none overflow-hidden"
                  style={{ height: 20 }}
                >
                  <div
                    className="h-full rounded-none transition-all"
                    style={{
                      width: `${Math.max(pct, 4)}%`,
                      backgroundColor: fill,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
