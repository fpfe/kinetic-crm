'use client'

import type { Lead, LeadStatus } from '@/types'

const STAGE_PROBABILITY: Record<LeadStatus, number> = {
  New: 0.1,
  Contacted: 0.2,
  Qualified: 0.4,
  'Proposal Sent': 0.6,
  Negotiation: 0.8,
  'Closed Won': 1.0,
  'Closed Lost': 0,
}

function formatYen(n: number): string {
  if (n === 0) return '¥0'
  if (n >= 1_000_000) return `¥${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `¥${(n / 1_000).toFixed(0)}K`
  return `¥${n.toLocaleString()}`
}

function daysBetween(iso1: string, iso2: string): number {
  const t1 = new Date(iso1).getTime()
  const t2 = new Date(iso2).getTime()
  if (Number.isNaN(t1) || Number.isNaN(t2)) return 0
  return Math.max(0, Math.floor(Math.abs(t2 - t1) / 86400000))
}

export default function PipelineStats({ leads }: { leads: Lead[] }) {
  // Win rate
  const won = leads.filter((l) => l.status === 'Closed Won').length
  const lost = leads.filter((l) => l.status === 'Closed Lost').length
  const winRate =
    won + lost === 0 ? '—' : `${((won / (won + lost)) * 100).toFixed(0)}%`

  // Weighted forecast — sum of (dealValue * stage probability) for open deals
  const openLeads = leads.filter(
    (l) => l.status !== 'Closed Won' && l.status !== 'Closed Lost'
  )
  const weightedValue = openLeads.reduce((sum, l) => {
    const value = Number(l.dealValue) || 0
    const prob = STAGE_PROBABILITY[l.status] ?? 0
    return sum + value * prob
  }, 0)

  // Real velocity — avg days from creation to close for won deals
  const wonLeads = leads.filter((l) => l.status === 'Closed Won')
  let velocity = '—'
  if (wonLeads.length > 0) {
    const totalDays = wonLeads.reduce(
      (sum, l) => sum + daysBetween(l.createdAt, new Date().toISOString()),
      0
    )
    velocity = `${Math.round(totalDays / wonLeads.length)}d`
  } else if (openLeads.length > 0) {
    // Show avg age of open leads as proxy
    const totalDays = openLeads.reduce(
      (sum, l) => sum + daysBetween(l.createdAt, new Date().toISOString()),
      0
    )
    velocity = `~${Math.round(totalDays / openLeads.length)}d`
  }

  return (
    <div
      className="fixed flex items-center gap-4 sm:gap-5"
      style={{
        bottom: 24,
        right: 24,
        background: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 0,
        padding: '12px 16px',
        border: '1px solid rgba(24,28,35,0.08)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
        zIndex: 10,
      }}
    >
      <Stat
        label="Win Rate"
        value={winRate}
        color="#a83900"
        icon={<span className="material-symbols-outlined" style={{ fontSize: 18 }}>trending_up</span>}
      />
      <Divider />
      <Stat
        label="Velocity"
        value={velocity}
        color="#685588"
        icon={<span className="material-symbols-outlined" style={{ fontSize: 18 }}>speed</span>}
      />
      <Divider />
      <Stat
        label="Forecast"
        value={formatYen(weightedValue)}
        color="#1D9E75"
        icon={<span className="material-symbols-outlined" style={{ fontSize: 18 }}>monitoring</span>}
      />
    </div>
  )
}

function Divider() {
  return <div style={{ width: 1, height: 36, background: 'rgba(24,28,35,0.1)' }} />
}

function Stat({
  label,
  value,
  color,
  icon,
}: {
  label: string
  value: string
  color: string
  icon: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2">
      <div style={{ color }}>{icon}</div>
      <div className="flex flex-col">
        <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">
          {label}
        </span>
        <span className="text-[14px] font-extrabold text-[#181c23]">
          {value}
        </span>
      </div>
    </div>
  )
}
