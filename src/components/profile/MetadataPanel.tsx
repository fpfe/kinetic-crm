'use client'

import type { Lead } from '@/types'

function formatCreated(s: string): string {
  if (!s) return '—'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function MetadataPanel({ lead, onEdit }: { lead: Lead; onEdit?: () => void }) {
  const channels = lead.leadSource
    ? lead.leadSource.split(',').map((s) => s.trim()).filter(Boolean)
    : []
  const painPoints = lead.notes
    ? lead.notes.split('\n').map((s) => s.trim()).filter(Boolean)
    : []

  return (
    <section
      className="p-8"
      style={{ background: '#e5e8f3', borderRadius: 0 }}
    >
      <div className="flex items-center justify-between mb-8">
        <h2
          className="font-display font-extrabold text-[14px] uppercase tracking-tight text-[#181c23]"
          style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}
        >
          Metadata
        </h2>
        <button
          type="button"
          className="text-gray-500 hover:text-[#a83900] p-1"
          title="Edit"
          onClick={onEdit}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col gap-8">
        <div>
          <div className="text-[10px] uppercase tracking-wider font-bold text-[#a83900] mb-2">
            Marketing Channels
          </div>
          <div className="flex flex-wrap gap-1.5">
            {channels.length === 0 ? (
              <span className="text-[12px] text-gray-500">—</span>
            ) : (
              channels.map((c) => (
                <span
                  key={c}
                  className="px-3 py-1 bg-white rounded-none text-[12px] font-medium text-[#181c23]"
                >
                  {c}
                </span>
              ))
            )}
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-wider font-bold text-[#a83900] mb-3">
            Experience Details
          </div>
          <div className="flex flex-col gap-2.5">
            <Row label="Region" value={lead.region} />
            <Row label="Service" value={lead.serviceType} />
            <Row label="Assigned To" value={lead.assignedTo} />
            {lead.dealValue && <Row label="Deal Value" value={lead.dealValue} />}
            <Row label="Created" value={formatCreated(lead.createdAt)} />
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-wider font-bold text-[#b60056] mb-2">
            Research Notes
          </div>
          {painPoints.length === 0 ? (
            <div className="text-[12px] text-gray-500">—</div>
          ) : (
            <ul className="flex flex-col gap-2">
              {painPoints.map((p, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-none bg-[#b60056] mt-1.5 shrink-0" />
                  <span className="text-[13px] text-[#5b4137]">
                    <LinkifyText text={p} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

function LinkifyText({ text }: { text: string }) {
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] text-gray-500">{label}</span>
      <span className="text-[13px] font-bold text-[#181c23] text-right truncate">
        {value || '—'}
      </span>
    </div>
  )
}
