'use client'

import { Droppable } from '@hello-pangea/dnd'
import type { Lead, LeadStatus } from '@/types'
import type { CardView } from '@/app/pipeline/page'
import PipelineCard from './PipelineCard'

export type ColumnDef = {
  id: LeadStatus
  label: string
  color: string
}

type Props = {
  column: ColumnDef
  leads: Lead[]
  onAddLead: (status: LeadStatus) => void
  cardView?: CardView
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function formatYen(n: number): string {
  if (n === 0) return '¥—'
  return `¥${(n / 1_000_000).toFixed(1)}M`
}

export default function PipelineColumn({ column, leads, onAddLead, cardView = 'detailed' }: Props) {
  const totalValue = leads.reduce((sum, l) => sum + (Number(l.dealValue) || 0), 0)
  return (
    <div className="flex flex-col shrink-0 w-[160px] sm:w-auto sm:shrink sm:flex-1 sm:min-w-0">
      <div className="flex items-center justify-between px-1 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="text-[10px] uppercase font-bold text-fg/40 truncate"
            style={{ letterSpacing: '0.14em' }}
          >
            {column.label}
          </span>
          <span
            className="rounded-none px-1.5 py-0.5 text-[9px] font-bold text-muted bg-surface-lilac shrink-0"
          >
            {pad2(leads.length)}
          </span>
        </div>
        <span className="text-[10px] font-bold text-brand shrink-0">
          {formatYen(totalValue)}
        </span>
      </div>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex flex-col gap-3 p-2 rounded-none transition-colors"
            style={{
              minHeight: 200,
              background: snapshot.isDraggingOver ? '#f1f3fe' : 'transparent',
            }}
          >
            <button
              type="button"
              onClick={() => onAddLead(column.id)}
              className="w-full text-[12px] text-gray-500 py-2.5 rounded-none transition-colors"
              style={{
                border: '1.5px dashed #d4d7e8',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#a83900'
                e.currentTarget.style.color = '#a83900'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#d4d7e8'
                e.currentTarget.style.color = '#6b7280'
              }}
            >
              + Add lead
            </button>

            {leads.map((lead, idx) => (
              <PipelineCard key={lead.id} lead={lead} index={idx} compact={cardView === 'compact'} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  )
}
