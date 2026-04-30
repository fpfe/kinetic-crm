'use client'

import Link from 'next/link'
import { Draggable } from '@hello-pangea/dnd'
import type { Lead } from '@/types'

const AVATAR_PALETTE = [
  '#a83900',
  '#378ADD',
  '#1D9E75',
  '#BA7517',
  '#685588',
  '#b60056',
  '#5F5E5A',
]

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const second = parts[1]?.[0] ?? ''
  return (first + second).toUpperCase() || '??'
}

function colorOf(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length]
}

function formatDealValue(v: string): string {
  const n = Number(v)
  if (!v || !Number.isFinite(n) || n === 0) return '¥—'
  return `¥${(n / 1_000_000).toFixed(1)}M`
}

function daysSince(iso: string): number {
  if (!iso) return 0
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return 0
  return Math.max(0, Math.floor((Date.now() - t) / 86400000))
}

const STALE_DAYS = 7

const TAG_COLORS = [
  { bg: '#ece6f4', text: '#685588' },
  { bg: '#dbeafe', text: '#1d4ed8' },
  { bg: '#dcfce7', text: '#166534' },
  { bg: '#fef3c7', text: '#92400e' },
  { bg: '#fce7f3', text: '#9d174d' },
  { bg: '#e0e7ff', text: '#3730a3' },
]

function parseTags(tags: string): string[] {
  if (!tags) return []
  return tags.split(',').map((t) => t.trim()).filter(Boolean)
}

function tagColor(tag: string) {
  let hash = 0
  for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) | 0
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

function FooterActivity({ lead }: { lead: Lead }) {
  if (lead.status === 'Negotiation') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-hot-dark">
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>priority_high</span>
        Decision Pending
      </span>
    )
  }
  if (lead.status === 'Closed Won') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success">
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check_circle</span>
        Closed Won
      </span>
    )
  }
  if (lead.status === 'Closed Lost') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted">
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>cancel</span>
        Closed Lost
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted">
      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>schedule</span>
      {daysSince(lead.createdAt)}d
    </span>
  )
}

type Props = { lead: Lead; index: number; compact?: boolean }

export default function PipelineCard({ lead, index, compact = false }: Props) {
  const isHot = lead.status === 'Negotiation' || lead.status === 'Proposal Sent'
  const isClosed = lead.status === 'Closed Won' || lead.status === 'Closed Lost'
  const age = daysSince(lead.createdAt)
  const isStale = !isClosed && age >= STALE_DAYS

  return (
    <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="bg-white relative transition-transform group"
          style={{
            borderRadius: 0,
            padding: compact ? '0.75rem 1rem' : '1.25rem',
            border: '1px solid transparent',
            cursor: snapshot.isDragging ? 'grabbing' : 'grab',
            boxShadow: snapshot.isDragging
              ? '0 12px 32px rgba(0,0,0,0.12)'
              : 'none',
            transform: provided.draggableProps.style?.transform,
            ...(isHot
              ? { borderLeft: '4px solid #e4006d' }
              : isStale
                ? { borderLeft: '4px solid #f59e0b' }
                : {}),
            ...provided.draggableProps.style,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(168,57,0,0.10)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'transparent'
          }}
        >
          {/* Quick actions — visible on hover */}
          <div
            className="absolute top-2 right-2 hidden group-hover:flex items-center gap-1 z-10 bg-white px-1 py-0.5"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
          >
            {lead.email && lead.email !== 'N/a' && (
              <button
                type="button"
                title="Send email"
                className="p-1.5 text-gray-400 hover:text-brand transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  window.open(
                    `https://mail.google.com/mail/?authuser=juns810208@gmail.com&view=cm&to=${encodeURIComponent(lead.email)}`,
                    'gmail_compose',
                    'width=680,height=600,left=200,top=100'
                  )
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>mail</span>
              </button>
            )}
            <Link
              href={`/leads/${lead.id}`}
              title="View details"
              className="p-1.5 text-gray-400 hover:text-brand transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>visibility</span>
            </Link>
          </div>

          {compact ? (
            <div className="flex flex-col" style={{ minHeight: 56 }}>
              {/* Compact view: company + deal value + minimal info */}
              <div className="flex items-center justify-between">
                <Link
                  href={`/leads/${lead.id}`}
                  className="text-[13px] font-bold text-[#181c23] hover:text-[#a83900] truncate flex-1 min-w-0"
                >
                  {lead.company}
                </Link>
                <span className="material-symbols-outlined group-hover:opacity-0 transition-opacity ml-2 shrink-0" style={{ fontSize: 14, opacity: 0.2 }}>drag_indicator</span>
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[10px] text-gray-500 truncate">{lead.contactName}</span>
                <span className="text-[11px] font-bold text-[#181c23] shrink-0">{formatDealValue(lead.dealValue)}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap" style={{ minHeight: 18 }}>
                {isHot && (
                  <span className="px-1.5 py-0.5 rounded-none text-[8px] font-bold uppercase bg-hot-soft text-hot-dark" style={{ letterSpacing: '0.12em' }}>Hot</span>
                )}
                {isStale && (
                  <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase" style={{ background: '#fef3c7', color: '#92400e', letterSpacing: '0.12em' }}>{age}d</span>
                )}
                {parseTags(lead.tags).slice(0, 2).map((tag) => {
                  const c = tagColor(tag)
                  return (
                    <span key={tag} className="px-1.5 py-0.5 text-[8px] font-bold rounded-none" style={{ background: c.bg, color: c.text }}>{tag}</span>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col" style={{ minHeight: 150 }}>
              {/* Detailed view: fixed-height card layout */}
              {/* Row 1: Service type + badges */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <div
                    className="text-[9px] uppercase font-bold text-pipe-purple truncate"
                    style={{ letterSpacing: '0.14em' }}
                  >
                    {lead.serviceType}
                  </div>
                  {isHot && (
                    <span className="px-1.5 py-0.5 rounded-none text-[8px] font-bold uppercase bg-hot-soft text-hot-dark shrink-0" style={{ letterSpacing: '0.1em' }}>Hot</span>
                  )}
                  {isStale && (
                    <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase shrink-0" style={{ background: '#fef3c7', color: '#92400e', letterSpacing: '0.1em' }}>{age}d</span>
                  )}
                </div>
                <span className="material-symbols-outlined group-hover:opacity-0 transition-opacity shrink-0" style={{ fontSize: 14, opacity: 0.2 }}>drag_indicator</span>
              </div>

              {/* Row 2: Company name */}
              <Link
                href={`/leads/${lead.id}`}
                className="block text-[13px] font-bold text-[#181c23] hover:text-[#a83900] mt-2 line-clamp-2"
              >
                {lead.company}
              </Link>

              {/* Row 3: Tags */}
              {parseTags(lead.tags).length > 0 && (
                <div className="flex items-center gap-1 mt-2 flex-wrap">
                  {parseTags(lead.tags).slice(0, 3).map((tag) => {
                    const c = tagColor(tag)
                    return (
                      <span key={tag} className="px-1.5 py-0.5 text-[8px] font-bold rounded-none" style={{ background: c.bg, color: c.text }}>{tag}</span>
                    )
                  })}
                </div>
              )}

              {/* Row 4: Contact — pushed to middle with flex-grow */}
              <div className="flex items-center gap-2 mt-auto pt-3">
                <div
                  className="w-7 h-7 rounded-none flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                  style={{ background: colorOf(lead.contactName) }}
                >
                  {initialsOf(lead.contactName)}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] text-gray-400">Contact</span>
                  <span className="text-[11px] font-semibold text-[#181c23] truncate">
                    {lead.contactName}
                  </span>
                </div>
              </div>

              {/* Row 4: Footer — always at bottom */}
              <div className="flex items-center justify-between mt-3 pt-2" style={{ borderTop: '1px solid #f0f0ed' }}>
                <FooterActivity lead={lead} />
                <span className="text-[11px] font-bold text-[#181c23]">{formatDealValue(lead.dealValue)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </Draggable>
  )
}
