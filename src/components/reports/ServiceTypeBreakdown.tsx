'use client'

import { useMemo } from 'react'
import type { Lead } from '@/types'

const SERVICE_TYPE_COLORS: Record<string, string> = {
  'Tours & Day Trips': '#378ADD',
  'Cultural Experience': '#685588',
  'Theme Park & Entertainment': '#a83900',
  'Food & Dining': '#BA7517',
  'Museum & Gallery': '#1D9E75',
  'Outdoor & Sports': '#3B6D11',
  'Observation & Landmark': '#854F0B',
  'Cruise & Water': '#185FA5',
  'Transport & Pass': '#5F5E5A',
  'Wellness & Spa': '#b60056',
  Other: '#888780',
}

function getColor(type: string): string {
  return SERVICE_TYPE_COLORS[type] || '#888780'
}

type Row = {
  type: string
  count: number
  percentage: number
  wonCount: number
  cvr: number
  color: string
}

export default function ServiceTypeBreakdown({ leads }: { leads: Lead[] }) {
  const rows: Row[] = useMemo(() => {
    const groups = new Map<string, Lead[]>()
    for (const l of leads) {
      const key = l.serviceType || 'Other'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(l)
    }
    const total = leads.length
    const out: Row[] = []
    groups.forEach((items, type) => {
      const wonCount = items.filter((l) => l.status === 'Closed Won').length
      const closedCount = items.filter(
        (l) => l.status === 'Closed Won' || l.status === 'Closed Lost'
      ).length
      out.push({
        type,
        count: items.length,
        percentage: total > 0 ? Math.round((items.length / total) * 100) : 0,
        wonCount,
        cvr: closedCount > 0 ? Math.round((wonCount / closedCount) * 100) : 0,
        color: getColor(type),
      })
    })
    out.sort((a, b) => b.count - a.count)
    return out
  }, [leads])

  const maxCount = Math.max(...rows.map((r) => r.count), 1)

  return (
    <div className="rounded-none p-6 bg-white">
      <div className="flex items-center justify-between mb-5">
        <h2
          className="font-display text-[#181c23]"
          style={{ fontSize: '1.25rem', fontWeight: 700 }}
        >
          Leads by service type
        </h2>
        <span className="text-[11px] text-gray-400">
          {leads.length} leads · {rows.length} categories
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="py-8 text-center text-gray-400 text-sm">
          No data for selected filters
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {/* Header */}
          <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">
            <div style={{ width: 200, flexShrink: 0 }}>Category</div>
            <div className="flex-1" />
            <div style={{ width: 50, textAlign: 'right' }}>Count</div>
            <div style={{ width: 40, textAlign: 'right' }}>%</div>
            <div style={{ width: 40, textAlign: 'right' }}>Won</div>
          </div>

          {rows.map((r) => (
            <div
              key={r.type}
              className="flex items-center gap-3 py-1.5 group"
            >
              {/* Category name with color dot */}
              <div className="flex items-center gap-2" style={{ width: 200, flexShrink: 0 }}>
                <span
                  className="w-2.5 h-2.5 rounded-none shrink-0"
                  style={{ background: r.color }}
                />
                <span
                  className="text-[13px] font-semibold text-[#181c23] truncate"
                  title={r.type}
                >
                  {r.type}
                </span>
              </div>

              {/* Bar */}
              <div className="flex-1 h-7 bg-gray-50 rounded-none overflow-hidden">
                <div
                  className="h-full rounded-none transition-all"
                  style={{
                    width: `${(r.count / maxCount) * 100}%`,
                    background: r.color,
                    opacity: 0.75,
                    minWidth: r.count > 0 ? 4 : 0,
                  }}
                />
              </div>

              {/* Count */}
              <div
                className="text-[13px] font-bold text-[#181c23]"
                style={{ width: 50, textAlign: 'right' }}
              >
                {r.count}
              </div>

              {/* Percentage */}
              <div
                className="text-[12px] text-gray-400"
                style={{ width: 40, textAlign: 'right' }}
              >
                {r.percentage}%
              </div>

              {/* Won count */}
              <div
                className="text-[12px] font-semibold"
                style={{
                  width: 40,
                  textAlign: 'right',
                  color: r.wonCount > 0 ? '#a83900' : '#d1d5db',
                }}
              >
                {r.wonCount}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
