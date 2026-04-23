'use client'

import { useMemo } from 'react'
import type { Lead } from '@/types'
import { LEAD_STATUSES } from '@/types'

const STAGE_COLORS: Record<string, string> = {
  New: '#9ca3af',
  Contacted: '#378ADD',
  Qualified: '#1D9E75',
  'Proposal Sent': '#BA7517',
  Negotiation: '#685588',
  'Closed Won': '#a83900',
  'Closed Lost': '#5F5E5A',
}

// Active pipeline stages (excluding Closed Lost for funnel flow)
const FUNNEL_STAGES = LEAD_STATUSES.filter((s) => s !== 'Closed Lost')

type StageData = {
  label: string
  count: number
  cumulativeReached: number // leads that reached this stage or beyond
  barWidth: number
  color: string
}

type TransitionData = {
  from: string
  to: string
  fromCount: number
  toCount: number
  cvr: number
  dropOff: number
  isBottleneck: boolean
}

export default function ConversionFunnel({ leads }: { leads: Lead[] }) {
  // Count leads at each stage
  const rawCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const s of LEAD_STATUSES) counts[s] = 0
    for (const l of leads) {
      if (counts[l.status] !== undefined) counts[l.status]++
    }
    return counts
  }, [leads])

  // Calculate cumulative reach: how many leads reached each stage or beyond
  // A lead at "Negotiation" has passed through New, Contacted, Qualified, Proposal Sent
  const stages: StageData[] = useMemo(() => {
    const stageOrder = FUNNEL_STAGES
    const result: StageData[] = []

    for (let i = 0; i < stageOrder.length; i++) {
      // Cumulative: count of leads currently at this stage or any later stage
      let cumulative = 0
      for (let j = i; j < LEAD_STATUSES.length; j++) {
        cumulative += rawCounts[LEAD_STATUSES[j]] || 0
      }

      result.push({
        label: stageOrder[i],
        count: rawCounts[stageOrder[i]] || 0,
        cumulativeReached: cumulative,
        barWidth: 0,
        color: STAGE_COLORS[stageOrder[i]] || '#9ca3af',
      })
    }

    // Calculate bar widths relative to max cumulative
    const maxCumulative = Math.max(...result.map((s) => s.cumulativeReached), 1)
    for (const s of result) {
      s.barWidth = (s.cumulativeReached / maxCumulative) * 100
    }

    return result
  }, [rawCounts])

  // Calculate stage-to-stage transitions
  const transitions: TransitionData[] = useMemo(() => {
    const result: TransitionData[] = []
    for (let i = 0; i < stages.length - 1; i++) {
      const from = stages[i]
      const to = stages[i + 1]
      const fromCount = from.cumulativeReached
      const toCount = to.cumulativeReached
      const cvr = fromCount > 0 ? (toCount / fromCount) * 100 : 0
      const dropOff = fromCount - toCount

      result.push({
        from: from.label,
        to: to.label,
        fromCount,
        toCount,
        cvr: Math.round(cvr),
        dropOff,
        isBottleneck: cvr < 30 && fromCount > 0,
      })
    }
    return result
  }, [stages])

  const total = leads.length
  const closedLost = rawCounts['Closed Lost'] || 0

  return (
    <div className="rounded-none p-6 bg-white">
      <div className="flex items-center justify-between mb-2">
        <h2
          className="font-display text-[#181c23]"
          style={{ fontSize: '1.25rem', fontWeight: 700 }}
        >
          Conversion Funnel
        </h2>
        <span className="text-[12px] text-gray-500">
          {total} total leads
        </span>
      </div>
      <p className="text-[11px] text-gray-400 mb-6">
        Cumulative reach — how many leads passed through each stage
      </p>

      <div className="flex flex-col gap-0">
        {stages.map((stage, i) => (
          <div key={stage.label}>
            {/* Stage row */}
            <div className="flex items-center gap-3 py-1.5">
              <div
                className="text-[12px] font-semibold text-right shrink-0"
                style={{ minWidth: 100, color: stage.color }}
              >
                {stage.label}
              </div>
              <div className="flex-1 flex justify-center">
                <div
                  className="h-9 rounded-none flex items-center justify-center transition-all"
                  style={{
                    width: `${Math.max(stage.barWidth, 8)}%`,
                    background: stage.color,
                    opacity: 0.85,
                  }}
                >
                  <span className="text-white text-[12px] font-bold">
                    {stage.cumulativeReached}
                  </span>
                </div>
              </div>
              <div
                className="text-[11px] text-gray-400 font-medium shrink-0"
                style={{ minWidth: 60, textAlign: 'right' }}
              >
                <span className="text-[#181c23] font-bold">{stage.count}</span>
                <span className="text-gray-300"> here</span>
              </div>
            </div>

            {/* CVR arrow between stages */}
            {i < transitions.length && (
              <div className="flex items-center gap-3 py-1">
                <div style={{ minWidth: 100 }} />
                <div className="flex-1 flex items-center justify-center">
                  <div
                    className="flex items-center gap-2 px-3 py-1 rounded-none text-[10px] font-bold"
                    style={{
                      background: '#f9fafb',
                      color: '#6b7280',
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M12 5v14M5 12l7 7 7-7" />
                    </svg>
                    <span
                      className="text-[13px]"
                      style={{
                        color: transitions[i].cvr > 0 ? '#a83900' : '#9ca3af',
                      }}
                    >
                      {transitions[i].cvr}% CVR
                    </span>
                    {transitions[i].dropOff > 0 && (
                      <span className="text-gray-300">
                        · {transitions[i].dropOff} drop-off
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ minWidth: 60 }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary footer */}
      <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <SummaryKPI
            label="End-to-End CVR"
            value={total > 0 ? `${Math.round(((rawCounts['Closed Won'] || 0) / total) * 100)}%` : '—'}
            color="#a83900"
          />
          <SummaryKPI
            label="Lost"
            value={String(closedLost)}
            color="#5F5E5A"
          />
          <SummaryKPI
            label="Win / Loss Ratio"
            value={
              (rawCounts['Closed Won'] || 0) + closedLost > 0
                ? `${rawCounts['Closed Won'] || 0}:${closedLost}`
                : '—'
            }
            color="#685588"
          />
        </div>
      </div>
    </div>
  )
}

function SummaryKPI({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color: string
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
        {label}
      </span>
      <span className="text-[18px] font-extrabold" style={{ color }}>
        {value}
      </span>
    </div>
  )
}
