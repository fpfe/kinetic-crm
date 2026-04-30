'use client'

import { useMemo, useState } from 'react'
import type { Lead } from '@/types'

type SegmentRow = {
  label: string
  won: number
  lost: number
  total: number
  winRate: number
  avgDealValue: number
  color: string
}

const SEGMENT_COLORS = [
  '#a83900', '#378ADD', '#1D9E75', '#BA7517', '#685588',
  '#b60056', '#3B6D11', '#854F0B', '#185FA5', '#5F5E5A',
]

function buildSegment(
  leads: Lead[],
  keyFn: (l: Lead) => string,
): SegmentRow[] {
  const groups = new Map<string, Lead[]>()
  for (const l of leads) {
    if (l.status !== 'Closed Won' && l.status !== 'Closed Lost') continue
    const key = keyFn(l) || 'Unknown'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(l)
  }

  const rows: SegmentRow[] = []
  let colorIdx = 0
  groups.forEach((items, label) => {
    const won = items.filter((l) => l.status === 'Closed Won').length
    const lost = items.filter((l) => l.status === 'Closed Lost').length
    const total = won + lost
    const wonItems = items.filter((l) => l.status === 'Closed Won')
    const avgDealValue =
      wonItems.length > 0
        ? wonItems.reduce((s, l) => s + (Number(l.dealValue) || 0), 0) / wonItems.length
        : 0
    rows.push({
      label,
      won,
      lost,
      total,
      winRate: total > 0 ? Math.round((won / total) * 100) : 0,
      avgDealValue,
      color: SEGMENT_COLORS[colorIdx % SEGMENT_COLORS.length],
    })
    colorIdx++
  })
  rows.sort((a, b) => b.total - a.total)
  return rows
}

function formatYen(v: number): string {
  if (v === 0) return '—'
  if (v >= 1_000_000) return `¥${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `¥${(v / 1_000).toFixed(0)}K`
  return `¥${v.toFixed(0)}`
}

type Tab = 'serviceType' | 'region' | 'leadSource'

const TABS: { key: Tab; label: string }[] = [
  { key: 'serviceType', label: 'Service Type' },
  { key: 'region', label: 'Region' },
  { key: 'leadSource', label: 'Lead Source' },
]

export default function WinLossAnalysis({ leads }: { leads: Lead[] }) {
  const closedLeads = useMemo(
    () => leads.filter((l) => l.status === 'Closed Won' || l.status === 'Closed Lost'),
    [leads]
  )

  const totalWon = closedLeads.filter((l) => l.status === 'Closed Won').length
  const totalLost = closedLeads.filter((l) => l.status === 'Closed Lost').length
  const overallWinRate =
    closedLeads.length > 0 ? Math.round((totalWon / closedLeads.length) * 100) : 0

  const totalWonValue = useMemo(
    () =>
      closedLeads
        .filter((l) => l.status === 'Closed Won')
        .reduce((s, l) => s + (Number(l.dealValue) || 0), 0),
    [closedLeads]
  )

  const segments = useMemo(
    () => ({
      serviceType: buildSegment(leads, (l) => l.serviceType),
      region: buildSegment(leads, (l) => l.region),
      leadSource: buildSegment(leads, (l) => l.leadSource),
    }),
    [leads]
  )

  const [activeTab, setActiveTab] = useState<Tab>('serviceType')

  const activeRows = segments[activeTab]
  const maxTotal = Math.max(...activeRows.map((r) => r.total), 1)

  if (closedLeads.length === 0) {
    return (
      <div className="rounded-none p-6 bg-white">
        <h2
          className="font-display text-[#181c23] mb-4"
          style={{ fontSize: '1.25rem', fontWeight: 700 }}
        >
          Win / Loss Analysis
        </h2>
        <div className="py-8 text-center text-gray-400 text-sm">
          No closed deals yet. Win/loss data will appear once leads are Closed Won or Closed Lost.
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-none p-6 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2
          className="font-display text-[#181c23]"
          style={{ fontSize: '1.25rem', fontWeight: 700 }}
        >
          Win / Loss Analysis
        </h2>
        <span className="text-[11px] text-gray-400">
          {closedLeads.length} closed deals
        </span>
      </div>

      {/* Summary strip */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 p-4"
        style={{ background: '#faf8f5', border: '1px solid #f0f0ed' }}
      >
        <div>
          <div
            className="text-[10px] uppercase font-bold text-gray-400"
            style={{ letterSpacing: '0.18em' }}
          >
            Win Rate
          </div>
          <div className="text-[24px] font-extrabold text-[#181c23] mt-1">
            {overallWinRate}%
          </div>
        </div>
        <div>
          <div
            className="text-[10px] uppercase font-bold text-gray-400"
            style={{ letterSpacing: '0.18em' }}
          >
            Won
          </div>
          <div className="text-[24px] font-extrabold text-[#1D9E75] mt-1">
            {totalWon}
          </div>
        </div>
        <div>
          <div
            className="text-[10px] uppercase font-bold text-gray-400"
            style={{ letterSpacing: '0.18em' }}
          >
            Lost
          </div>
          <div className="text-[24px] font-extrabold text-[#dc2626] mt-1">
            {totalLost}
          </div>
        </div>
        <div>
          <div
            className="text-[10px] uppercase font-bold text-gray-400"
            style={{ letterSpacing: '0.18em' }}
          >
            Won Revenue
          </div>
          <div className="text-[24px] font-extrabold text-[#a83900] mt-1">
            {formatYen(totalWonValue)}
          </div>
        </div>
      </div>

      {/* Segment tabs */}
      <div className="flex items-center gap-1 mb-4" style={{ borderBottom: '1px solid #f0f0ed' }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className="px-4 py-2 text-[12px] font-bold transition-colors"
            style={{
              color: activeTab === tab.key ? '#a83900' : '#888780',
              borderBottom: activeTab === tab.key ? '2px solid #a83900' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Segment table */}
      {activeRows.length === 0 ? (
        <div className="py-6 text-center text-gray-400 text-sm">
          No data for this segment
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {/* Column header */}
          <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">
            <div style={{ width: 180, flexShrink: 0 }}>Segment</div>
            <div className="flex-1" />
            <div style={{ width: 36, textAlign: 'right' }}>Won</div>
            <div style={{ width: 36, textAlign: 'right' }}>Lost</div>
            <div style={{ width: 48, textAlign: 'right' }}>Rate</div>
            <div style={{ width: 64, textAlign: 'right' }}>Avg Deal</div>
          </div>

          {activeRows.map((r) => (
            <div key={r.label} className="flex items-center gap-3 py-1.5">
              {/* Label */}
              <div className="flex items-center gap-2" style={{ width: 180, flexShrink: 0 }}>
                <span
                  className="w-2.5 h-2.5 rounded-none shrink-0"
                  style={{ background: r.color }}
                />
                <span
                  className="text-[13px] font-semibold text-[#181c23] truncate"
                  title={r.label}
                >
                  {r.label}
                </span>
              </div>

              {/* Stacked win/loss bar */}
              <div className="flex-1 h-7 bg-gray-50 rounded-none overflow-hidden flex">
                {r.won > 0 && (
                  <div
                    className="h-full"
                    style={{
                      width: `${(r.won / maxTotal) * 100}%`,
                      background: '#1D9E75',
                      opacity: 0.8,
                      minWidth: 4,
                    }}
                  />
                )}
                {r.lost > 0 && (
                  <div
                    className="h-full"
                    style={{
                      width: `${(r.lost / maxTotal) * 100}%`,
                      background: '#dc2626',
                      opacity: 0.4,
                      minWidth: 4,
                    }}
                  />
                )}
              </div>

              {/* Won */}
              <div
                className="text-[12px] font-semibold"
                style={{ width: 36, textAlign: 'right', color: '#1D9E75' }}
              >
                {r.won}
              </div>

              {/* Lost */}
              <div
                className="text-[12px] font-semibold"
                style={{ width: 36, textAlign: 'right', color: '#dc2626' }}
              >
                {r.lost}
              </div>

              {/* Win rate */}
              <div
                className="text-[13px] font-bold"
                style={{
                  width: 48,
                  textAlign: 'right',
                  color: r.winRate >= 50 ? '#1D9E75' : r.winRate > 0 ? '#BA7517' : '#d1d5db',
                }}
              >
                {r.winRate}%
              </div>

              {/* Avg deal value */}
              <div
                className="text-[12px] text-gray-500"
                style={{ width: 64, textAlign: 'right' }}
              >
                {formatYen(r.avgDealValue)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
