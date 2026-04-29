'use client'

import { useState } from 'react'
import type { Lead, LeadStatus } from '@/types'
import { LEAD_STATUSES } from '@/types'
import { useToast } from '@/components/ui/Toast'
import InteractionLog from './InteractionLog'
import DocumentStorage from './DocumentStorage'
import MetadataPanel from './MetadataPanel'
import InternalNotes from './InternalNotes'
import LeadFormModal from '@/components/leads/LeadFormModal'
import EmailTemplates from './EmailTemplates'

const HOT_STATUSES: LeadStatus[] = ['Negotiation', 'Proposal Sent']

export default function MerchantProfile({ lead }: { lead: Lead }) {
  const { toastError } = useToast()
  const [status, setStatus] = useState<LeadStatus>(lead.status)
  const [statusOpen, setStatusOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [emailOpen, setEmailOpen] = useState(false)

  const isHot = HOT_STATUSES.includes(status)

  async function changeStatus(next: LeadStatus) {
    setStatusOpen(false)
    if (next === status) return
    setSaving(true)
    const prev = status
    setStatus(next)
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) throw new Error('failed')
    } catch {
      setStatus(prev)
      toastError('Failed to update status')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {/* Hero */}
      <div className="bg-white pb-8">
        <div className="flex items-start justify-between gap-8">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 rounded-none bg-[#ece6f4] text-pipe-purple text-[10px] font-bold uppercase" style={{ letterSpacing: '0.18em' }}>
                {lead.region || '—'}
              </span>
              {isHot && (
                <span className="px-3 py-1 rounded-none bg-hot text-white text-[10px] font-bold uppercase" style={{ letterSpacing: '0.18em' }}>
                  Hot Lead
                </span>
              )}
            </div>
            <h1
              className="font-display font-extrabold text-fg truncate"
              style={{ fontSize: '3rem', lineHeight: 1.1, letterSpacing: '-0.02em' }}
            >
              {lead.company}
            </h1>
            <div className="flex items-center gap-3 mt-3 text-[14px] text-fg-warm flex-wrap">
              {lead.contactName && (
                <>
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person</span>
                    {lead.contactName}
                  </span>
                  <span className="text-gray-300">•</span>
                </>
              )}
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>category</span>
                {lead.serviceType}
              </span>
              {lead.email && (
                <>
                  <span className="text-gray-300">•</span>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      window.open(
                        `https://mail.google.com/mail/?authuser=juns810208@gmail.com&view=cm&to=${encodeURIComponent(lead.email)}`,
                        'gmail_compose',
                        'width=680,height=600,left=200,top=100'
                      )
                    }}
                    className="text-brand hover:underline flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>mail</span>
                    {lead.email}
                  </a>
                </>
              )}
              {lead.phone && (
                <>
                  <span className="text-gray-300">•</span>
                  <a href={`tel:${lead.phone}`} className="text-brand hover:underline flex items-center gap-1.5">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>call</span>
                    {lead.phone}
                  </a>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setEmailOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-none text-[12px] font-bold text-brand hover:bg-surface-low transition"
              style={{ border: '1px solid rgba(168,57,0,0.2)' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>mail</span>
              Email Templates
            </button>
            <div className="text-[10px] uppercase text-muted font-bold" style={{ letterSpacing: '0.22em' }}>
              Current Status
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-none bg-brand opacity-60 animate-ping" />
                <span className="relative inline-flex rounded-none h-2 w-2 bg-brand" />
              </span>
              <span className="text-[18px] font-bold text-brand">
                {status}
              </span>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setStatusOpen((v) => !v)}
                disabled={saving}
                className="rust-gradient text-white text-[13px] font-bold px-5 py-2.5 rounded-none inline-flex items-center gap-2 hover:opacity-95 transition disabled:opacity-60"
              >
                Update Status
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>expand_more</span>
              </button>
              {statusOpen && (
                <div
                  className="absolute right-0 top-full mt-2 z-30 w-52 bg-white rounded-none py-2"
                  style={{ boxShadow: 'var(--shadow-modal)' }}
                >
                  {LEAD_STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => changeStatus(s)}
                      className={`w-full text-left px-4 py-2 text-[13px] hover:bg-surface-low ${
                        s === status ? 'font-bold text-brand' : 'text-fg'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          <InteractionLog leadId={lead.id} lead={lead} />
          <DocumentStorage leadId={lead.id} />
        </div>
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <MetadataPanel lead={lead} onEdit={() => setEditOpen(true)} />
          <InternalNotes leadId={lead.id} />
        </div>
      </div>

      <LeadFormModal
        open={editOpen}
        mode="edit"
        initial={lead}
        onClose={() => setEditOpen(false)}
        onSaved={() => window.location.reload()}
      />

      {emailOpen && (
        <EmailTemplates lead={lead} onClose={() => setEmailOpen(false)} />
      )}
    </div>
  )
}
