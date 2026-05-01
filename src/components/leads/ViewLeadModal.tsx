'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Lead } from '@/types'
import StatusBadge from './StatusBadge'

type CalendarEvent = {
  id: string
  summary: string
  start: string
  end: string
  description?: string
  htmlLink?: string
}

type Props = {
  open: boolean
  lead: Lead | null
  onClose: () => void
  onEdit?: (lead: Lead) => void
  onEnrich?: (lead: Lead) => void
}

export default function ViewLeadModal({ open, lead, onClose, onEdit, onEnrich }: Props) {
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)

  const fetchCalendarEvents = useCallback(async (companyName: string) => {
    setLoadingEvents(true)
    try {
      const now = new Date()
      const threeMonthsLater = new Date(now)
      threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3)

      const res = await fetch('/api/leads/calendar-events?' + new URLSearchParams({
        company: companyName,
        startTime: now.toISOString(),
        endTime: threeMonthsLater.toISOString(),
      }))
      if (res.ok) {
        const data = await res.json()
        setCalendarEvents(data.events || [])
      }
    } catch {
      // silently fail — calendar events are supplementary
    } finally {
      setLoadingEvents(false)
    }
  }, [])

  useEffect(() => {
    if (open && lead?.company) {
      fetchCalendarEvents(lead.company)
    }
    if (!open) {
      setCalendarEvents([])
    }
  }, [open, lead?.company, fetchCalendarEvents])

  if (!open || !lead) return null

  const followUpDate = lead.followUpDate
  const isOverdue = followUpDate && new Date(followUpDate) < new Date(new Date().toDateString())
  const isToday = followUpDate && new Date(followUpDate).toDateString() === new Date().toDateString()

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

        {/* Follow-up Date */}
        {followUpDate && (
          <div className="mt-5 p-3" style={{ background: isOverdue ? '#fef2f2' : isToday ? '#fffbeb' : '#faf8f5', border: `1px solid ${isOverdue ? '#fecaca' : isToday ? '#fde68a' : '#f0f0ed'}` }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold tracking-[0.18em]" style={{ color: isOverdue ? '#dc2626' : isToday ? '#BA7517' : '#a83900' }}>
                  {isOverdue ? 'Overdue Follow-up' : isToday ? 'Follow-up Today' : 'Next Follow-up'}
                </div>
                <div className="text-[15px] font-semibold text-[#181c23] mt-0.5 flex items-center gap-2">
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: isOverdue ? '#dc2626' : '#a83900' }}>calendar_month</span>
                  {new Date(followUpDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
              {isOverdue && (
                <span className="text-[11px] font-bold px-2 py-1 bg-red-100 text-red-700">
                  {Math.ceil((Date.now() - new Date(followUpDate).getTime()) / 86400000)}d overdue
                </span>
              )}
            </div>
          </div>
        )}

        {/* Upcoming Calendar Events */}
        {(calendarEvents.length > 0 || loadingEvents) && (
          <div className="mt-5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>event</span>
              Upcoming Calendar Events
            </div>
            {loadingEvents ? (
              <div className="text-[12px] text-gray-400 py-2">Loading events...</div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {calendarEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="flex items-center gap-3 p-2.5 text-[13px]"
                    style={{ background: '#faf8f5', border: '1px solid #f0f0ed' }}
                  >
                    <span className="material-symbols-outlined text-[#a83900]" style={{ fontSize: 16 }}>calendar_today</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[#181c23] truncate">{evt.summary}</div>
                      <div className="text-[11px] text-gray-500">
                        {new Date(evt.start).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        {' '}
                        {new Date(evt.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </div>
                    </div>
                    {evt.htmlLink && (
                      <a
                        href={evt.htmlLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#a83900] hover:underline text-[11px] font-semibold shrink-0"
                      >
                        Open
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
          {onEnrich && (
            <button
              onClick={() => {
                onClose()
                onEnrich(lead)
              }}
              className="text-sm font-semibold px-4 py-2.5 rounded-none border border-[#a83900]/30 text-[#a83900] hover:bg-[#a83900]/5 transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>auto_awesome</span>
              Enrich
            </button>
          )}
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
