'use client'

import type { Lead } from '@/types'
import StatusBadge from './StatusBadge'

type Props = {
  open: boolean
  lead: Lead | null
  onClose: () => void
  onEdit?: (lead: Lead) => void
}

export default function ViewLeadModal({ open, lead, onClose, onEdit }: Props) {
  if (!open || !lead) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(15,15,30,0.4)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-none w-full max-w-[520px] max-h-[90vh] overflow-y-auto p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <div className="text-[10px] tracking-[0.18em] uppercase font-bold text-[#a83900]">
              Lead Details
            </div>
            <h2 className="font-display font-extrabold text-2xl text-[#181c23] mt-1">
              {lead.contactName || lead.company}
            </h2>
            {lead.contactName && lead.company && (
              <div className="text-sm text-gray-500">{lead.company}</div>
            )}
          </div>
          <StatusBadge status={lead.status} />
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-[13px]">
          <Row label="Email" value={lead.email} link={lead.email ? `https://mail.google.com/mail/?authuser=juns810208@gmail.com&view=cm&to=${encodeURIComponent(lead.email)}` : undefined} newTab={false} />
          <Row label="Phone" value={lead.phone} link={lead.phone ? `tel:${lead.phone}` : undefined} />
          <Row label="Service Type" value={lead.serviceType} />
          <Row label="Lead Source" value={lead.leadSource} />
          <Row label="Region" value={lead.region} />
          <Row label="Assigned To" value={lead.assignedTo} />
          <Row label="Deal Value" value={lead.dealValue} />
          <Row
            label="Created"
            value={
              lead.createdAt
                ? new Date(lead.createdAt).toLocaleString()
                : '—'
            }
          />
        </dl>

        {lead.notes && (
          <div className="mt-5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
              Notes
            </div>
            <div className="text-[13px] text-[#181c23] bg-gray-50 border border-gray-200 rounded-none p-3 whitespace-pre-wrap">
              <NotesContent text={lead.notes} />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6">
          {onEdit && (
            <button
              onClick={() => {
                onClose()
                onEdit(lead)
              }}
              className="text-sm font-semibold px-6 py-2.5 rounded-none border border-gray-300 text-gray-900 hover:border-gray-500 transition-colors"
            >
              Edit
            </button>
          )}
          <button
            onClick={onClose}
            className="brand-gradient text-white text-sm font-semibold px-6 py-2.5 rounded-none"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function NotesContent({ text }: { text: string }) {
  // Split notes text and make URLs clickable
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = text.split(urlRegex)
  return (
    <>
      {parts.map((part, i) =>
        urlRegex.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#a83900] hover:underline break-all"
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

function Row({
  label,
  value,
  link,
  newTab = true,
}: {
  label: string
  value: string
  link?: string
  newTab?: boolean
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </div>
      {value && link ? (
        <a
          href={link}
          {...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          className="text-[#a83900] hover:underline mt-0.5 block truncate"
        >
          {value}
        </a>
      ) : (
        <div className="text-[#181c23] mt-0.5 truncate">
          {value || '—'}
        </div>
      )}
    </div>
  )
}
