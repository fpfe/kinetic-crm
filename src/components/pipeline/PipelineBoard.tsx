'use client'

import { useEffect, useState } from 'react'
import { DragDropContext, type DropResult } from '@hello-pangea/dnd'
import type { Lead, LeadStatus } from '@/types'
import LeadFormModal from '@/components/leads/LeadFormModal'
import PipelineColumn, { type ColumnDef } from './PipelineColumn'
import PipelineStats from './PipelineStats'
import type { CardView } from '@/app/pipeline/page'

const COLUMNS: ColumnDef[] = [
  { id: 'New', label: 'Prospecting', color: '#888780' },
  { id: 'Contacted', label: 'Contacted', color: '#378ADD' },
  { id: 'Qualified', label: 'Qualification', color: '#1D9E75' },
  { id: 'Proposal Sent', label: 'Proposal', color: '#BA7517' },
  { id: 'Negotiation', label: 'Negotiation', color: '#685588' },
  { id: 'Closed Won', label: 'Closed Won', color: '#a83900' },
  { id: 'Closed Lost', label: 'Closed Lost', color: '#5F5E5A' },
]

export { COLUMNS }

type PipelineFilters = {
  serviceType: string
  region: string
  assignedTo: string
}

type Props = {
  modalOpen: boolean
  modalInitialStatus: LeadStatus | null
  onModalClose: () => void
  onOpenAddModal: (status: LeadStatus | null) => void
  onLeadsChange?: (leads: Lead[]) => void
  cardView?: CardView
  filters?: PipelineFilters
}

export default function PipelineBoard({
  modalOpen,
  modalInitialStatus,
  onModalClose,
  onOpenAddModal,
  onLeadsChange,
  cardView = 'detailed',
  filters,
}: Props) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/leads')
      .then((r) => r.json())
      .then((data: unknown) => {
        if (!alive) return
        const safe: Lead[] = Array.isArray(data) ? (data as Lead[]) : []
        setLeads(safe)
        onLeadsChange?.(safe)
      })
      .catch((e) => alive && setError((e as Error).message))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function updateLeads(next: Lead[]) {
    setLeads(next)
    onLeadsChange?.(next)
  }

  async function onDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result
    if (!destination) return
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return

    const newStatus = destination.droppableId as LeadStatus
    const prev = leads
    const next = leads.map((l) =>
      l.id === draggableId ? { ...l, status: newStatus } : l
    )
    updateLeads(next)

    try {
      const res = await fetch(`/api/leads/${draggableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Failed to update status')
    } catch (e) {
      updateLeads(prev)
      setError((e as Error).message)
    }
  }

  // Apply filters
  const filtered = filters
    ? leads.filter((l) => {
        if (filters.serviceType && l.serviceType !== filters.serviceType) return false
        if (filters.region && l.region !== filters.region) return false
        if (filters.assignedTo && l.assignedTo !== filters.assignedTo) return false
        return true
      })
    : leads

  const grouped: Record<LeadStatus, Lead[]> = {
    New: [],
    Contacted: [],
    Qualified: [],
    'Proposal Sent': [],
    Negotiation: [],
    'Closed Won': [],
    'Closed Lost': [],
  }
  for (const l of filtered) {
    if (grouped[l.status]) grouped[l.status].push(l)
  }

  if (loading) {
    return (
      <div className="flex gap-3 pb-12 overflow-x-auto lg:overflow-x-visible">
        {COLUMNS.map((c) => (
          <div
            key={c.id}
            className="min-w-[140px] sm:min-w-0 sm:flex-1 flex flex-col gap-3"
          >
            <div className="h-5 w-32 bg-[#ebedf8] rounded-none animate-pulse" />
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-32 bg-[#ebedf8] rounded-none animate-pulse"
              />
            ))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      {error && (
        <div className="mb-4 text-[12px] text-red-600 bg-red-50 px-3 py-2 rounded-none flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => {
              setError(null)
              setLoading(true)
              fetch('/api/leads')
                .then((r) => r.json())
                .then((data: unknown) => {
                  const safe: Lead[] = Array.isArray(data) ? (data as Lead[]) : []
                  updateLeads(safe)
                })
                .catch((e) => setError((e as Error).message))
                .finally(() => setLoading(false))
            }}
            className="ml-4 underline font-semibold hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}
      <DragDropContext onDragEnd={onDragEnd}>
        <div
          className="flex pb-12 overflow-x-auto lg:overflow-x-visible"
          style={{ gap: 12 }}
        >
          {COLUMNS.map((col) => (
            <PipelineColumn
              key={col.id}
              column={col}
              leads={grouped[col.id]}
              onAddLead={(status) => onOpenAddModal(status)}
              cardView={cardView}
            />
          ))}
        </div>
      </DragDropContext>

      <PipelineStats leads={leads} />

      <LeadFormModal
        open={modalOpen}
        mode="create"
        initial={
          modalInitialStatus
            ? ({ status: modalInitialStatus } as Lead)
            : null
        }
        onClose={onModalClose}
        onSaved={(lead) => {
          updateLeads([...leads, lead])
          onModalClose()
        }}
      />
    </>
  )
}
