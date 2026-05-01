// Recent deep-search runs, linked to /deep-search
'use client'

import Link from 'next/link'

type HistoryRow = {
  id: string
  created_at: string
  query: string
  activity_title: string | null
  score: number | null
  company: string | null
  saved_as_lead_id: string | null
}

type Props = {
  history: HistoryRow[]
}

function shortDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function scoreColor(score: number | null): string {
  if (score === null) return 'text-gray-400'
  if (score >= 70) return 'text-green-600'
  if (score >= 40) return 'text-amber-600'
  return 'text-red-600'
}

function truncate(text: string, max: number): string {
  if (!text) return ''
  return text.length > max ? text.slice(0, max) + '...' : text
}

export default function DeepSearchActivity({ history }: Props) {
  const recent = [...history]
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, 5)

  return (
    <div className="bg-white border border-gray-200 rounded-none px-4 py-4 sm:px-5 sm:py-5 xl:col-span-2">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[12px] uppercase tracking-[0.18em] font-bold text-[#5b4137]/60">
          Deep Search Activity
        </h2>
        <span className="text-[11px] font-bold text-[#181c23]/50 tracking-wider">
          {history.length} total
        </span>
      </div>

      {recent.length === 0 ? (
        <div className="text-[13px] text-gray-500 py-6 text-center">
          No deep searches yet. Run one to see activity here.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-[#5b4137]/60 font-bold border-b border-gray-200">
                <th className="text-left py-2 pr-4 font-bold">Date</th>
                <th className="text-left py-2 pr-4 font-bold">Query</th>
                <th className="text-left py-2 pr-4 font-bold">Company</th>
                <th className="text-left py-2 pr-4 font-bold">Score</th>
                <th className="text-left py-2 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-gray-100 last:border-0"
                >
                  <td className="py-3 pr-4 text-[#5b4137] whitespace-nowrap">
                    {shortDate(row.created_at)}
                  </td>
                  <td className="py-3 pr-4 text-[#181c23]">
                    {truncate(row.query, 40)}
                  </td>
                  <td className="py-3 pr-4 text-[#5b4137]">
                    {row.company ? truncate(row.company, 24) : '—'}
                  </td>
                  <td
                    className={`py-3 pr-4 font-bold ${scoreColor(row.score)}`}
                  >
                    {row.score !== null ? row.score : '—'}
                  </td>
                  <td className="py-3">
                    {row.saved_as_lead_id ? (
                      <span className="text-[11px] font-bold text-green-700 bg-green-100 px-2 py-1 rounded-none tracking-wider">
                        Saved
                      </span>
                    ) : (
                      <span className="text-[11px] text-gray-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-gray-100">
        <Link
          href="/deep-search"
          className="text-[12px] font-bold text-[#a83900] hover:opacity-80"
        >
          View all in Deep Search →
        </Link>
      </div>
    </div>
  )
}
