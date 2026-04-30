'use client'

import { useState, useEffect, useMemo } from 'react'
import type { Lead, LeadStatus } from '@/types'
import PipelineBoard from '@/components/pipeline/PipelineBoard'

export type CardView = 'detailed' | 'compact'

const LS_VIEW = 'crm-pipeline-view'

function loadView(): CardView {
  if (typeof window === 'undefined') return 'detailed'
  return (localStorage.getItem(LS_VIEW) as CardView) || 'detailed'
}

type PipelineFilters = {
  serviceType: string
  region: string
  assignedTo: string
}

const EMPTY_FILTERS: PipelineFilters = { serviceType: '', region: '', assignedTo: '' }

export default function PipelinePage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalStatus, setModalStatus] = useState<LeadStatus | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [cardView, setCardView] = useState<CardView>('detailed')
  const [filterOpen, setFilterOpen] = useState(false)
  const [filters, setFilters] = useState<PipelineFilters>(EMPTY_FILTERS)

  useEffect(() => {
    setCardView(loadView())
  }, [])

  function toggleView(v: CardView) {
    setCardView(v)
    localStorage.setItem(LS_VIEW, v)
  }

  // Derive unique filter options from leads
  const filterOptions = useMemo(() => {
    const serviceTypes = [...new Set(leads.map((l) => l.serviceType).filter(Boolean))].sort()
    const regions = [...new Set(leads.map((l) => l.region).filter(Boolean))].sort()
    const assignees = [...new Set(leads.map((l) => l.assignedTo).filter(Boolean))].sort()
    return { serviceTypes, regions, assignees }
  }, [leads])

  const hasFilters = filters.serviceType || filters.region || filters.assignedTo
  const activeFilterCount = [filters.serviceType, filters.region, filters.assignedTo].filter(Boolean).length

  // Filter leads for display value (the board also receives filters)
  const displayLeads = useMemo(() => {
    return leads.filter((l) => {
      if (filters.serviceType && l.serviceType !== filters.serviceType) return false
      if (filters.region && l.region !== filters.region) return false
      if (filters.assignedTo && l.assignedTo !== filters.assignedTo) return false
      return true
    })
  }, [leads, filters])

  const totalValue = displayLeads.reduce((sum, l) => sum + (Number(l.dealValue) || 0), 0)
  const formattedValue =
    '¥' + totalValue.toLocaleString('en-US') + ' Pipeline Value'

  function openModal(status: LeadStatus | null) {
    setModalStatus(status)
    setModalOpen(true)
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 sm:mb-8 gap-3">
        <div>
          <div
            className="text-[10px] sm:text-[11px] uppercase font-bold tracking-[0.18em]"
            style={{ color: '#a83900' }}
          >
            Sales Pipeline
          </div>
          <h1
            className="font-display font-extrabold text-[#181c23] mt-1 sm:mt-2"
            style={{
              fontFamily: '"Work Sans", system-ui, sans-serif',
              fontSize: 'clamp(1.5rem, 5vw, 2.5rem)',
              lineHeight: 1.1,
            }}
          >
            Sales Momentum
          </h1>
          <div className="mt-1 sm:mt-2 text-[12px] sm:text-[14px] text-gray-500">
            Q2 Japan Expansion •{' '}
            <span style={{ color: '#a83900' }} className="font-semibold">
              {formattedValue}
            </span>
            {hasFilters && (
              <span className="text-[11px] text-muted ml-2">
                ({displayLeads.length} of {leads.length} leads)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* View toggle */}
          <div className="flex items-center rounded-none overflow-hidden" style={{ border: '1px solid #e5e8f3' }}>
            <button
              type="button"
              onClick={() => toggleView('detailed')}
              className="px-2 sm:px-3 py-2 flex items-center gap-1.5 text-[12px] font-semibold transition-colors"
              style={{
                background: cardView === 'detailed' ? '#181c23' : '#fff',
                color: cardView === 'detailed' ? '#fff' : '#6b7280',
              }}
              title="Detailed view"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>view_agenda</span>
              <span className="hidden sm:inline">Detailed</span>
            </button>
            <button
              type="button"
              onClick={() => toggleView('compact')}
              className="px-2 sm:px-3 py-2 flex items-center gap-1.5 text-[12px] font-semibold transition-colors"
              style={{
                background: cardView === 'compact' ? '#181c23' : '#fff',
                color: cardView === 'compact' ? '#fff' : '#6b7280',
              }}
              title="Compact view"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>view_list</span>
              <span className="hidden sm:inline">Compact</span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => setFilterOpen((o) => !o)}
            className="inline-flex items-center gap-2 bg-white text-[13px] font-semibold text-[#181c23] px-3 sm:px-5 py-2 sm:py-2.5 rounded-none transition-colors"
            style={{
              border: hasFilters ? '1px solid #a83900' : '1px solid #e5e8f3',
              color: hasFilters ? '#a83900' : '#181c23',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>filter_list</span>
            <span className="hidden sm:inline">Filter</span>
            {activeFilterCount > 0 && (
              <span
                className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded-none"
                style={{ background: '#a83900' }}
              >
                {activeFilterCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => openModal(null)}
            className="brand-gradient text-white text-[12px] sm:text-[13px] font-semibold px-3 sm:px-5 py-2 sm:py-2.5 rounded-none"
            style={{
              background: 'linear-gradient(135deg, #a83900 0%, #ff5a00 100%)',
            }}
          >
            + New Merchant
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {filterOpen && (
        <div
          className="mb-4 p-4 bg-white flex flex-wrap items-end gap-4"
          style={{ border: '1px solid #e5e8f3' }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-muted tracking-wider">Service Type</label>
            <select
              value={filters.serviceType}
              onChange={(e) => setFilters((f) => ({ ...f, serviceType: e.target.value }))}
              className="text-[12px] px-3 py-2 rounded-none bg-white"
              style={{ border: '1px solid #e5e8f3', minWidth: 160 }}
            >
              <option value="">All</option>
              {filterOptions.serviceTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-muted tracking-wider">Region</label>
            <select
              value={filters.region}
              onChange={(e) => setFilters((f) => ({ ...f, region: e.target.value }))}
              className="text-[12px] px-3 py-2 rounded-none bg-white"
              style={{ border: '1px solid #e5e8f3', minWidth: 140 }}
            >
              <option value="">All</option>
              {filterOptions.regions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-muted tracking-wider">Assigned To</label>
            <select
              value={filters.assignedTo}
              onChange={(e) => setFilters((f) => ({ ...f, assignedTo: e.target.value }))}
              className="text-[12px] px-3 py-2 rounded-none bg-white"
              style={{ border: '1px solid #e5e8f3', minWidth: 140 }}
            >
              <option value="">All</option>
              {filterOptions.assignees.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="text-[12px] font-semibold text-brand hover:underline px-2 py-2"
            >
              Clear All
            </button>
          )}
        </div>
      )}

      <PipelineBoard
        modalOpen={modalOpen}
        modalInitialStatus={modalStatus}
        onModalClose={() => setModalOpen(false)}
        onOpenAddModal={openModal}
        onLeadsChange={setLeads}
        cardView={cardView}
        filters={filters}
      />
    </div>
  )
}
