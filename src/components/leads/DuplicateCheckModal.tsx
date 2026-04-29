'use client'

import { useMemo, useState } from 'react'
import type { Lead } from '@/types'

type Props = {
  open: boolean
  leads: Lead[]
  onClose: () => void
  onMerged: () => void
}

type DuplicateGroup = {
  normalizedName: string
  leads: ScoredLead[]
}

type ScoredLead = Lead & {
  score: number
  interactionCount: number
  noteCount: number
  isRecommendedKeep: boolean
}

/** Normalize company name for matching */
function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .replace(/\b(inc|ltd|co|corp|llc|gmbh|株式会社)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Score a lead — higher = more valuable to keep */
function scoreLead(lead: Lead): number {
  let score = 0

  // Has real email (not N/a or empty)
  if (lead.email && lead.email !== 'N/a' && lead.email !== 'n/a' && lead.email.includes('@')) score += 10

  // Has phone
  if (lead.phone && lead.phone !== 'N/a') score += 5

  // Has notes (longer = more valuable)
  if (lead.notes) {
    const len = lead.notes.trim().length
    if (len > 0) score += 5
    if (len > 100) score += 5
    if (len > 300) score += 5
  }

  // Status beyond New
  if (lead.status !== 'New') score += 15

  // Has deal value
  if (lead.dealValue) score += 5

  // Has region
  if (lead.region) score += 3

  // Has service type
  if (lead.serviceType) score += 3

  // Has contact name different from company (real person)
  if (lead.contactName && lead.contactName !== lead.company) score += 5

  return score
}

/** Find duplicate groups from leads */
function findDuplicates(leads: Lead[]): DuplicateGroup[] {
  const groups = new Map<string, Lead[]>()

  for (const lead of leads) {
    if (!lead.company) continue
    const key = normalize(lead.company)
    if (!key) continue
    const existing = groups.get(key) || []
    existing.push(lead)
    groups.set(key, existing)
  }

  // Only keep groups with 2+ leads
  const result: DuplicateGroup[] = []
  for (const [normalizedName, groupLeads] of groups) {
    if (groupLeads.length < 2) continue

    const scored: ScoredLead[] = groupLeads.map((l) => ({
      ...l,
      score: scoreLead(l),
      interactionCount: 0,
      noteCount: 0,
      isRecommendedKeep: false,
    }))

    // Sort by score descending — highest score first
    scored.sort((a, b) => b.score - a.score)
    scored[0].isRecommendedKeep = true

    result.push({ normalizedName, leads: scored })
  }

  // Sort groups by number of duplicates descending
  result.sort((a, b) => b.leads.length - a.leads.length)

  return result
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    New: '#9ca3af',
    Contacted: '#f59e0b',
    Qualified: '#f59e0b',
    'Proposal Sent': '#ef4444',
    Negotiation: '#ef4444',
    'Closed Won': '#22c55e',
    'Closed Lost': '#6b7280',
  }
  return (
    <span
      className="inline-block w-2 h-2 rounded-full mr-1.5"
      style={{ background: colors[status] || '#9ca3af' }}
    />
  )
}

export default function DuplicateCheckModal({ open, leads, onClose, onMerged }: Props) {
  const groups = useMemo(() => findDuplicates(leads), [leads])
  const [selections, setSelections] = useState<Record<string, { keepId: string; deleteIds: string[] }>>({})
  const [merging, setMerging] = useState(false)
  const [mergeResults, setMergeResults] = useState<string[]>([])

  // Initialize selections with recommended defaults
  useMemo(() => {
    const defaults: Record<string, { keepId: string; deleteIds: string[] }> = {}
    for (const group of groups) {
      const keepId = group.leads[0].id // highest score
      defaults[group.normalizedName] = {
        keepId,
        deleteIds: group.leads.slice(1).map((l) => l.id),
      }
    }
    setSelections(defaults)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups.length])

  if (!open) return null

  function toggleKeep(groupName: string, leadId: string) {
    setSelections((prev) => {
      const group = groups.find((g) => g.normalizedName === groupName)
      if (!group) return prev
      const allIds = group.leads.map((l) => l.id)
      return {
        ...prev,
        [groupName]: {
          keepId: leadId,
          deleteIds: allIds.filter((id) => id !== leadId),
        },
      }
    })
  }

  function toggleDelete(groupName: string, leadId: string) {
    setSelections((prev) => {
      const current = prev[groupName]
      if (!current) return prev

      // Can't undelete the kept lead or delete the kept lead via this
      if (leadId === current.keepId) return prev

      const isCurrentlyDeleting = current.deleteIds.includes(leadId)
      return {
        ...prev,
        [groupName]: {
          ...current,
          deleteIds: isCurrentlyDeleting
            ? current.deleteIds.filter((id) => id !== leadId)
            : [...current.deleteIds, leadId],
        },
      }
    })
  }

  const totalToDelete = Object.values(selections).reduce(
    (sum, s) => sum + s.deleteIds.length,
    0
  )

  async function handleMergeAll() {
    if (!confirm(`Merge & delete ${totalToDelete} duplicate lead(s)? This cannot be undone.`)) return

    setMerging(true)
    const results: string[] = []

    for (const [groupName, selection] of Object.entries(selections)) {
      if (selection.deleteIds.length === 0) continue
      try {
        const res = await fetch('/api/leads/merge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            keepId: selection.keepId,
            deleteIds: selection.deleteIds,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          results.push(`${groupName}: merged ${data.merged?.length || 0} fields, deleted ${data.deletedCount}`)
        } else {
          const err = await res.json()
          results.push(`${groupName}: ERROR — ${err.error}`)
        }
      } catch (err) {
        results.push(`${groupName}: ERROR — ${(err as Error).message}`)
      }
    }

    setMergeResults(results)
    setMerging(false)
    onMerged()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(15,15,30,0.4)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-none w-full max-w-[900px] max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 px-7 pt-7 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] tracking-[0.18em] uppercase font-bold text-[#a83900]">
                Data Cleanup
              </div>
              <h2
                className="font-extrabold text-2xl text-[#181c23] mt-1"
                style={{ fontFamily: '"Work Sans", system-ui, sans-serif' }}
              >
                Duplicate Check
              </h2>
              <p className="text-[13px] text-gray-500 mt-1">
                {groups.length === 0
                  ? 'No duplicates found — your data is clean!'
                  : `Found ${groups.length} group(s) with duplicates. Review and merge below.`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {groups.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-4 text-[12px]">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-none bg-green-100 border border-green-400" />
                  Keep (primary)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-none bg-red-50 border border-red-300" />
                  Delete (merge data into primary)
                </span>
              </div>
              <button
                onClick={handleMergeAll}
                disabled={merging || totalToDelete === 0}
                className="text-white text-[13px] font-bold px-5 py-2.5 rounded-none inline-flex items-center gap-2 hover:opacity-95 transition disabled:opacity-40"
                style={{
                  background: totalToDelete > 0
                    ? 'linear-gradient(135deg, #a83900 0%, #ff5a00 100%)'
                    : '#d1d5db',
                }}
              >
                {merging ? 'Merging...' : `Merge & Delete (${totalToDelete})`}
              </button>
            </div>
          )}
        </div>

        {/* Merge results */}
        {mergeResults.length > 0 && (
          <div className="mx-7 mt-4 p-4 bg-green-50 border border-green-200 rounded-none">
            <div className="text-[12px] font-bold text-green-800 mb-2">Merge Complete</div>
            {mergeResults.map((r, i) => (
              <div key={i} className="text-[12px] text-green-700">{r}</div>
            ))}
          </div>
        )}

        {/* Duplicate groups */}
        <div className="px-7 py-5 flex flex-col gap-6">
          {groups.map((group) => {
            const sel = selections[group.normalizedName]
            return (
              <div key={group.normalizedName} className="border border-gray-200 rounded-none">
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
                  <span className="text-[13px] font-bold text-[#181c23]">
                    &quot;{group.leads[0].company}&quot;
                  </span>
                  <span className="text-[12px] text-gray-500 ml-2">
                    — {group.leads.length} duplicates
                  </span>
                </div>

                <div className="divide-y divide-gray-100">
                  {group.leads.map((lead) => {
                    const isKeep = sel?.keepId === lead.id
                    const isDelete = sel?.deleteIds.includes(lead.id)

                    return (
                      <div
                        key={lead.id}
                        className="px-5 py-4 flex items-start gap-4 transition-colors"
                        style={{
                          background: isKeep ? '#f0fdf4' : isDelete ? '#fef2f2' : 'white',
                        }}
                      >
                        {/* Radio: Keep */}
                        <div className="flex flex-col items-center gap-1 pt-1">
                          <button
                            type="button"
                            onClick={() => toggleKeep(group.normalizedName, lead.id)}
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                              isKeep
                                ? 'border-green-500 bg-green-500'
                                : 'border-gray-300 hover:border-green-400'
                            }`}
                            title="Keep this lead"
                          >
                            {isKeep && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </button>
                          <span className="text-[9px] text-gray-400">keep</span>
                        </div>

                        {/* Delete checkbox */}
                        <div className="flex flex-col items-center gap-1 pt-1">
                          <button
                            type="button"
                            onClick={() => isKeep ? null : toggleDelete(group.normalizedName, lead.id)}
                            className={`w-5 h-5 rounded-none border-2 flex items-center justify-center transition ${
                              isDelete
                                ? 'border-red-400 bg-red-400'
                                : isKeep
                                  ? 'border-gray-200 bg-gray-100 cursor-not-allowed'
                                  : 'border-gray-300 hover:border-red-300'
                            }`}
                            title={isKeep ? 'This is the keep lead' : 'Mark for deletion'}
                            disabled={isKeep}
                          >
                            {isDelete && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            )}
                          </button>
                          <span className="text-[9px] text-gray-400">delete</span>
                        </div>

                        {/* Lead info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[14px] font-bold text-[#181c23] truncate">
                              {lead.contactName || '—'}
                            </span>
                            {lead.isRecommendedKeep && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-none shrink-0">
                                RECOMMENDED
                              </span>
                            )}
                            <span className="ml-auto text-[11px] font-bold text-gray-400 shrink-0">
                              Score: {lead.score}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-[12px]">
                            <Field label="Company" value={lead.company} />
                            <Field label="Email" value={lead.email} />
                            <Field label="Phone" value={lead.phone} />
                            <Field label="Source" value={lead.leadSource} />
                            <Field label="Service" value={lead.serviceType} />
                            <Field label="Region" value={lead.region} />
                            <Field
                              label="Status"
                              value={lead.status}
                              render={
                                <span className="flex items-center">
                                  <StatusDot status={lead.status} />
                                  {lead.status}
                                </span>
                              }
                            />
                            <Field label="Deal Value" value={lead.dealValue} />
                            <Field label="Assigned" value={lead.assignedTo} />
                          </div>

                          {lead.notes && (
                            <div className="mt-2 text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded-none p-2 max-h-[60px] overflow-hidden">
                              {lead.notes.slice(0, 200)}
                              {lead.notes.length > 200 && '...'}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  render,
}: {
  label: string
  value: string
  render?: React.ReactNode
}) {
  const isEmpty = !value || value === 'N/a' || value === 'n/a'
  return (
    <div className="truncate">
      <span className="text-gray-400">{label}: </span>
      {render ? (
        render
      ) : (
        <span className={isEmpty ? 'text-gray-300' : 'text-[#181c23] font-medium'}>
          {isEmpty ? '—' : value}
        </span>
      )}
    </div>
  )
}
