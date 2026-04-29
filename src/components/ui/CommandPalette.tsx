'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Lead } from '@/types'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ResultItem = {
  id: string
  label: string
  sublabel?: string
  icon: string
  action: () => void
  section: 'Navigation' | 'Quick Actions' | 'Leads'
}

/* ------------------------------------------------------------------ */
/*  Static entries                                                     */
/* ------------------------------------------------------------------ */

const NAV_ITEMS: Omit<ResultItem, 'action'>[] = [
  { id: 'nav-dashboard', label: 'Dashboard', sublabel: 'Overview and KPIs', icon: 'dashboard', section: 'Navigation' },
  { id: 'nav-leads', label: 'Leads', sublabel: 'All leads', icon: 'groups', section: 'Navigation' },
  { id: 'nav-pipeline', label: 'Pipeline', sublabel: 'Kanban board', icon: 'hub', section: 'Navigation' },
  { id: 'nav-reports', label: 'Reports', sublabel: 'Funnel and analytics', icon: 'bar_chart', section: 'Navigation' },
  { id: 'nav-lead-finder', label: 'Lead Finder', sublabel: 'Search for new merchants', icon: 'person_search', section: 'Navigation' },
  { id: 'nav-deep-search', label: 'Deep Search', sublabel: 'AI-powered research', icon: 'travel_explore', section: 'Navigation' },
  { id: 'nav-crm', label: 'CRM', sublabel: 'Merchant CRM', icon: 'contacts', section: 'Navigation' },
  { id: 'nav-members', label: 'Members', sublabel: 'Team management', icon: 'person_add', section: 'Navigation' },
]

const NAV_ROUTES: Record<string, string> = {
  'nav-dashboard': '/dashboard',
  'nav-leads': '/leads',
  'nav-pipeline': '/pipeline',
  'nav-reports': '/reports',
  'nav-lead-finder': '/lead-finder',
  'nav-deep-search': '/deep-search',
  'nav-crm': '/crm',
  'nav-members': '/members',
}

const ACTION_ITEMS: Omit<ResultItem, 'action'>[] = [
  { id: 'act-add-lead', label: 'Add New Lead', sublabel: 'Create a new merchant lead', icon: 'add_circle', section: 'Quick Actions' },
  { id: 'act-deep-search', label: 'Run Deep Search', sublabel: 'AI research on a merchant', icon: 'travel_explore', section: 'Quick Actions' },
  { id: 'act-find-leads', label: 'Find New Leads', sublabel: 'Search Google Places', icon: 'person_search', section: 'Quick Actions' },
  { id: 'act-export-csv', label: 'Export Leads CSV', sublabel: 'Download all leads', icon: 'download', section: 'Quick Actions' },
]

/* ------------------------------------------------------------------ */
/*  Fuzzy match                                                        */
/* ------------------------------------------------------------------ */

function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  if (t.includes(q)) return true
  let qi = 0
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++
  }
  return qi === q.length
}

function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  if (t === q) return 100
  if (t.startsWith(q)) return 90
  if (t.includes(q)) return 70
  return 50
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const [leads, setLeads] = useState<Lead[]>([])
  const [leadsLoaded, setLeadsLoaded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  /* Load leads once on first open */
  const loadLeads = useCallback(async () => {
    if (leadsLoaded) return
    try {
      const res = await fetch('/api/leads')
      if (res.ok) {
        const data = await res.json()
        setLeads(data)
      }
    } catch { /* silent */ }
    setLeadsLoaded(true)
  }, [leadsLoaded])

  /* Open / close */
  const openPalette = useCallback(() => {
    setOpen(true)
    setQuery('')
    setActiveIdx(0)
    loadLeads()
  }, [loadLeads])

  const closePalette = useCallback(() => {
    setOpen(false)
    setQuery('')
  }, [])

  /* Keyboard shortcut: ⌘K / Ctrl+K */
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (open) closePalette()
        else openPalette()
      }
      if (e.key === 'Escape' && open) {
        closePalette()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, openPalette, closePalette])

  /* Auto-focus input */
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  /* Build results */
  const results: ResultItem[] = []

  const navMatches = NAV_ITEMS
    .filter((item) => !query || fuzzyMatch(query, item.label + ' ' + (item.sublabel || '')))
    .sort((a, b) => query ? fuzzyScore(query, b.label) - fuzzyScore(query, a.label) : 0)
    .map((item) => ({
      ...item,
      action: () => { router.push(NAV_ROUTES[item.id]); closePalette() },
    }))

  const actionMatches = ACTION_ITEMS
    .filter((item) => !query || fuzzyMatch(query, item.label + ' ' + (item.sublabel || '')))
    .sort((a, b) => query ? fuzzyScore(query, b.label) - fuzzyScore(query, a.label) : 0)
    .map((item) => ({
      ...item,
      action: () => {
        if (item.id === 'act-add-lead') { router.push('/leads?action=add'); closePalette() }
        else if (item.id === 'act-deep-search') { router.push('/deep-search'); closePalette() }
        else if (item.id === 'act-find-leads') { router.push('/lead-finder'); closePalette() }
        else if (item.id === 'act-export-csv') { router.push('/reports?export=csv'); closePalette() }
        else closePalette()
      },
    }))

  const leadMatches = query.length >= 2
    ? leads
        .filter((l) => fuzzyMatch(query, l.company + ' ' + l.contactName + ' ' + l.serviceType))
        .sort((a, b) => fuzzyScore(query, b.company) - fuzzyScore(query, a.company))
        .slice(0, 8)
        .map((l) => ({
          id: `lead-${l.id}`,
          label: l.company,
          sublabel: `${l.contactName} · ${l.status}`,
          icon: 'storefront',
          section: 'Leads' as const,
          action: () => { router.push(`/leads/${l.id}`); closePalette() },
        }))
    : []

  if (!query) {
    results.push(...actionMatches, ...navMatches)
  } else {
    results.push(...leadMatches, ...navMatches, ...actionMatches)
  }

  /* Clamp active index */
  const clampedIdx = Math.min(activeIdx, results.length - 1)

  /* Keyboard navigation */
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[clampedIdx]) {
      e.preventDefault()
      results[clampedIdx].action()
    }
  }

  /* Scroll active into view */
  useEffect(() => {
    const el = listRef.current?.children[clampedIdx] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [clampedIdx])

  if (!open) return null

  /* Group results by section */
  const sections: { title: string; items: (ResultItem & { globalIdx: number })[] }[] = []
  let globalIdx = 0
  const sectionOrder = ['Quick Actions', 'Leads', 'Navigation'] as const
  for (const sec of sectionOrder) {
    const items = results
      .filter((r) => r.section === sec)
      .map((r) => ({ ...r, globalIdx: -1 }))
    if (items.length === 0) continue
    for (const item of items) {
      item.globalIdx = globalIdx++
    }
    sections.push({ title: sec, items })
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        style={{ background: 'rgba(24,28,35,0.4)', backdropFilter: 'blur(4px)' }}
        onClick={closePalette}
      />

      {/* Panel */}
      <div
        className="fixed z-50 left-1/2 rounded-none overflow-hidden animate-slide-up"
        style={{
          top: 80,
          transform: 'translateX(-50%)',
          width: 560,
          background: '#fff',
          boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        }}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid rgba(24,28,35,0.06)' }}>
          <span className="material-symbols-outlined text-muted" style={{ fontSize: 22 }}>search</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIdx(0) }}
            onKeyDown={onKeyDown}
            placeholder="Search leads, pages, or actions..."
            className="flex-1 text-[15px] text-fg outline-none bg-transparent placeholder:text-muted-2"
          />
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-none bg-gray-100 text-muted font-medium"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            ESC
          </span>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[400px] overflow-y-auto py-2">
          {sections.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <span className="material-symbols-outlined text-muted-2 mb-2" style={{ fontSize: 32 }}>search_off</span>
              <div className="text-[13px] text-muted mt-2">No results for &ldquo;{query}&rdquo;</div>
            </div>
          ) : (
            sections.map((sec) => (
              <div key={sec.title}>
                <div
                  className="px-5 py-1.5 text-[10px] font-bold uppercase text-muted-2"
                  style={{ letterSpacing: '0.18em' }}
                >
                  {sec.title}
                </div>
                {sec.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.action}
                    onMouseEnter={() => setActiveIdx(item.globalIdx)}
                    className="w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors"
                    style={{
                      background: clampedIdx === item.globalIdx ? '#f1f3fe' : 'transparent',
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: 20,
                        color: clampedIdx === item.globalIdx ? '#a83900' : '#6b7280',
                      }}
                    >
                      {item.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-medium text-fg truncate">{item.label}</div>
                      {item.sublabel && (
                        <div className="text-[12px] text-muted truncate">{item.sublabel}</div>
                      )}
                    </div>
                    {clampedIdx === item.globalIdx && (
                      <span className="text-[11px] text-muted-2 flex items-center gap-1">
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>Enter</span>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>keyboard_return</span>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-5 py-2.5 text-[11px] text-muted-2"
          style={{ borderTop: '1px solid rgba(24,28,35,0.06)' }}
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_upward</span>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_downward</span>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '1px 4px', background: '#f3f4f6', borderRadius: 0 }}>Enter</span>
              select
            </span>
          </div>
          <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Hook to open palette from other components                         */
/* ------------------------------------------------------------------ */

export function useCommandPalette() {
  return {
    open: () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
    },
  }
}
