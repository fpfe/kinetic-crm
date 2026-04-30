'use client'

import { useState, useEffect, useCallback } from 'react'
import { LEAD_STATUSES, type LeadStatus, type Member } from '@/types'

export type DateRange = 'any' | '7d' | '30d' | '90d'

export type FiltersState = {
  serviceType: string // '' = all
  status: LeadStatus | ''
  dateRange: DateRange
  assignedTo: string // '' = all
}

export const EMPTY_FILTERS: FiltersState = {
  serviceType: '',
  status: '',
  dateRange: 'any',
  assignedTo: '',
}

/* ------------------------------------------------------------------ */
/*  Saved Views                                                        */
/* ------------------------------------------------------------------ */

type SavedView = {
  id: string
  name: string
  filters: FiltersState
  search: string
}

const LS_VIEWS = 'crm-saved-views'

function loadViews(): SavedView[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(LS_VIEWS)
    return raw ? (JSON.parse(raw) as SavedView[]) : []
  } catch {
    return []
  }
}

function persistViews(views: SavedView[]) {
  window.localStorage.setItem(LS_VIEWS, JSON.stringify(views))
}

function filtersAreEmpty(f: FiltersState, search: string): boolean {
  return (
    f.serviceType === '' &&
    f.status === '' &&
    f.dateRange === 'any' &&
    f.assignedTo === '' &&
    search.trim() === ''
  )
}

function filtersMatch(a: FiltersState, aSearch: string, b: FiltersState, bSearch: string): boolean {
  return (
    a.serviceType === b.serviceType &&
    a.status === b.status &&
    a.dateRange === b.dateRange &&
    a.assignedTo === b.assignedTo &&
    aSearch.trim() === bSearch.trim()
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

type Props = {
  filters: FiltersState
  serviceTypes: string[]
  members: Member[]
  onChange: (next: FiltersState) => void
  search: string
  onSearchChange: (value: string) => void
  selectedCount: number
  onClear: () => void
  onBulkDelete: () => void
  onBulkAssign: (memberName: string) => void
  onBulkUpdateStatus: (status: LeadStatus) => void
}

const pillSelectStyle: React.CSSProperties = {
  appearance: 'none',
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: 0,
  padding: '7px 30px 7px 14px',
  fontSize: 13,
  fontWeight: 500,
  color: '#374151',
  cursor: 'pointer',
  backgroundImage:
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5'><path d='m6 9 6 6 6-6'/></svg>\")",
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
}

export default function LeadFilters({
  filters,
  serviceTypes,
  members,
  onChange,
  search,
  onSearchChange,
  selectedCount,
  onClear,
  onBulkDelete,
  onBulkAssign,
  onBulkUpdateStatus,
}: Props) {
  const [views, setViews] = useState<SavedView[]>([])
  const [activeViewId, setActiveViewId] = useState<string | null>(null)
  const [showSaveInput, setShowSaveInput] = useState(false)
  const [saveName, setSaveName] = useState('')

  // Hydrate saved views on mount
  useEffect(() => {
    setViews(loadViews())
  }, [])

  // Detect when filters drift from active view
  useEffect(() => {
    if (!activeViewId) return
    const view = views.find((v) => v.id === activeViewId)
    if (view && !filtersMatch(filters, search, view.filters, view.search)) {
      setActiveViewId(null)
    }
  }, [filters, search, activeViewId, views])

  const saveView = useCallback(() => {
    const name = saveName.trim()
    if (!name) return
    const newView: SavedView = {
      id: `view-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      filters: { ...filters },
      search: search.trim(),
    }
    const next = [...views, newView]
    setViews(next)
    persistViews(next)
    setActiveViewId(newView.id)
    setShowSaveInput(false)
    setSaveName('')
  }, [saveName, filters, search, views])

  const loadView = useCallback((view: SavedView) => {
    onChange(view.filters)
    onSearchChange(view.search)
    setActiveViewId(view.id)
  }, [onChange, onSearchChange])

  const deleteView = useCallback((id: string) => {
    const next = views.filter((v) => v.id !== id)
    setViews(next)
    persistViews(next)
    if (activeViewId === id) setActiveViewId(null)
  }, [views, activeViewId])

  const hasActiveFilters = !filtersAreEmpty(filters, search)

  const inlineSelectStyle: React.CSSProperties = {
    ...pillSelectStyle,
    border: 'none',
    background: 'transparent',
    color: '#a83900',
    fontWeight: 600,
    padding: '0 18px 0 0',
    backgroundPosition: 'right 0 center',
    backgroundImage:
      "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a83900' stroke-width='2.5'><path d='m6 9 6 6 6-6'/></svg>\")",
  }

  return (
    <div>
      {/* Saved Views bar */}
      {(views.length > 0 || hasActiveFilters) && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-[10px] tracking-[0.18em] font-bold text-gray-400 uppercase mr-1">Views</span>

          {views.map((view) => (
            <div
              key={view.id}
              className="flex items-center gap-0 group"
            >
              <button
                type="button"
                onClick={() => loadView(view)}
                className="px-3 py-1.5 text-[12px] font-semibold rounded-none transition-colors"
                style={
                  activeViewId === view.id
                    ? { background: '#a83900', color: '#fff' }
                    : { background: '#f3f4f6', color: '#4b5563' }
                }
              >
                {view.name}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  deleteView(view.id)
                }}
                className="px-1 py-1.5 text-[11px] rounded-none opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-600"
                title="Delete view"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
              </button>
            </div>
          ))}

          {/* Save current filter as view */}
          {hasActiveFilters && !activeViewId && (
            <>
              {showSaveInput ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveView()
                      if (e.key === 'Escape') {
                        setShowSaveInput(false)
                        setSaveName('')
                      }
                    }}
                    placeholder="View name..."
                    autoFocus
                    className="px-2 py-1 text-[12px] border border-[#a83900]/30 rounded-none bg-white outline-none focus:border-[#a83900] w-[140px]"
                  />
                  <button
                    type="button"
                    onClick={saveView}
                    disabled={!saveName.trim()}
                    className="px-2 py-1 text-[11px] font-bold text-white bg-[#a83900] rounded-none disabled:opacity-40"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowSaveInput(false); setSaveName('') }}
                    className="px-1 py-1 text-[11px] text-gray-400 hover:text-gray-600"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSaveInput(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-[#a83900] rounded-none border border-dashed border-[#a83900]/30 hover:bg-[#a83900]/5 transition-colors"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>bookmark_add</span>
                  Save View
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Filter controls */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative">
          <span
            className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            style={{ fontSize: 16 }}
          >
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search leads..."
            className="pl-9 pr-3 py-[7px] text-[13px] font-medium text-gray-700 bg-white border border-gray-200 rounded-none focus:outline-none focus:border-[#a83900] focus:ring-1 focus:ring-[#a83900] w-[200px]"
          />
        </div>

        <select
          style={pillSelectStyle}
          value={filters.serviceType}
          onChange={(e) => onChange({ ...filters, serviceType: e.target.value })}
        >
          <option value="">Service Type · All</option>
          {serviceTypes.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          style={pillSelectStyle}
          value={filters.status}
          onChange={(e) =>
            onChange({ ...filters, status: e.target.value as LeadStatus | '' })
          }
        >
          <option value="">Lead Status · All</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          style={pillSelectStyle}
          value={filters.dateRange}
          onChange={(e) =>
            onChange({ ...filters, dateRange: e.target.value as DateRange })
          }
        >
          <option value="any">Date Added · Any time</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>

        <select
          style={pillSelectStyle}
          value={filters.assignedTo}
          onChange={(e) =>
            onChange({ ...filters, assignedTo: e.target.value })
          }
        >
          <option value="">Assigned To · All</option>
          {members.map((m) => (
            <option key={m.id} value={m.name}>
              {m.name}
            </option>
          ))}
        </select>

        {selectedCount > 0 && (
          <div className="flex items-center gap-4 ml-2">
            <span className="text-[12px] text-gray-500">
              {selectedCount} selected:
            </span>
            <select
              value=""
              onChange={(e) => {
                const v = e.target.value
                if (v) onBulkAssign(v)
                e.target.value = ''
              }}
              style={inlineSelectStyle}
            >
              <option value="">Assign</option>
              {members.length === 0 && (
                <option value="" disabled>
                  No members registered
                </option>
              )}
              {members.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name}
                  {m.businessTitle ? ` — ${m.businessTitle}` : ''}
                </option>
              ))}
            </select>
            <select
              value=""
              onChange={(e) => {
                const v = e.target.value as LeadStatus
                if (v) onBulkUpdateStatus(v)
                e.target.value = ''
              }}
              style={inlineSelectStyle}
            >
              <option value="">Update Status</option>
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              onClick={onBulkDelete}
              className="text-[13px] font-semibold text-[#a83900] hover:underline"
            >
              Delete
            </button>
          </div>
        )}

        <div className="ml-auto">
          <button
            onClick={onClear}
            className="text-[13px] font-semibold text-[#a83900] hover:underline"
          >
            Clear All
          </button>
        </div>
      </div>
    </div>
  )
}
