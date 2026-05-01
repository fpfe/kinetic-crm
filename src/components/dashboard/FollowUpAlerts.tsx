'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Lead, Note } from '@/types'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type AlertItem = {
  id: string
  leadId: string
  company: string
  contactName: string
  status: string
  icon: string
  iconColor: string
  iconBg: string
  tagLabel: string
  tagColor: string
  tagBg: string
  detail: string
  sortKey: number
}

type AlertCategory = {
  key: string
  label: string
  icon: string
  items: AlertItem[]
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const DAY = 1000 * 60 * 60 * 24

function daysBetween(from: number, to: number): number {
  return Math.floor((to - from) / DAY)
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function FollowUpAlerts() {
  const [categories, setCategories] = useState<AlertCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [leadsRes, notesRes] = await Promise.all([
          fetch('/api/leads', { cache: 'no-store' }),
          fetch('/api/notes', { cache: 'no-store' }),
        ])
        if (!leadsRes.ok || !notesRes.ok) return
        const leads: Lead[] = await leadsRes.json()
        const notes: Note[] = await notesRes.json()

        const now = Date.now()
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        const todayMs = todayStart.getTime()

        const leadMap = new Map(leads.map((l) => [l.id, l]))

        /* 1. Overdue reminders — past their reminderDate */
        const overdue: AlertItem[] = []
        const upcoming: AlertItem[] = []

        for (const note of notes) {
          if (note.isReminder !== 'true' || !note.reminderDate) continue
          const rd = new Date(note.reminderDate)
          if (Number.isNaN(rd.getTime())) continue
          rd.setHours(0, 0, 0, 0)
          const lead = leadMap.get(note.leadId)
          if (!lead) continue
          if (lead.status === 'Closed Won' || lead.status === 'Closed Lost') continue

          const daysOver = daysBetween(rd.getTime(), todayMs)

          if (daysOver > 0) {
            overdue.push({
              id: `overdue-${note.id}`,
              leadId: lead.id,
              company: lead.company,
              contactName: lead.contactName,
              status: lead.status,
              icon: 'notifications_active',
              iconColor: '#BA1A1A',
              iconBg: '#FEE2E2',
              tagLabel: `${daysOver}d overdue`,
              tagColor: '#BA1A1A',
              tagBg: '#FEE2E2',
              detail: note.content.length > 60 ? note.content.slice(0, 60) + '...' : note.content,
              sortKey: -daysOver,
            })
          } else if (daysOver >= -2) {
            const label = daysOver === 0 ? 'Due today' : daysOver === -1 ? 'Due tomorrow' : 'In 2 days'
            upcoming.push({
              id: `upcoming-${note.id}`,
              leadId: lead.id,
              company: lead.company,
              contactName: lead.contactName,
              status: lead.status,
              icon: 'schedule',
              iconColor: '#1D4ED8',
              iconBg: '#DBEAFE',
              tagLabel: label,
              tagColor: '#1D4ED8',
              tagBg: '#DBEAFE',
              detail: note.content.length > 60 ? note.content.slice(0, 60) + '...' : note.content,
              sortKey: daysOver,
            })
          }
        }

        /* 2. Stale leads — active leads with no update for 7+ days */
        const stale: AlertItem[] = []
        for (const lead of leads) {
          if (lead.status === 'Closed Won' || lead.status === 'Closed Lost') continue
          const created = Date.parse(lead.createdAt)
          if (Number.isNaN(created)) continue
          const age = daysBetween(created, now)
          if (age >= 7 && lead.status !== 'New') {
            stale.push({
              id: `stale-${lead.id}`,
              leadId: lead.id,
              company: lead.company,
              contactName: lead.contactName,
              status: lead.status,
              icon: 'hourglass_top',
              iconColor: '#92400E',
              iconBg: '#FEF3C7',
              tagLabel: `${age}d inactive`,
              tagColor: '#92400E',
              tagBg: '#FEF3C7',
              detail: `${lead.contactName} · ${lead.serviceType}`,
              sortKey: -age,
            })
          }
        }

        /* 3. Going cold — New leads untouched for 5+ days */
        const cold: AlertItem[] = []
        for (const lead of leads) {
          if (lead.status !== 'New') continue
          const created = Date.parse(lead.createdAt)
          if (Number.isNaN(created)) continue
          const age = daysBetween(created, now)
          if (age >= 5) {
            cold.push({
              id: `cold-${lead.id}`,
              leadId: lead.id,
              company: lead.company,
              contactName: lead.contactName,
              status: lead.status,
              icon: 'ac_unit',
              iconColor: '#685588',
              iconBg: '#ece6f4',
              tagLabel: `${age}d untouched`,
              tagColor: '#685588',
              tagBg: '#ece6f4',
              detail: `${lead.contactName} · ${lead.serviceType}`,
              sortKey: -age,
            })
          }
        }

        overdue.sort((a, b) => a.sortKey - b.sortKey)
        stale.sort((a, b) => a.sortKey - b.sortKey)
        cold.sort((a, b) => a.sortKey - b.sortKey)
        upcoming.sort((a, b) => a.sortKey - b.sortKey)

        const cats: AlertCategory[] = []
        if (overdue.length) cats.push({ key: 'overdue', label: 'Overdue', icon: 'notifications_active', items: overdue })
        if (upcoming.length) cats.push({ key: 'upcoming', label: 'Upcoming', icon: 'schedule', items: upcoming })
        if (cold.length) cats.push({ key: 'cold', label: 'Going Cold', icon: 'ac_unit', items: cold })
        if (stale.length) cats.push({ key: 'stale', label: 'Stale Deals', icon: 'hourglass_top', items: stale.slice(0, 6) })

        setCategories(cats)
        if (cats.length > 0 && !activeTab) setActiveTab(cats[0].key)
      } finally {
        setLoading(false)
      }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return <div className="h-[200px] rounded-none bg-gray-200 animate-pulse" />
  }

  const totalAlerts = categories.reduce((sum, c) => sum + c.items.length, 0)

  if (totalAlerts === 0) {
    return (
      <div className="bg-success-bg rounded-none px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-none bg-white flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-success" style={{ fontSize: 22 }}>check_circle</span>
          </div>
          <div>
            <div className="text-[14px] font-bold text-success">All clear</div>
            <div className="text-[13px] text-success/70">No overdue follow-ups or stale leads</div>
          </div>
        </div>
      </div>
    )
  }

  const activeCat = categories.find((c) => c.key === activeTab) || categories[0]

  return (
    <div className="bg-white rounded-none px-4 py-4 sm:px-5 sm:py-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="font-display font-bold text-fg" style={{ fontSize: 20 }}>
            Follow-Up Alerts
          </h2>
          <span
            className="px-2.5 py-1 rounded-none text-[11px] font-bold bg-danger-bg text-danger"
            style={{ letterSpacing: '0.06em' }}
          >
            {totalAlerts} ACTION{totalAlerts !== 1 ? 'S' : ''}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6" style={{ borderBottom: '1px solid rgba(24,28,35,0.06)' }}>
        {categories.map((cat) => (
          <button
            key={cat.key}
            type="button"
            onClick={() => setActiveTab(cat.key)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-bold transition-colors"
            style={{
              color: activeTab === cat.key ? '#A83900' : '#6b7280',
              borderBottom: activeTab === cat.key ? '2px solid #A83900' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{cat.icon}</span>
            {cat.label}
            <span
              className="px-1.5 py-0.5 text-[10px] font-bold rounded-none"
              style={{
                background: activeTab === cat.key ? '#A83900' : '#e5e7eb',
                color: activeTab === cat.key ? '#fff' : '#6b7280',
              }}
            >
              {cat.items.length}
            </span>
          </button>
        ))}
      </div>

      {/* Items */}
      <div className="flex flex-col gap-3">
        {activeCat.items.map((item) => (
          <Link
            key={item.id}
            href={`/leads/${item.leadId}`}
            className="flex items-center gap-3 px-4 py-3 rounded-none hover:bg-surface-low transition-colors group"
          >
            <div
              className="w-9 h-9 rounded-none flex items-center justify-center flex-shrink-0"
              style={{ background: item.iconBg }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 18, color: item.iconColor }}
              >
                {item.icon}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-fg group-hover:text-brand truncate">
                  {item.company}
                </span>
                <span
                  className="px-2 py-0.5 text-[10px] font-bold rounded-none flex-shrink-0"
                  style={{ background: item.tagBg, color: item.tagColor }}
                >
                  {item.tagLabel}
                </span>
              </div>
              <div className="text-[12px] text-muted mt-0.5 truncate">{item.detail}</div>
            </div>
            <span className="material-symbols-outlined text-muted-2 group-hover:text-brand" style={{ fontSize: 18 }}>
              chevron_right
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
