'use client'

import { useMemo } from 'react'
import type { Lead } from '@/types'

const SOURCE_COLORS = [
  '#a83900',
  '#378ADD',
  '#1D9E75',
  '#BA7517',
  '#685588',
  '#b60056',
  '#5F5E5A',
  '#ef4444',
]

type SourceData = {
  source: string
  count: number
  percentage: number
  color: string
}

export default function LeadSourceChart({ leads }: { leads: Lead[] }) {
  const sources: SourceData[] = useMemo(() => {
    const counts = new Map<string, number>()
    for (const l of leads) {
      const src = l.leadSource || 'Unknown'
      counts.set(src, (counts.get(src) || 0) + 1)
    }
    const total = leads.length
    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
    return sorted.map(([source, count], i) => ({
      source,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      color: SOURCE_COLORS[i % SOURCE_COLORS.length],
    }))
  }, [leads])

  const total = leads.length

  // Build SVG donut chart
  const radius = 70
  const strokeWidth = 28
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="rounded-none p-6 bg-white">
      <h2
        className="font-display text-[#181c23] mb-6"
        style={{ fontSize: '1.25rem', fontWeight: 700 }}
      >
        Lead Sources
      </h2>

      {sources.length === 0 ? (
        <div className="py-8 text-center text-gray-400 text-sm">
          No data for selected filters
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6">
          {/* Donut */}
          <div className="relative">
            <svg width="180" height="180" viewBox="0 0 180 180">
              {sources.map((s) => {
                const dashLength = (s.count / total) * circumference
                const dashGap = circumference - dashLength
                const currentOffset = offset
                offset += dashLength

                return (
                  <circle
                    key={s.source}
                    cx="90"
                    cy="90"
                    r={radius}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${dashLength} ${dashGap}`}
                    strokeDashoffset={-currentOffset}
                    transform="rotate(-90 90 90)"
                  />
                )
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[24px] font-extrabold text-[#181c23]">
                {total}
              </span>
              <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">
                Total
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="w-full flex flex-col gap-2">
            {sources.map((s) => (
              <div key={s.source} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-none shrink-0"
                    style={{ background: s.color }}
                  />
                  <span className="text-[12px] font-medium text-[#181c23]">
                    {s.source}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[12px] font-bold text-[#181c23]">
                    {s.count}
                  </span>
                  <span className="text-[11px] text-gray-400 w-8 text-right">
                    {s.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
