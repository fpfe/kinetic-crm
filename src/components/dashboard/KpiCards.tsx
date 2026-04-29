'use client'

type Props = {
  totalLeads: number
  leadsThisWeek: number
  deepSearchesThisWeek: number
  avgScore: number | null
}

function TrendBadge({
  label,
  tone,
}: {
  label: string
  tone: 'green' | 'gray' | 'red' | 'amber'
}) {
  const styles: Record<string, string> = {
    green: 'bg-success-bg text-success',
    gray: 'bg-gray-100 text-gray-600',
    red: 'bg-danger-bg text-danger',
    amber: 'bg-warning-bg text-warning',
  }
  return (
    <span
      className={`px-2.5 py-1 rounded-none text-[11px] font-bold ${styles[tone]}`}
      style={{ letterSpacing: '0.06em' }}
    >
      {label}
    </span>
  )
}

export default function KpiCards({
  totalLeads,
  leadsThisWeek,
  deepSearchesThisWeek,
  avgScore,
}: Props) {
  const searchTone: 'green' | 'amber' | 'gray' =
    deepSearchesThisWeek > 3 ? 'green' : deepSearchesThisWeek >= 1 ? 'amber' : 'gray'
  const searchLabel =
    deepSearchesThisWeek > 3
      ? 'Strong week'
      : deepSearchesThisWeek >= 1
      ? 'Ramp up'
      : 'No searches'

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Card 1 — Total Leads */}
      <div className="bg-white rounded-none p-8 relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-none bg-[#a83900]/5 flex items-center justify-center">
            <span
              className="material-symbols-outlined text-[#a83900]"
              style={{ fontSize: 24 }}
            >
              groups
            </span>
          </div>
          {totalLeads > 0 ? (
            <TrendBadge label="Active" tone="green" />
          ) : (
            <TrendBadge label="Empty" tone="gray" />
          )}
        </div>
        <div className="mt-8 text-[12px] uppercase tracking-[0.18em] font-bold text-[#5b4137]/60">
          Total Leads
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span
            className="font-display text-[#181c23]"
            style={{ fontSize: '4rem', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em' }}
          >
            {totalLeads}
          </span>
        </div>
        {totalLeads === 0 && (
          <div className="mt-2 text-[12px] italic text-gray-500">
            Add your first lead to get started
          </div>
        )}
      </div>

      {/* Card 2 — Added This Week */}
      <div className="bg-white rounded-none p-8 relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-none bg-[#b60056]/5 flex items-center justify-center">
            <span
              className="material-symbols-outlined text-[#b60056]"
              style={{ fontSize: 24 }}
            >
              person_add
            </span>
          </div>
          {leadsThisWeek > 0 ? (
            <TrendBadge label={`+${leadsThisWeek} this week`} tone="green" />
          ) : (
            <TrendBadge label="None yet" tone="gray" />
          )}
        </div>
        <div className="mt-8 text-[12px] uppercase tracking-[0.18em] font-bold text-[#5b4137]/60">
          Added This Week
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span
            className="font-display text-[#181c23]"
            style={{ fontSize: '4rem', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em' }}
          >
            {leadsThisWeek}
          </span>
        </div>
        {leadsThisWeek === 0 && (
          <div className="mt-2 text-[12px] italic text-gray-500">
            No new leads in the last 7 days
          </div>
        )}
      </div>

      {/* Card 3 — Deep Searches This Week */}
      <div className="bg-white rounded-none p-8 relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-none bg-[#685588]/5 flex items-center justify-center">
            <span
              className="material-symbols-outlined text-[#685588]"
              style={{ fontSize: 24 }}
            >
              travel_explore
            </span>
          </div>
          <TrendBadge label={searchLabel} tone={searchTone} />
        </div>
        <div className="mt-8 text-[12px] uppercase tracking-[0.18em] font-bold text-[#5b4137]/60">
          Deep Searches This Week
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span
            className="font-display text-[#181c23]"
            style={{ fontSize: '4rem', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em' }}
          >
            {deepSearchesThisWeek}
          </span>
        </div>
        {avgScore !== null ? (
          <div className="mt-2 text-[12px] text-[#5b4137]">
            Avg score: <span className="font-bold text-[#181c23]">{avgScore}</span>
          </div>
        ) : (
          deepSearchesThisWeek === 0 && (
            <div className="mt-2 text-[12px] italic text-gray-500">
              Run a deep search to surface opportunities
            </div>
          )
        )}
      </div>
    </div>
  )
}
