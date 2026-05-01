'use client'

import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ColumnDef,
  RowSelectionState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { Lead, LeadStatus } from '@/types'
import { LEAD_STATUSES } from '@/types'
import StatusBadge from './StatusBadge'

function temperatureColor(status: string): string {
  if (['Negotiation', 'Proposal Sent', 'Closed Won'].includes(status))
    return '#ef4444'
  if (['Qualified', 'Contacted'].includes(status)) return '#f59e0b'
  return '#9ca3af'
}

function SourceIcon({ source }: { source: string }) {
  const s = source.toLowerCase()
  if (s.includes('referral')) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
    )
  }
  if (s.includes('linkedin') || s.includes('ad')) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 11l18-8-8 18-2-8-8-2z" />
      </svg>
    )
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15 15 0 0 1 0 20a15 15 0 0 1 0-20z" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Inline edit cell                                                   */
/* ------------------------------------------------------------------ */

type InlineEditCellProps = {
  value: string
  onSave: (value: string) => void
  className?: string
  inputClassName?: string
  placeholder?: string
  /** Render the display state — receives onClick handler to enter edit mode */
  children?: (opts: { onDoubleClick: () => void }) => React.ReactNode
}

function InlineEditCell({ value, onSave, className, inputClassName, placeholder, children }: InlineEditCellProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  // Sync when value changes externally
  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  const commit = useCallback(() => {
    setEditing(false)
    const trimmed = draft.trim()
    if (trimmed !== value) {
      onSave(trimmed)
    }
  }, [draft, value, onSave])

  const cancel = useCallback(() => {
    setEditing(false)
    setDraft(value)
  }, [value])

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') cancel()
        }}
        className={inputClassName || 'w-full px-2 py-1 text-[13px] rounded-none border border-[#a83900]/30 bg-white outline-none focus:border-[#a83900] focus:ring-1 focus:ring-[#a83900]/20'}
        placeholder={placeholder}
      />
    )
  }

  if (children) {
    return <>{children({ onDoubleClick: () => setEditing(true) })}</>
  }

  return (
    <div
      className={`cursor-text rounded-none px-1 -mx-1 transition-colors hover:bg-[#f5f0e8]/60 ${className || ''}`}
      onDoubleClick={() => setEditing(true)}
      title="Double-click to edit"
    >
      {value || <span className="text-gray-300 italic">{placeholder || 'Empty'}</span>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Table                                                              */
/* ------------------------------------------------------------------ */

const GRID_COLS =
  'grid-cols-[40px_1.4fr_1.4fr_1fr_1fr_0.8fr_1.1fr_0.9fr_60px]'

type Props = {
  leads: Lead[]
  rowSelection: RowSelectionState
  onRowSelectionChange: (state: RowSelectionState) => void
  onView: (lead: Lead) => void
  onEdit: (lead: Lead) => void
  onDelete: (lead: Lead) => void
  onStatusChange: (lead: Lead, status: LeadStatus) => void
  onInlineEdit?: (lead: Lead, field: keyof Lead, value: string) => void
  onEnrich?: (lead: Lead) => void
  onFollowUpChange?: (lead: Lead, date: string) => void
}

export default function LeadTable({
  leads,
  rowSelection,
  onRowSelectionChange,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
  onInlineEdit,
  onEnrich,
  onFollowUpChange,
}: Props) {
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const [sorting, setSorting] = useState<SortingState>([])

  const columns = useMemo<ColumnDef<Lead>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            className="accent-[#a83900]"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="accent-[#a83900]"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
      },
      {
        id: 'contact',
        accessorKey: 'contactName',
        header: 'Contact Person',
        enableSorting: true,
        cell: ({ row }) => {
          const lead = row.original
          if (!lead.contactName && !lead.email) return null
          return (
            <div className="min-w-0">
              <InlineEditCell
                value={lead.contactName}
                onSave={(v) => onInlineEdit?.(lead, 'contactName', v)}
                placeholder="Add name"
              >
                {({ onDoubleClick }) => (
                  <div
                    className="text-[14px] font-bold text-[#181c23] truncate cursor-text rounded-none px-1 -mx-1 hover:bg-[#f5f0e8]/60 transition-colors"
                    onDoubleClick={onDoubleClick}
                    title={`${lead.contactName} — double-click to edit`}
                  >
                    {lead.contactName || <span className="text-gray-300 italic">Add name</span>}
                  </div>
                )}
              </InlineEditCell>
              <InlineEditCell
                value={lead.email}
                onSave={(v) => onInlineEdit?.(lead, 'email', v)}
                placeholder="Add email"
              >
                {({ onDoubleClick }) => (
                  <div
                    className="text-[12px] text-gray-500 truncate cursor-text rounded-none px-1 -mx-1 hover:bg-[#f5f0e8]/60 transition-colors"
                    onDoubleClick={onDoubleClick}
                    title={`${lead.email} — double-click to edit`}
                  >
                    {lead.email || <span className="text-gray-300 italic">Add email</span>}
                  </div>
                )}
              </InlineEditCell>
            </div>
          )
        },
      },
      {
        id: 'company',
        accessorKey: 'company',
        header: 'Company',
        enableSorting: true,
        cell: ({ row }) => {
          const lead = row.original
          return (
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-2 h-2 rounded-none shrink-0"
                style={{ background: temperatureColor(lead.status) }}
              />
              <InlineEditCell
                value={lead.company}
                onSave={(v) => onInlineEdit?.(lead, 'company', v)}
                placeholder="Add company"
              >
                {({ onDoubleClick }) => (
                  <div className="min-w-0 flex items-center gap-1 group/company">
                    <Link
                      href={`/leads/${lead.id}`}
                      className="text-[13px] font-medium text-[#181c23] truncate cursor-pointer hover:text-[#a83900] hover:underline"
                    >
                      {lead.company}
                    </Link>
                    <button
                      type="button"
                      onDoubleClick={onDoubleClick}
                      className="opacity-0 group-hover/company:opacity-60 hover:!opacity-100 transition-opacity shrink-0"
                      title="Double-click to edit"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#a83900' }}>edit</span>
                    </button>
                  </div>
                )}
              </InlineEditCell>
            </div>
          )
        },
      },
      {
        accessorKey: 'serviceType',
        header: 'Service Type',
        enableSorting: true,
        cell: ({ row }) => {
          const lead = row.original
          return (
            <InlineEditCell
              value={lead.serviceType}
              onSave={(v) => onInlineEdit?.(lead, 'serviceType', v)}
              placeholder="Add type"
            >
              {({ onDoubleClick }) => (
                <span
                  className="inline-block max-w-[180px] px-2.5 py-1 rounded-none text-[11px] font-semibold text-gray-700 bg-gray-100 truncate cursor-text hover:bg-gray-200 transition-colors"
                  title={`${lead.serviceType} — double-click to edit`}
                  onDoubleClick={onDoubleClick}
                >
                  {lead.serviceType || 'Add type'}
                </span>
              )}
            </InlineEditCell>
          )
        },
      },
      {
        accessorKey: 'leadSource',
        header: 'Lead Source',
        enableSorting: true,
        cell: ({ row }) => {
          const lead = row.original
          return (
            <InlineEditCell
              value={lead.leadSource}
              onSave={(v) => onInlineEdit?.(lead, 'leadSource', v)}
              placeholder="Add source"
            >
              {({ onDoubleClick }) => (
                <div
                  className="flex items-center gap-2 text-[12px] text-gray-600 cursor-text rounded-none px-1 -mx-1 hover:bg-[#f5f0e8]/60 transition-colors"
                  onDoubleClick={onDoubleClick}
                  title={`${lead.leadSource} — double-click to edit`}
                >
                  <SourceIcon source={lead.leadSource} />
                  <span className="truncate">{lead.leadSource || <span className="text-gray-300 italic">Add source</span>}</span>
                </div>
              )}
            </InlineEditCell>
          )
        },
      },
      {
        accessorKey: 'assignedTo',
        header: 'Assigned To',
        enableSorting: true,
        cell: ({ row }) => {
          const lead = row.original
          return (
            <InlineEditCell
              value={lead.assignedTo}
              onSave={(v) => onInlineEdit?.(lead, 'assignedTo', v)}
              placeholder="Unassigned"
            >
              {({ onDoubleClick }) => (
                <span
                  className="text-[12px] text-gray-600 truncate block cursor-text rounded-none px-1 -mx-1 hover:bg-[#f5f0e8]/60 transition-colors"
                  title={`${lead.assignedTo || 'Unassigned'} — double-click to edit`}
                  onDoubleClick={onDoubleClick}
                >
                  {lead.assignedTo || <span className="text-gray-300 italic">Unassigned</span>}
                </span>
              )}
            </InlineEditCell>
          )
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        enableSorting: true,
        cell: ({ row }) => {
          const lead = row.original
          if (editingStatusId === lead.id) {
            return (
              <select
                autoFocus
                defaultValue={lead.status}
                onBlur={() => setEditingStatusId(null)}
                onChange={(e) => {
                  setEditingStatusId(null)
                  onStatusChange(lead, e.target.value as LeadStatus)
                }}
                className="text-[12px] rounded-none border border-gray-200 px-2 py-1 bg-white"
              >
                {LEAD_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )
          }
          return (
            <button
              type="button"
              onClick={() => setEditingStatusId(lead.id)}
              title="Click to change status"
            >
              <StatusBadge status={lead.status} />
            </button>
          )
        },
      },
      {
        id: 'followUp',
        accessorKey: 'followUpDate',
        header: 'Follow-up',
        enableSorting: true,
        cell: ({ row }) => {
          const lead = row.original
          const dateStr = lead.followUpDate
          const today = new Date(new Date().toDateString())
          const isOverdue = dateStr && new Date(dateStr) < today
          const isToday = dateStr && new Date(dateStr).getTime() === today.getTime()
          const isSoon = dateStr && !isOverdue && !isToday && (new Date(dateStr).getTime() - today.getTime()) <= 3 * 86400000

          if (dateStr) {
            const d = new Date(dateStr + 'T00:00:00')
            const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            return (
              <div className="flex items-center gap-1.5 group/followup">
                <span
                  className="text-[12px] font-semibold px-1.5 py-0.5"
                  style={{
                    background: isOverdue ? '#fef2f2' : isToday ? '#fffbeb' : isSoon ? '#faf8f5' : 'transparent',
                    color: isOverdue ? '#dc2626' : isToday ? '#BA7517' : '#181c23',
                  }}
                  title={isOverdue ? 'Overdue!' : isToday ? 'Today' : dateStr}
                >
                  <span className="material-symbols-outlined align-middle mr-0.5" style={{ fontSize: 13, color: isOverdue ? '#dc2626' : '#a83900' }}>calendar_month</span>
                  {label}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const newDate = prompt('New follow-up date (YYYY-MM-DD):', dateStr)
                    if (newDate === null) return
                    onFollowUpChange?.(lead, newDate)
                  }}
                  className="opacity-0 group-hover/followup:opacity-60 hover:!opacity-100 transition-opacity"
                  title="Change date"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#a83900' }}>edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => onFollowUpChange?.(lead, '')}
                  className="opacity-0 group-hover/followup:opacity-60 hover:!opacity-100 transition-opacity"
                  title="Clear follow-up"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#888' }}>close</span>
                </button>
              </div>
            )
          }

          return (
            <button
              type="button"
              onClick={() => {
                const newDate = prompt('Set follow-up date (YYYY-MM-DD):')
                if (newDate) onFollowUpChange?.(lead, newDate)
              }}
              className="text-[11px] text-gray-300 hover:text-[#a83900] transition-colors flex items-center gap-1"
              title="Set follow-up date"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>add_circle</span>
              <span className="italic">Set date</span>
            </button>
          )
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const lead = row.original
          const isOpen = openMenuId === lead.id
          return (
            <div className="flex justify-end items-center gap-1">
              <button
                className={`p-1 transition-colors ${isOpen ? 'text-[#a83900]' : 'text-gray-400 hover:text-[#a83900]'}`}
                title="Actions"
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  if (isOpen) {
                    setOpenMenuId(null)
                  } else {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                    setMenuPos({ top: rect.bottom + 4, left: rect.right - 144 })
                    setOpenMenuId(lead.id)
                  }
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="5" cy="12" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="19" cy="12" r="2" />
                </svg>
              </button>
            </div>
          )
        },
      },
    ],
    [editingStatusId, openMenuId, onView, onEdit, onDelete, onStatusChange, onInlineEdit, onEnrich, onFollowUpChange]
  )

  const table = useReactTable({
    data: leads,
    columns,
    state: { rowSelection, sorting },
    enableRowSelection: true,
    getRowId: (row) => row.id,
    onRowSelectionChange: (updater) => {
      const next =
        typeof updater === 'function' ? updater(rowSelection) : updater
      onRowSelectionChange(next)
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <>
    <div className="rounded-none overflow-visible">
      {table.getHeaderGroups().map((hg) => (
        <div
          key={hg.id}
          className={`grid ${GRID_COLS} px-5 py-3 text-[11px] font-bold tracking-wider text-gray-500 uppercase`}
        >
          {hg.headers.map((header) => (
            <div
              key={header.id}
              className={`min-w-0 overflow-hidden ${header.column.getCanSort() ? 'cursor-pointer select-none flex items-center gap-1' : ''}`}
              onClick={header.column.getToggleSortingHandler()}
            >
              {header.isPlaceholder
                ? null
                : flexRender(header.column.columnDef.header, header.getContext())}
              {header.column.getCanSort() && (
                <span className="text-[10px]">
                  {{ asc: '▲', desc: '▼' }[header.column.getIsSorted() as string] ?? '⇅'}
                </span>
              )}
            </div>
          ))}
        </div>
      ))}

      <div className="flex flex-col gap-1">
        {table.getRowModel().rows.map((row) => (
          <div
            key={row.id}
            className={`grid ${GRID_COLS} items-center px-5 py-3 rounded-none transition-colors hover:bg-[#ebedf8]`}
            style={row.getIsSelected() ? { background: '#ebedf8' } : undefined}
          >
            {row.getVisibleCells().map((cell) => (
              <div key={cell.id} className="min-w-0 overflow-hidden">
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </div>
            ))}
          </div>
        ))}
        {leads.length === 0 && (
          <div className="px-5 py-12 text-center text-sm text-gray-500">
            No leads match the current filters.
          </div>
        )}
      </div>

    </div>

    {/* Fixed-position action menu — rendered outside table to avoid overflow clipping */}
    {openMenuId && (() => {
      const lead = leads.find((l) => l.id === openMenuId)
      if (!lead) return null
      return (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
          <div
            className="fixed z-50 w-36 bg-white rounded-none py-1 text-[13px]"
            style={{
              top: menuPos.top,
              left: menuPos.left,
              boxShadow: '0 8px 24px rgba(15,15,30,0.12)',
              border: '1px solid #e5e8f3',
            }}
          >
            <button
              className="w-full text-left px-3 py-2 hover:bg-[#ebedf8]"
              onClick={() => { setOpenMenuId(null); onEdit(lead) }}
            >
              Edit
            </button>
            <button
              className="w-full text-left px-3 py-2 hover:bg-[#ebedf8]"
              onClick={() => { setOpenMenuId(null); onView(lead) }}
            >
              View
            </button>
            <button
              className="w-full text-left px-3 py-2 hover:bg-[#ebedf8] text-red-600"
              onClick={() => {
                setOpenMenuId(null)
                if (confirm(`Delete ${lead.contactName || lead.company}?`)) onDelete(lead)
              }}
            >
              Delete
            </button>
          </div>
        </>
      )
    })()}
    </>
  )
}
