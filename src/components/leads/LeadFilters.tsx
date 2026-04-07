'use client'

import { LEAD_STATUSES, type LeadStatus, type Member } from '@/types'

export type DateRange = 'any' | '7d' | '30d' | '90d'

export type FiltersState = {
  serviceType: string // '' = all
  status: LeadStatus | ''
  dateRange: DateRange
}

export const EMPTY_FILTERS: FiltersState = {
  serviceType: '',
  status: '',
  dateRange: 'any',
}

type Props = {
  filters: FiltersState
  serviceTypes: string[]
  members: Member[]
  onChange: (next: FiltersState) => void
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
  borderRadius: 8,
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
  selectedCount,
  onClear,
  onBulkDelete,
  onBulkAssign,
  onBulkUpdateStatus,
}: Props) {
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
    <div className="flex items-center gap-3 mb-5 flex-wrap">
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
  )
}
