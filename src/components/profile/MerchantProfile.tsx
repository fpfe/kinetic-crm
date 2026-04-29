'use client'

import { useState } from 'react'
import type { Lead, LeadStatus } from '@/types'
import { LEAD_STATUSES } from '@/types'
import InteractionLog from './InteractionLog'
import DocumentStorage from './DocumentStorage'
import MetadataPanel from './MetadataPanel'
import InternalNotes from './InternalNotes'
import LeadFormModal from '@/components/leads/LeadFormModal'

const HOT_STATUSES: LeadStatus[] = ['Negotiation', 'Proposal Sent']

export default function MerchantProfile({ lead }: { lead: Lead }) {
  const [status, setStatus] = useState<LeadStatus>(lead.status)
  const [statusOpen, setStatusOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

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
      alert('Failed to update status')
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
              <span className="px-3 py-1 rounded-none bg-[#ece6f4] text-[#685588] text-[10px] font-bold uppercase tracking-wider">
                {lead.region || '—'}
              </span>
              {isHot && (
                <span className="px-3 py-1 rounded-none bg-[#e4006d] text-white text-[10px] font-bold uppercase tracking-wider">
                  Hot Lead
                </span>
              )}
            </div>
            <h1
              className="font-display font-extrabold text-[3rem] leading-tight text-[#181c23] truncate"
              style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}
            >
              {lead.company}
            </h1>
            <div className="flex items-center gap-3 mt-3 text-[14px] text-[#5b4137] flex-wrap">
              {lead.contactName && (
                <>
                  <span className="flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    {lead.contactName}
                  </span>
                  <span className="text-gray-300">•</span>
                </>
              )}
              <span className="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 7h16M4 12h16M4 17h10" />
                </svg>
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
                    className="text-[#a83900] hover:underline flex items-center gap-1.5"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                    {lead.email}
                  </a>
                </>
              )}
              {lead.phone && (
                <>
                  <span className="text-gray-300">•</span>
                  <a href={`tel:${lead.phone}`} className="text-[#a83900] hover:underline flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    {lead.phone}
                  </a>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
              Current Status
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-none bg-[#a83900] opacity-60 animate-ping" />
                <span className="relative inline-flex rounded-none h-2 w-2 bg-[#a83900]" />
              </span>
              <span className="text-[18px] font-bold text-[#a83900]">
                {status}
              </span>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setStatusOpen((v) => !v)}
                disabled={saving}
                className="brand-gradient text-white text-[13px] font-bold px-5 py-2.5 rounded-none inline-flex items-center gap-2 hover:opacity-95 transition disabled:opacity-60"
                style={{
                  background:
                    'linear-gradient(135deg, #a83900 0%, #ff5a00 100%)',
                }}
              >
                Update Status
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {statusOpen && (
                <div
                  className="absolute right-0 top-full mt-2 z-30 w-52 bg-white rounded-none py-2"
                  style={{ boxShadow: '0 12px 32px rgba(15,15,30,0.14)' }}
                >
                  {LEAD_STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => changeStatus(s)}
                      className={`w-full text-left px-4 py-2 text-[13px] hover:bg-[#f1f3fe] ${
                        s === status ? 'font-bold text-[#a83900]' : 'text-[#181c23]'
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
    </div>
  )
}
