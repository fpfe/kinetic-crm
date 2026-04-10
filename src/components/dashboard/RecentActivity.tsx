'use client'

import Link from 'next/link'
import type { Lead } from '@/types'

type Props = {
  leads: Lead[]
}

function relativeTime(iso: string): string {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ''
  const diff = Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24))
  if (diff <= 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return `${diff} days ago`
}

function activityFor(lead: Lead): {
  icon: string
  color: string
  text: string
} {
  switch (lead.status) {
    case 'Closed Won':
      return {
        icon: 'check_circle',
        color: 'text-green-600',
        text: `${lead.company} successfully acquired.`,
      }
    case 'Negotiation':
      return {
        icon: 'priority_high',
        color: 'text-[#b60056]',
        text: `Negotiation in progress with ${lead.company}.`,
      }
    case 'Proposal Sent':
      return {
        icon: 'description',
        color: 'text-[#a83900]',
        text: `Proposal sent to ${lead.company}.`,
      }
    case 'New':
      return {
        icon: 'person_add',
        color: 'text-[#685588]',
        text: `New lead: ${lead.company} added.`,
      }
    case 'Contacted':
      return {
        icon: 'person_add',
        color: 'text-[#685588]',
        text: `${lead.company} contacted by ${lead.assignedTo || 'team'}.`,
      }
    default:
      return {
        icon: 'info',
        color: 'text-gray-500',
        text: `${lead.company} updated.`,
      }
  }
}

export default function RecentActivity({ leads }: Props) {
  const recent = [...leads]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 5)

  return (
    <div className="bg-[#e5e8f3] rounded-none p-8 xl:col-span-1">
      <div className="flex items-center justify-between mb-6">
        <h2
          className="font-display font-bold text-[#181c23]"
          style={{ fontSize: 20 }}
        >
          Recent Activity
        </h2>
        <Link
          href="/leads"
          className="text-[12px] font-bold text-[#a83900] hover:opacity-80"
        >
          View All
        </Link>
      </div>

      <div className="flex flex-col gap-6">
        {recent.map((lead) => {
          const a = activityFor(lead)
          return (
            <div key={lead.id} className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-none bg-white border border-gray-200/60 flex items-center justify-center flex-shrink-0">
                <span
                  className={`material-symbols-outlined ${a.color}`}
                  style={{ fontSize: 20 }}
                >
                  {a.icon}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-[#181c23] leading-snug">
                  {a.text}
                </div>
                <div className="text-[11px] text-gray-500 mt-1 font-medium">
                  {relativeTime(lead.createdAt)}
                </div>
              </div>
            </div>
          )
        })}
        {recent.length === 0 && (
          <div className="text-[13px] text-gray-500">No recent activity.</div>
        )}
      </div>

      {/* Today's Actions */}
      <div className="mt-8 bg-white rounded-none p-6">
        <div className="text-[11px] font-bold uppercase text-[#a83900] tracking-wider mb-4">
          Today&apos;s Actions
        </div>
        {(() => {
          const now = Date.now()
          const day = 1000 * 60 * 60 * 24

          const addedThisWeek = leads.filter(
            (l) => now - Date.parse(l.createdAt) <= 7 * day
          ).length

          const followUpsDue = leads.filter((l) => {
            if (l.status === 'Closed Won' || l.status === 'Closed Lost') return false
            return now - Date.parse(l.createdAt) > 3 * day
          }).length

          const goingCold = leads.filter(
            (l) => l.status === 'New' && now - Date.parse(l.createdAt) > 7 * day
          ).length

          const rows = [
            { count: addedThisWeek, label: 'Leads added this week', href: '/leads' },
            { count: followUpsDue, label: 'Needs attention (3+ days untouched)', href: '/leads' },
            { count: goingCold, label: 'Going cold (7+ days no activity)', href: '/leads?status=New' },
          ]

          return (
            <div className="flex flex-col gap-3">
              {rows.map((r) => (
                <Link
                  key={r.label}
                  href={r.href}
                  className="flex items-center gap-4 px-3 py-2 rounded hover:bg-gray-50 transition-colors"
                >
                  <span className="text-[20px] font-bold text-[#181c23] min-w-[32px]">
                    {r.count}
                  </span>
                  <span className="text-[13px] text-gray-500">{r.label}</span>
                </Link>
              ))}
            </div>
          )
        })()}
      </div>
    </div>
  )
}
