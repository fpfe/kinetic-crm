'use client'

type StageCounts = {
  New: number
  Contacted: number
  Qualified: number
  'Proposal Sent': number
  Negotiation: number
  'Closed Won': number
  'Closed Lost': number
}

type Props = {
  stageCounts: StageCounts
}

const STAGES: {
  label: string
  key: keyof StageCounts
  bg: string
}[] = [
  { label: 'Prospecting', key: 'New', bg: '#888780' },
  { label: 'Contacted', key: 'Contacted', bg: '#378ADD' },
  { label: 'Qualification', key: 'Qualified', bg: '#1D9E75' },
  { label: 'Proposal', key: 'Proposal Sent', bg: '#BA7517' },
  { label: 'Negotiation', key: 'Negotiation', bg: '#685588' },
  { label: 'Closed Won', key: 'Closed Won', bg: '#A83900' },
]

export default function PipelineHealth({ stageCounts }: Props) {
  const max = Math.max(...STAGES.map((s) => stageCounts[s.key]), 1)
  const active =
    stageCounts.New +
    stageCounts.Contacted +
    stageCounts.Qualified +
    stageCounts['Proposal Sent'] +
    stageCounts.Negotiation

  return (
    <div className="bg-surface-low rounded-none p-8 xl:col-span-2">
      <div className="flex items-center justify-between mb-8">
        <h2
          className="font-display font-bold text-fg"
          style={{ fontSize: 22 }}
        >
          Pipeline Health
        </h2>
        <span className="px-4 py-1.5 rounded-none bg-white text-brand text-[12px] font-bold" style={{ letterSpacing: '0.18em' }}>
          Active: {active} Deals
        </span>
      </div>

      <div className="flex flex-col gap-5">
        {STAGES.map((s) => {
          const count = stageCounts[s.key]
          const pct = Math.round((count / max) * 100)
          return (
            <div key={s.key} className="grid items-center gap-3" style={{ gridTemplateColumns: '140px 1fr 60px' }}>
              <span className="text-[12px] font-bold text-[#5b4137]/60 uppercase" style={{ letterSpacing: '0.18em' }}>
                {s.label}
              </span>
              <div
                className="bg-[#dfe2ed] rounded-none overflow-hidden"
                style={{ height: 8 }}
              >
                <div
                  className="h-full rounded-none transition-all"
                  style={{ width: `${Math.max(pct, 4)}%`, background: s.bg }}
                />
              </div>
              <span className="text-[13px] font-bold text-[#181c23] text-right font-mono">
                {count}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
