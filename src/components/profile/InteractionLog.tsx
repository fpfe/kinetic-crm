'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Interaction, InteractionType, Lead } from '@/types'
import { useToast } from '@/components/ui/Toast'

const TYPE_META: Record<
  InteractionType,
  { label: string; bg: string; fg: string; icon: React.ReactNode }
> = {
  call: {
    label: 'Call',
    bg: '#d3e3fd',
    fg: '#003e8a',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    ),
  },
  email: {
    label: 'Email',
    bg: '#ffd8e7',
    fg: '#7a0042',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 7l9 6 9-6" />
      </svg>
    ),
  },
  meeting: {
    label: 'Meeting',
    bg: '#ffd9c2',
    fg: '#a83900',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="9" r="2" />
        <path d="M3 20c0-3 3-5 6-5s6 2 6 5" />
        <path d="M15 20c0-2 2-4 4-4" />
      </svg>
    ),
  },
  video_call: {
    label: 'Video Call',
    bg: '#ffd9c2',
    fg: '#a83900',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="6" width="14" height="12" rx="2" />
        <path d="M22 8l-6 4 6 4V8z" />
      </svg>
    ),
  },
  note: {
    label: 'Note',
    bg: '#ebedf8',
    fg: '#181c23',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
        <polyline points="14 3 14 9 20 9" />
      </svg>
    ),
  },
}

const ALL_TYPES: InteractionType[] = ['call', 'email', 'meeting', 'video_call', 'note']

function fmtDate(s: string): string {
  if (!s) return ''
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    .toUpperCase()
}

const todayISO = () => new Date().toISOString().slice(0, 10)

export default function InteractionLog({ leadId, lead }: { leadId: string; lead?: Lead }) {
  const { toastSuccess, toastError } = useToast()
  const [items, setItems] = useState<Interaction[]>([])
  const [loading, setLoading] = useState(true)
  const [formMode, setFormMode] = useState<'add' | 'edit' | null>(null)
  const [editTarget, setEditTarget] = useState<Interaction | null>(null)
  const [filterType, setFilterType] = useState<InteractionType | 'all'>('all')
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [emailOpen, setEmailOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/interactions?leadId=${leadId}`, {
        cache: 'no-store',
      })
      if (res.ok) setItems(await res.json())
    } finally {
      setLoading(false)
    }
  }, [leadId])

  useEffect(() => {
    load()
  }, [load])

  // Collect all unique tags across interactions
  const allTags: { tag: string; count: number }[] = (() => {
    const map = new Map<string, number>()
    for (const it of items) {
      const tags = it.tags.split(',').map((t) => t.trim()).filter(Boolean)
      for (const tag of tags) {
        map.set(tag, (map.get(tag) || 0) + 1)
      }
    }
    return Array.from(map.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
  })()

  const filtered = items.filter((i) => {
    if (filterType !== 'all' && i.type !== filterType) return false
    if (filterTag) {
      const tags = i.tags.split(',').map((t) => t.trim())
      if (!tags.includes(filterTag)) return false
    }
    return true
  })

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this interaction?')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/interactions/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setItems((prev) => prev.filter((i) => i.id !== id))
      toastSuccess('Interaction deleted')
    } catch (err) {
      toastError((err as Error).message)
    } finally {
      setDeletingId(null)
    }
  }

  // Count per type for filter badges
  const typeCounts = items.reduce(
    (acc, i) => {
      acc[i.type] = (acc[i.type] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return (
    <section
      className="bg-white p-8"
      style={{
        borderRadius: 0,
        border: '1px solid rgba(228,190,177,0.05)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2
          className="font-display font-bold text-[24px] text-[#181c23]"
          style={{ fontFamily: '"Work Sans", system-ui, sans-serif' }}
        >
          Interaction Log
        </h2>
        <div className="flex items-center gap-3">
          {lead && (
            <button
              type="button"
              onClick={() => setEmailOpen(true)}
              className="text-[13px] font-bold inline-flex items-center gap-1.5 text-gray-500 hover:text-[#a83900] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 7l9 6 9-6" />
              </svg>
              Generate Cold Email
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setEditTarget(null)
              setFormMode('add')
            }}
            className="text-[#a83900] text-[13px] font-bold inline-flex items-center gap-1.5 hover:opacity-80"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            Add Interaction
          </button>
        </div>
      </div>

      {/* Type filter pills */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-5">
          <FilterPill
            label="All"
            count={items.length}
            active={filterType === 'all'}
            onClick={() => setFilterType('all')}
          />
          {ALL_TYPES.map((t) => {
            const count = typeCounts[t] || 0
            if (count === 0) return null
            return (
              <FilterPill
                key={t}
                label={TYPE_META[t].label}
                count={count}
                active={filterType === t}
                color={TYPE_META[t].fg}
                onClick={() => setFilterType(t)}
              />
            )
          })}
          {/* Tag filters */}
          {allTags.length > 0 && (
            <>
              <span className="text-gray-300 mx-1">|</span>
              {allTags.map((t) => (
                <FilterPill
                  key={t.tag}
                  label={t.tag}
                  count={t.count}
                  active={filterTag === t.tag}
                  color="#685588"
                  onClick={() =>
                    setFilterTag(filterTag === t.tag ? null : t.tag)
                  }
                />
              ))}
            </>
          )}
        </div>
      )}

      {loading ? (
        <Skeleton />
      ) : items.length === 0 ? (
        <div className="py-12 text-center">
          <div className="text-[15px] font-bold text-[#181c23]">
            No interactions yet
          </div>
          <div className="text-[13px] text-gray-500 mt-1">
            Add the first interaction to start the log
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-8 text-center text-gray-400 text-sm">
          No {filterType !== 'all' ? TYPE_META[filterType as InteractionType].label.toLowerCase() : ''} interactions found
        </div>
      ) : (
        <div className="relative pl-14">
          <div className="absolute left-[19px] top-2 bottom-2 w-[2px] bg-[#ebedf8]" />
          <div className="flex flex-col gap-6">
            {filtered.map((it) => {
              const meta = TYPE_META[it.type] ?? TYPE_META.note
              const tags = it.tags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean)
              const isDeleting = deletingId === it.id
              return (
                <div key={it.id} className="relative group">
                  <div
                    className="absolute -left-14 top-0 w-10 h-10 rounded-none flex items-center justify-center"
                    style={{ background: meta.bg, color: meta.fg }}
                  >
                    {meta.icon}
                  </div>
                  <div
                    className="bg-[#f1f3fe] rounded-none p-5"
                    style={{ opacity: isDeleting ? 0.5 : 1 }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="font-bold text-[16px] text-[#181c23]">
                        {it.title}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold whitespace-nowrap">
                          {fmtDate(it.date)}
                        </div>
                        {/* Edit & Delete buttons — visible on hover */}
                        <div className="hidden group-hover:flex items-center gap-1">
                          <button
                            type="button"
                            title="Edit"
                            onClick={() => {
                              setEditTarget(it)
                              setFormMode('edit')
                            }}
                            className="p-1 text-gray-400 hover:text-[#a83900]"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            title="Delete"
                            disabled={isDeleting}
                            onClick={() => handleDelete(it.id)}
                            className="p-1 text-gray-400 hover:text-red-600"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                    <div
                      className="text-[14px] text-[#5b4137] mt-2 whitespace-pre-wrap"
                      style={{ lineHeight: 1.6 }}
                    >
                      {it.body}
                    </div>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {tags.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() =>
                              setFilterTag(filterTag === t ? null : t)
                            }
                            className="px-2 py-0.5 rounded-none text-[10px] font-bold cursor-pointer hover:opacity-80 transition-colors"
                            style={{
                              background: filterTag === t ? '#685588' : 'white',
                              color: filterTag === t ? '#fff' : '#5b4137',
                            }}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    )}
                    {it.createdBy && it.createdBy !== 'You' && (
                      <div className="text-[11px] text-gray-400 mt-2">
                        by {it.createdBy}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {formMode && (
        <FormModal
          mode={formMode}
          leadId={leadId}
          initial={editTarget}
          onClose={() => {
            setFormMode(null)
            setEditTarget(null)
          }}
          onSaved={() => {
            setFormMode(null)
            setEditTarget(null)
            toastSuccess(formMode === 'edit' ? 'Interaction updated' : 'Interaction added')
            load()
          }}
        />
      )}

      {emailOpen && lead && (
        <ColdEmailModal
          lead={lead}
          onClose={() => setEmailOpen(false)}
          onSaveAsInteraction={(subject, emailBody) => {
            setEmailOpen(false)
            // Auto-create an email interaction with the generated content
            fetch('/api/interactions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                leadId,
                type: 'email',
                title: subject,
                body: emailBody,
                tags: '#ColdEmail',
                date: todayISO(),
                createdBy: 'You',
              }),
            })
              .then((res) => {
                if (!res.ok) throw new Error('Save failed')
                toastSuccess('Cold email saved to interactions')
                load()
              })
              .catch((err) => toastError((err as Error).message))
          }}
        />
      )}
    </section>
  )
}

function FilterPill({
  label,
  count,
  active,
  color,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  color?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 px-3 py-1 text-[11px] font-bold rounded-none transition-colors"
      style={{
        background: active ? (color || '#a83900') : '#f1f3fe',
        color: active ? '#fff' : color || '#6b7280',
      }}
    >
      {label}
      <span
        className="text-[10px] font-semibold"
        style={{ opacity: 0.7 }}
      >
        {count}
      </span>
    </button>
  )
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-20 rounded-none bg-[#f1f3fe] animate-pulse" />
      ))}
    </div>
  )
}

function FormModal({
  mode,
  leadId,
  initial,
  onClose,
  onSaved,
}: {
  mode: 'add' | 'edit'
  leadId: string
  initial: Interaction | null
  onClose: () => void
  onSaved: () => void
}) {
  const [type, setType] = useState<InteractionType>(initial?.type || 'call')
  const [title, setTitle] = useState(initial?.title || '')
  const [body, setBody] = useState(initial?.body || '')
  const [tags, setTags] = useState(initial?.tags || '')
  const [date, setDate] = useState(initial?.date || todayISO())
  const [createdBy, setCreatedBy] = useState(initial?.createdBy || 'You')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    setBusy(true)
    setError(null)
    try {
      if (mode === 'edit' && initial) {
        const res = await fetch(`/api/interactions/${initial.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, title, body, tags, date, createdBy }),
        })
        if (!res.ok) throw new Error((await res.json()).error || 'Update failed')
      } else {
        const res = await fetch('/api/interactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId, type, title, body, tags, date, createdBy }),
        })
        if (!res.ok) throw new Error((await res.json()).error || 'Save failed')
      }
      onSaved()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,15,30,0.45)' }}
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="bg-white w-full max-w-md p-7"
        style={{ borderRadius: 0 }}
      >
        <h3
          className="font-display font-bold text-[20px] mb-5 text-[#181c23]"
          style={{ fontFamily: '"Work Sans", system-ui, sans-serif' }}
        >
          {mode === 'edit' ? 'Edit Interaction' : 'New Interaction'}
        </h3>
        <div className="flex flex-col gap-3">
          <Field label="Type">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as InteractionType)}
              className="w-full bg-[#f1f3fe] rounded-none px-3 py-2 text-[13px]"
            >
              <option value="call">Call</option>
              <option value="email">Email</option>
              <option value="meeting">Meeting</option>
              <option value="video_call">Video Call</option>
              <option value="note">Note</option>
            </select>
          </Field>
          <Field label="Title">
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#f1f3fe] rounded-none px-3 py-2 text-[13px]"
            />
          </Field>
          <Field label="Body">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="w-full bg-[#f1f3fe] rounded-none px-3 py-2 text-[13px] resize-none"
            />
          </Field>
          <Field label="Tags">
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="#Pricing, #Contract"
              className="w-full bg-[#f1f3fe] rounded-none px-3 py-2 text-[13px]"
            />
          </Field>
          <Field label="Date">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-[#f1f3fe] rounded-none px-3 py-2 text-[13px]"
            />
          </Field>
          <Field label="Created by">
            <input
              value={createdBy}
              onChange={(e) => setCreatedBy(e.target.value)}
              className="w-full bg-[#f1f3fe] rounded-none px-3 py-2 text-[13px]"
            />
          </Field>
        </div>

        {error && (
          <div className="text-[12px] text-red-600 bg-red-50 p-2 rounded-none mt-3">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-[13px] font-bold text-gray-600 rounded-none hover:bg-[#f1f3fe]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="brand-gradient text-white text-[13px] font-bold px-5 py-2 rounded-none disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #a83900 0%, #ff5a00 100%)' }}
          >
            {busy ? 'Saving…' : mode === 'edit' ? 'Save Changes' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[12px] font-semibold text-gray-600 mb-1">
        {label}
      </div>
      {children}
    </label>
  )
}

/* ============================================================
   Cold Email Modal (uses server-side Gemini)
   ============================================================ */
function ColdEmailModal({
  lead,
  onClose,
  onSaveAsInteraction,
}: {
  lead: Lead
  onClose: () => void
  onSaveAsInteraction: (subject: string, body: string) => void
}) {
  const [whyCompany, setWhyCompany] = useState('')
  const [whyHeadout, setWhyHeadout] = useState('')
  const [meetingDates, setMeetingDates] = useState('')
  const [otherNotes, setOtherNotes] = useState('')
  const [generating, setGenerating] = useState(false)
  const [output, setOutput] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const generate = async () => {
    setGenerating(true)
    setErr(null)
    setOutput(null)
    try {
      const res = await fetch('/api/lead-finder/email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          companyName: lead.company || lead.contactName,
          city: lead.region || 'Japan',
          description: lead.notes ?? '',
          whyCompany,
          whyHeadout,
          meetingDates,
          otherNotes,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(body.error || `API error ${res.status}`)
      }
      const data = (await res.json()) as { text: string }
      setOutput(data.text.trim())
    } catch (e) {
      setErr((e as Error).message || 'Failed to generate email')
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = () => {
    if (output) {
      navigator.clipboard.writeText(output)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Extract subject line from output for saving as interaction
  const extractSubject = (): string => {
    if (!output) return 'Cold Email'
    const match = output.match(/件名[:：]\s*(.+)/)?.[1]
    return match ? `Cold Email: ${match}` : 'Cold Email'
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,15,30,0.45)' }}
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl max-h-[90vh] overflow-auto p-7"
        style={{ borderRadius: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          className="font-display font-bold text-[20px] mb-1 text-[#181c23]"
          style={{ fontFamily: '"Work Sans", system-ui, sans-serif' }}
        >
          Generate Cold Email
        </h3>
        <p className="text-[13px] text-gray-500 mb-5">
          {lead.company || lead.contactName} · {lead.region || 'Japan'}
        </p>

        {(
          [
            ['Why this company', whyCompany, setWhyCompany, 'What makes them a good Headout partner?'],
            ['Why Headout helps them', whyHeadout, setWhyHeadout, 'What value does Headout bring?'],
            ['Meeting date options', meetingDates, setMeetingDates, 'Propose 2-3 date/time options'],
            ['Other talking points', otherNotes, setOtherNotes, 'Anything else to mention?'],
          ] as Array<[string, string, (v: string) => void, string]>
        ).map(([label, val, setter, ph]) => (
          <div key={label} className="mb-3">
            <div className="text-[12px] font-semibold text-gray-600 mb-1">
              {label}
            </div>
            <textarea
              value={val}
              onChange={(e) => setter(e.target.value)}
              placeholder={ph}
              rows={2}
              className="w-full bg-[#f1f3fe] rounded-none px-3 py-2 text-[13px] resize-none"
            />
          </div>
        ))}

        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-[13px] font-bold text-gray-600 rounded-none hover:bg-[#f1f3fe]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={generate}
            disabled={generating}
            className="text-white text-[13px] font-bold px-5 py-2 rounded-none disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #a83900 0%, #ff5a00 100%)' }}
          >
            {generating ? 'Generating…' : 'Generate Email'}
          </button>
        </div>

        {err && (
          <div className="text-[12px] text-red-600 bg-red-50 p-2 rounded-none mt-3">
            {err}
          </div>
        )}

        {output && (
          <div className="mt-5 border-t border-gray-200 pt-5">
            <pre className="p-4 text-[13px] leading-relaxed bg-[#f1f3fe] rounded-none whitespace-pre-wrap font-sans">
              {output}
            </pre>
            <div className="flex justify-end gap-2 mt-3">
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-1.5 text-[12px] font-bold text-gray-600 border border-gray-200 rounded-none hover:border-gray-400"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                type="button"
                onClick={() => onSaveAsInteraction(extractSubject(), output)}
                className="px-3 py-1.5 text-[12px] font-bold text-[#a83900] border border-[#a83900]/30 rounded-none hover:bg-[#a83900]/5"
              >
                Save to Interaction Log
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
