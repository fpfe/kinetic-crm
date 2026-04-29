'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/* ============================================================
   Types
   ============================================================ */
type City = 'Tokyo' | 'Osaka' | 'Kyoto'
type Tourist = 'Europe' | 'US' | 'Middle East'

type FinderLead = {
  id: string
  name: string
  name_jp: string | null
  website: string | null
  city: City
  category: string
  service_type: string | null
  market_demand_tier: number | null
  description: string
  experience_types: string[]
  inbound_strategy: string | null
  recent_news: string | null
  klook_listed: boolean
  klook_url: string | null
  klook_gap: string
  priority_tourists: Tourist[]
  priority_score: number
  score_rationale: string | null
  contact_person: string | null
  contact_email: string | null
  contact_phone: string | null
  address: string
  added_at: string
}

type ToastMsg = { id: number; text: string }

const LS_LEADS = 'headout_leads'
const LS_CRM_ADDED = 'headout_crm_added'

const CITIES: City[] = ['Tokyo', 'Osaka', 'Kyoto']
const SERVICE_TYPES = [
  'Tours & Day Trips',
  'Cultural Experience',
  'Theme Park & Entertainment',
  'Food & Dining',
  'Museum & Gallery',
  'Outdoor & Sports',
  'Observation & Landmark',
  'Cruise & Water',
  'Transport & Pass',
  'Wellness & Spa',
] as const

const QUICK_TAGS = [
  'Food & Dining',
  'Cultural Experience',
  'Outdoor & Sports',
  'Tours & Day Trips',
  'Wellness & Spa',
  'Museum & Gallery',
  'Theme Park & Entertainment',
  'Observation & Landmark',
  'Cruise & Water',
  'Tea Ceremony',
]

const TIER_LABELS: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'Tier 1 · High Demand', color: 'text-green-700', bg: 'bg-green-50' },
  2: { label: 'Tier 2 · Strong Demand', color: 'text-blue-700', bg: 'bg-blue-50' },
  3: { label: 'Tier 3 · Moderate Demand', color: 'text-amber-700', bg: 'bg-amber-50' },
  4: { label: 'Tier 4 · Baseline', color: 'text-gray-600', bg: 'bg-gray-100' },
}

const LOADING_MESSAGES = [
  'Searching the web...',
  'Analyzing operators...',
  'Checking Klook listings...',
  'Building profiles...',
]

/* ============================================================
   Helpers
   ============================================================ */
function loadLeads(): FinderLead[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(LS_LEADS)
    return raw ? (JSON.parse(raw) as FinderLead[]) : []
  } catch {
    return []
  }
}

function loadCrmAdded(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(LS_CRM_ADDED)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function normalizeUrl(u: string | null | undefined): string {
  if (!u) return ''
  return u.toLowerCase().replace(/\/+$/, '').trim()
}

function scoreColor(score: number): string {
  if (score >= 70) return 'bg-green-500'
  if (score >= 40) return 'bg-amber-500'
  return 'bg-red-500'
}

function touristBadgeClass(t: Tourist): string {
  if (t === 'Europe') return 'bg-blue-50 text-blue-700'
  if (t === 'US') return 'bg-green-50 text-green-700'
  return 'bg-amber-50 text-amber-800'
}

/* ============================================================
   Page
   ============================================================ */
export default function LeadFinderPage() {
  const [city, setCity] = useState<City>('Tokyo')
  const [leads, setLeads] = useState<FinderLead[]>([])
  const [crmAdded, setCrmAdded] = useState<string[]>([])
  const [keywords, setKeywords] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [emailLeadId, setEmailLeadId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [toasts, setToasts] = useState<ToastMsg[]>([])
  const errTimer = useRef<number | null>(null)

  // Hydrate from localStorage on mount
  useEffect(() => {
    setLeads(loadLeads())
    setCrmAdded(loadCrmAdded())
  }, [])

  // Persist leads
  const persistLeads = useCallback((next: FinderLead[]) => {
    setLeads(next)
    window.localStorage.setItem(LS_LEADS, JSON.stringify(next))
  }, [])

  const persistCrmAdded = useCallback((next: string[]) => {
    setCrmAdded(next)
    window.localStorage.setItem(LS_CRM_ADDED, JSON.stringify(next))
  }, [])

  /* ----------------- Toast ----------------- */
  const pushToast = useCallback((text: string) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, text }])
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id))
    }, 3000)
  }, [])

  const showError = useCallback((msg: string) => {
    setError(msg)
    if (errTimer.current) window.clearTimeout(errTimer.current)
    errTimer.current = window.setTimeout(() => setError(null), 5000)
  }, [])

  /* ----------------- Find leads ----------------- */
  const findLeads = useCallback(async () => {
    const kw = keywords.trim()
    if (!kw) {
      showError('Enter a category or keywords first.')
      return
    }

    setLoading(true)
    setLoadingMsg(LOADING_MESSAGES[0])
    let mi = 0
    const interval = window.setInterval(() => {
      mi = (mi + 1) % LOADING_MESSAGES.length
      setLoadingMsg(LOADING_MESSAGES[mi])
    }, 1800)

    const existingNames =
      leads.map((l) => l.name).join(', ') || '(none)'

    try {
      const res = await fetch('/api/lead-finder/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ keywords: kw, city, existingNames }),
      })

      window.clearInterval(interval)

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(body.error || `API error ${res.status}`)
      }
      const data = (await res.json()) as { text: string }
      let text = data.text.trim()
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()

      let arr: FinderLead[]
      try {
        const m = text.match(/\[[\s\S]*\]/)
        arr = JSON.parse(m ? m[0] : text) as FinderLead[]
      } catch {
        throw new Error('Could not parse results — please try again')
      }
      if (!Array.isArray(arr) || arr.length === 0) {
        setLoading(false)
        showError('No new operators found for this search. Try different keywords.')
        return
      }

      // Dedupe
      const existingNorm = new Set(
        leads.map((l) => l.name.toLowerCase().trim())
      )
      const existingUrls = new Set(
        leads.map((l) => normalizeUrl(l.website))
      )
      const additions: FinderLead[] = []
      let skipped = 0
      for (const lead of arr) {
        const nm = (lead.name ?? '').toLowerCase().trim()
        const url = normalizeUrl(lead.website)
        if (!nm) {
          skipped++
          continue
        }
        if (existingNorm.has(nm) || (url && existingUrls.has(url))) {
          skipped++
          continue
        }
        existingNorm.add(nm)
        if (url) existingUrls.add(url)
        const id =
          lead.id ||
          `${nm.replace(/[^a-z0-9]+/g, '-')}-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 6)}`
        additions.push({
          ...lead,
          id,
          city: (lead.city as City) || city,
          added_at: new Date().toISOString(),
        })
      }
      const next = [...leads, ...additions]
      persistLeads(next)
      setLoading(false)
      pushToast(
        `${additions.length} new lead${additions.length === 1 ? '' : 's'} added${
          skipped ? ` (${skipped} duplicate${skipped === 1 ? '' : 's'} skipped)` : ''
        }`
      )
    } catch (err) {
      window.clearInterval(interval)
      setLoading(false)
      const e = err as Error
      const msg = e.message || String(err)
      showError(msg)
    }
  }, [keywords, city, leads, persistLeads, pushToast, showError])

  /* ----------------- Delete ----------------- */
  const deleteLead = useCallback(
    (id: string) => {
      if (!window.confirm('Delete this lead?')) return
      persistLeads(leads.filter((l) => l.id !== id))
      if (selectedId === id) setSelectedId(null)
    },
    [leads, persistLeads, selectedId]
  )

  /* ----------------- Add to CRM ----------------- */
  const [addingCrm, setAddingCrm] = useState<string | null>(null)
  const [addCrmError, setAddCrmError] = useState<string | null>(null)

  const addToCrm = useCallback(
    async (lead: FinderLead, enrichedNotes?: string) => {
      setAddingCrm(lead.id)
      setAddCrmError(null)
      try {
        const notes = enrichedNotes
          ? enrichedNotes
          : `${lead.description} | Inbound: ${lead.inbound_strategy ?? 'n/a'} | Klook gap: ${lead.klook_gap ?? 'n/a'}`
        const payload = {
          contactName: lead.contact_person ?? lead.name,
          email: lead.contact_email ?? '',
          phone: lead.contact_phone ?? '',
          company: lead.name,
          serviceType: lead.service_type || lead.category,
          leadSource: 'Lead Finder',
          assignedTo: 'Seungjun Ahn',
          status: 'New',
          region: lead.city,
          notes,
          dealValue: '',
        }
        const res = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const t = await res.text()
          throw new Error(`Request failed (${res.status}): ${t.slice(0, 180)}`)
        }
        persistCrmAdded([...crmAdded, lead.id])
        pushToast('Added to CRM successfully')
      } catch (err) {
        const e = err as Error
        setAddCrmError(e.message || 'Failed to add to CRM')
      } finally {
        setAddingCrm(null)
      }
    },
    [crmAdded, persistCrmAdded, pushToast]
  )

  /* ----------------- Derived ----------------- */
  const cityLeads = useMemo(
    () =>
      leads
        .filter((l) => l.city === city)
        .sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0)),
    [leads, city]
  )
  const stats = useMemo(() => {
    const total = cityLeads.length
    const klook = cityLeads.filter((l) => l.klook_listed).length
    return {
      total,
      klook,
      noKlook: total - klook,
      high: cityLeads.filter((l) => l.priority_score >= 70).length,
    }
  }, [cityLeads])

  const selected = selectedId
    ? leads.find((l) => l.id === selectedId) ?? null
    : null
  const emailLead = emailLeadId
    ? leads.find((l) => l.id === emailLeadId) ?? null
    : null

  /* ============================================================
     Render
     ============================================================ */
  return (
    <div className="flex gap-6">
      {/* LEFT PANEL */}
      <aside className="w-72 shrink-0">
        <div className="rounded-none bg-white border border-gray-200 p-5">
          {/* City tabs */}
          <div className="flex gap-1 mb-5">
            {CITIES.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setCity(c)
                  setSelectedId(null)
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-none transition-colors ${
                  city === c
                    ? 'bg-[#a83900] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <p className="text-[10px] tracking-[0.18em] font-semibold text-gray-500 mb-2">
            FIND OPERATORS
          </p>
          <input
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') findLeads()
            }}
            placeholder="e.g. sake tasting, food tours"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-none bg-gray-50 focus:bg-white focus:border-[#a83900] outline-none transition-colors"
          />

          <div className="flex flex-wrap gap-1.5 mt-3 mb-3">
            {QUICK_TAGS.map((t) => (
              <button
                key={t}
                onClick={() => setKeywords(t)}
                className="px-2.5 py-1 text-[11px] rounded-none bg-gray-100 text-gray-600 hover:bg-[#a83900]/10 hover:text-[#a83900] transition-colors"
              >
                {t}
              </button>
            ))}
          </div>

          <button
            onClick={findLeads}
            disabled={loading}
            className="w-full py-2.5 text-sm font-semibold text-white bg-[#a83900] rounded-none hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
          >
            {loading ? 'Searching...' : 'Find Leads'}
          </button>

          {error && (
            <div className="mt-3 p-2.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-none">
              {error}
            </div>
          )}

          {/* Stats */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-[10px] tracking-[0.18em] font-semibold text-gray-500 mb-2">
              STATS · {city.toUpperCase()}
            </p>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Total leads</span>
                <span className="font-semibold">{stats.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">On Klook</span>
                <span className="font-semibold">{stats.klook}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Not on Klook</span>
                <span className="font-semibold">{stats.noKlook}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">High priority (70+)</span>
                <span className="font-semibold">{stats.high}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setSettingsOpen(true)}
            className="mt-4 w-full py-2 text-xs text-gray-500 border border-gray-200 rounded-none hover:text-[#a83900] hover:border-[#a83900] transition-colors"
          >
            ⚙ Settings
          </button>
        </div>
      </aside>

      {/* RIGHT PANEL */}
      <main className="flex-1 min-w-0">
        {loading ? (
          <div className="rounded-none bg-white border border-gray-200 p-10 flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-none border-[3px] border-gray-200 border-t-[#a83900] animate-spin" />
            <div className="text-sm text-gray-600">{loadingMsg}</div>
          </div>
        ) : selected ? (
          <DetailView
            lead={selected}
            isAdded={crmAdded.includes(selected.id)}
            adding={addingCrm === selected.id}
            addError={addCrmError}
            onBack={() => setSelectedId(null)}
            onGenerateEmail={() => setEmailLeadId(selected.id)}
            onAddToCrm={(enrichedNotes) => addToCrm(selected, enrichedNotes)}
          />
        ) : (
          <ListView
            city={city}
            leads={cityLeads}
            crmAdded={crmAdded}
            onOpen={(id) => setSelectedId(id)}
            onDelete={deleteLead}
            onEmail={(id) => setEmailLeadId(id)}
          />
        )}
      </main>

      {/* Modals */}
      {emailLead && (
        <EmailModal
          lead={emailLead}
          onClose={() => setEmailLeadId(null)}
          onToast={pushToast}
        />
      )}
      {settingsOpen && (
        <SettingsModal
          leadCount={leads.length}
          onClose={() => setSettingsOpen(false)}
          onClearAll={() => {
            if (window.confirm('Delete ALL leads? This cannot be undone.')) {
              persistLeads([])
              persistCrmAdded([])
              pushToast('All leads cleared')
              setSettingsOpen(false)
            }
          }}
        />
      )}

      {/* Toasts */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="px-4 py-3 text-sm text-white bg-gray-900 rounded-none shadow-lg"
          >
            {t.text}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ============================================================
   List View
   ============================================================ */
function ListView({
  city,
  leads,
  crmAdded,
  onOpen,
  onDelete,
  onEmail,
}: {
  city: City
  leads: FinderLead[]
  crmAdded: string[]
  onOpen: (id: string) => void
  onDelete: (id: string) => void
  onEmail: (id: string) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">{city} Operators</h2>
        <span className="text-xs text-gray-500">
          {leads.length} lead{leads.length === 1 ? '' : 's'}
        </span>
      </div>
      {leads.length === 0 ? (
        <div className="rounded-none border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500 text-sm">
          No leads yet for {city}. Use the search panel to find operators.
        </div>
      ) : (
        <div className="space-y-2.5">
          {leads.map((l) => (
            <LeadCard
              key={l.id}
              lead={l}
              isAdded={crmAdded.includes(l.id)}
              onOpen={() => onOpen(l.id)}
              onDelete={() => onDelete(l.id)}
              onEmail={() => onEmail(l.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function LeadCard({
  lead,
  isAdded,
  onOpen,
  onDelete,
  onEmail,
}: {
  lead: FinderLead
  isAdded: boolean
  onOpen: () => void
  onDelete: () => void
  onEmail: () => void
}) {
  return (
    <div
      onClick={onOpen}
      className="group relative rounded-none bg-white border border-gray-200 p-4 cursor-pointer hover:border-gray-400 transition-colors"
    >
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        className="absolute top-2 right-2 w-6 h-6 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-600 hover:bg-red-50 rounded-none transition-all"
        title="Delete"
      >
        ×
      </button>
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0 pr-7">
          <div className="font-semibold text-[15px] text-gray-900 leading-tight">
            {lead.name}
          </div>
          {lead.name_jp && (
            <div className="text-xs text-gray-500 mt-0.5">{lead.name_jp}</div>
          )}
        </div>
        <div
          className={`shrink-0 w-9 h-9 rounded-none flex items-center justify-center text-white font-bold text-sm ${scoreColor(
            lead.priority_score || 0
          )}`}
        >
          {lead.priority_score || 0}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
        <span className="px-2 py-0.5 text-[11px] rounded-none bg-gray-100 text-gray-600">
          {lead.service_type || lead.category || 'Uncategorized'}
        </span>
        {lead.market_demand_tier && TIER_LABELS[lead.market_demand_tier] && (
          <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-none ${TIER_LABELS[lead.market_demand_tier].bg} ${TIER_LABELS[lead.market_demand_tier].color}`}>
            {TIER_LABELS[lead.market_demand_tier].label}
          </span>
        )}
        {(lead.priority_tourists || []).map((t) => (
          <span
            key={t}
            className={`px-2 py-0.5 text-[11px] font-semibold rounded-none ${touristBadgeClass(
              t
            )}`}
          >
            {t}
          </span>
        ))}
        {lead.klook_listed && (
          <span className="px-2 py-0.5 text-[11px] font-semibold rounded-none bg-[#a83900]/10 text-[#a83900]">
            On Klook
          </span>
        )}
        {isAdded && (
          <span className="px-2 py-0.5 text-[11px] font-semibold rounded-none bg-green-100 text-green-700">
            In CRM ✓
          </span>
        )}
      </div>
      <div className="mt-2.5">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onEmail()
          }}
          className="px-2.5 py-1 text-xs text-gray-600 border border-gray-200 rounded-none hover:text-[#a83900] hover:border-[#a83900] transition-colors"
        >
          ✉ Email
        </button>
      </div>
    </div>
  )
}

/* ============================================================
   Detail View
   ============================================================ */
type DeepBrief = {
  activity_title: string
  companies: Array<{
    legal_name_en: string
    legal_name_ja: string | null
    role: string
    homepage: string | null
    hq_address: string | null
    phone: string | null
    inquiry_form_url: string | null
    linkedin_url: string | null
    likely_decision_maker_role: string | null
  }>
  reputation: {
    rating: string | null
    listed_on_otas: string[]
    recent_news: string | null
  }
  service_type?: string
  market_demand_tier?: number
  score: number
  score_rationale: string
  next_action: string
}

function DetailView({
  lead,
  isAdded,
  adding,
  addError,
  onBack,
  onGenerateEmail,
  onAddToCrm,
}: {
  lead: FinderLead
  isAdded: boolean
  adding: boolean
  addError: string | null
  onBack: () => void
  onGenerateEmail: () => void
  onAddToCrm: (enrichedNotes?: string) => void
}) {
  const [deepBrief, setDeepBrief] = useState<DeepBrief | null>(null)
  const [deepLoading, setDeepLoading] = useState(false)
  const [deepError, setDeepError] = useState<string | null>(null)

  const runDeepResearch = async () => {
    setDeepLoading(true)
    setDeepError(null)
    try {
      const res = await fetch('/api/deep-search/research', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: lead.name }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(body.error || `API error ${res.status}`)
      }
      const data = (await res.json()) as { text: string }
      let text = data.text.trim()
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
      const m = text.match(/\{[\s\S]*\}/)
      const parsed = JSON.parse(m ? m[0] : text) as DeepBrief
      setDeepBrief(parsed)

      // Save to Supabase deep_search_history
      fetch('/api/deep-search-history', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: lead.name, brief: parsed }),
      }).catch(() => {})
    } catch (e) {
      setDeepError(e instanceof Error ? e.message : String(e))
    } finally {
      setDeepLoading(false)
    }
  }

  const buildEnrichedNotes = (): string => {
    const parts: string[] = []
    // Lead Finder data
    parts.push(lead.description)
    if (lead.service_type) parts.push(`Service type: ${lead.service_type}`)
    if (lead.market_demand_tier) parts.push(`Market demand: Tier ${lead.market_demand_tier} (DBJ-JTBF 2025)`)
    if (lead.score_rationale) parts.push(`Score: ${lead.priority_score}/100 — ${lead.score_rationale}`)
    if (lead.inbound_strategy) parts.push(`Inbound: ${lead.inbound_strategy}`)
    if (lead.klook_gap) parts.push(`Klook gap: ${lead.klook_gap}`)
    // Deep Search data
    if (deepBrief) {
      const c = deepBrief.companies[0]
      if (c?.homepage) parts.push(`Homepage: ${c.homepage}`)
      if (c?.inquiry_form_url) parts.push(`Inquiry form: ${c.inquiry_form_url}`)
      if (c?.linkedin_url) parts.push(`LinkedIn: ${c.linkedin_url}`)
      if (c?.likely_decision_maker_role) parts.push(`Decision maker: ${c.likely_decision_maker_role}`)
      parts.push(`Partnership score: ${deepBrief.score}/100 — ${deepBrief.score_rationale}`)
      if (deepBrief.reputation.rating) parts.push(`Rating: ${deepBrief.reputation.rating}`)
      if (deepBrief.reputation.listed_on_otas?.length)
        parts.push(`Listed on: ${deepBrief.reputation.listed_on_otas.join(', ')}`)
      if (deepBrief.reputation.recent_news) parts.push(`News: ${deepBrief.reputation.recent_news}`)
      parts.push(`Next action: ${deepBrief.next_action}`)
    }
    return parts.join('\n')
  }

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-3 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        ← Back to list
      </button>
      <div className="rounded-none bg-white border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900">{lead.name}</h1>
        {lead.name_jp && (
          <div className="text-sm text-gray-500 mt-1">{lead.name_jp}</div>
        )}
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          <span className="px-2 py-0.5 text-[11px] rounded-none bg-gray-100 text-gray-600">
            {lead.service_type || lead.category}
          </span>
          {lead.market_demand_tier && TIER_LABELS[lead.market_demand_tier] && (
            <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-none ${TIER_LABELS[lead.market_demand_tier].bg} ${TIER_LABELS[lead.market_demand_tier].color}`}>
              {TIER_LABELS[lead.market_demand_tier].label}
            </span>
          )}
          {(lead.priority_tourists || []).map((t) => (
            <span
              key={t}
              className={`px-2 py-0.5 text-[11px] font-semibold rounded-none ${touristBadgeClass(
                t
              )}`}
            >
              {t}
            </span>
          ))}
          {lead.klook_listed && (
            <span className="px-2 py-0.5 text-[11px] font-semibold rounded-none bg-[#a83900]/10 text-[#a83900]">
              On Klook
            </span>
          )}
          <span
            className={`px-2.5 h-7 min-w-[2rem] rounded-none flex items-center justify-center text-white font-bold text-xs ${scoreColor(
              lead.priority_score || 0
            )}`}
          >
            {lead.priority_score || 0}
          </span>
        </div>
        {lead.score_rationale && (
          <p className="text-xs text-gray-500 mt-2">{lead.score_rationale}</p>
        )}

        <DetailSection title="Website">
          {lead.website ? (
            <a
              href={lead.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#a83900] hover:underline"
            >
              {lead.website}
            </a>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </DetailSection>
        {lead.address && (
          <DetailSection title="Address">{lead.address}</DetailSection>
        )}
        {lead.description && (
          <DetailSection title="Description">{lead.description}</DetailSection>
        )}
        {lead.experience_types?.length > 0 && (
          <DetailSection title="Experience types">
            <div className="flex flex-wrap gap-1.5">
              {lead.experience_types.map((e) => (
                <span
                  key={e}
                  className="px-2 py-0.5 text-[11px] rounded-none bg-gray-100 text-gray-600"
                >
                  {e}
                </span>
              ))}
            </div>
          </DetailSection>
        )}
        {lead.inbound_strategy && (
          <DetailSection title="Inbound strategy">
            {lead.inbound_strategy}
          </DetailSection>
        )}
        <DetailSection title="Recent news">
          {lead.recent_news ?? 'No recent news found.'}
        </DetailSection>
        <DetailSection title="Klook comparison">
          <p>
            <strong>Listed on Klook:</strong> {lead.klook_listed ? 'Yes' : 'No'}
            {lead.klook_url && (
              <>
                {' · '}
                <a
                  href={lead.klook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#a83900] hover:underline"
                >
                  View listing
                </a>
              </>
            )}
          </p>
          {lead.klook_gap && (
            <p className="mt-1.5">
              <strong>Gap for Headout:</strong> {lead.klook_gap}
            </p>
          )}
        </DetailSection>
        <DetailSection title="Contact">
          <p>{lead.contact_person ?? '—'}</p>
          <p>
            {lead.contact_email && (
              <a
                href={`https://mail.google.com/mail/?authuser=juns810208@gmail.com&view=cm&to=${encodeURIComponent(lead.contact_email)}`}
                onClick={(e) => {
                  e.preventDefault()
                  window.open(
                    `https://mail.google.com/mail/?authuser=juns810208@gmail.com&view=cm&to=${encodeURIComponent(lead.contact_email!)}`,
                    'gmail_compose',
                    'width=680,height=600,left=200,top=100'
                  )
                }}
                className="text-[#a83900] hover:underline"
              >
                {lead.contact_email}
              </a>
            )}
            {lead.contact_phone && <> · {lead.contact_phone}</>}
          </p>
        </DetailSection>

        {/* Deep Research section */}
        {deepBrief ? (
          <div className="mt-6 border-t border-gray-200 pt-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] tracking-[0.18em] font-semibold text-[#a83900]">
                DEEP RESEARCH RESULTS
              </p>
              <div className="flex items-center gap-2">
                {deepBrief.service_type && (
                  <span className="px-2 py-0.5 text-[11px] rounded-none bg-gray-100 text-gray-600">
                    {deepBrief.service_type}
                  </span>
                )}
                {deepBrief.market_demand_tier && TIER_LABELS[deepBrief.market_demand_tier] && (
                  <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-none ${TIER_LABELS[deepBrief.market_demand_tier].bg} ${TIER_LABELS[deepBrief.market_demand_tier].color}`}>
                    {TIER_LABELS[deepBrief.market_demand_tier].label}
                  </span>
                )}
                <span
                  className={`px-2.5 h-7 min-w-[2rem] rounded-none flex items-center justify-center text-white font-bold text-xs ${
                    deepBrief.score >= 70 ? 'bg-green-500' : deepBrief.score >= 40 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                >
                  {deepBrief.score}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-4">{deepBrief.score_rationale}</p>

            {deepBrief.companies.map((c, i) => (
              <div key={i} className="border border-gray-200 p-4 mb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-gray-900">{c.legal_name_en}</div>
                    {c.legal_name_ja && <div className="text-xs text-gray-500 mt-0.5">{c.legal_name_ja}</div>}
                  </div>
                  <span className="px-2 py-0.5 text-[11px] rounded-none bg-gray-100 text-gray-600">{c.role}</span>
                </div>
                <div className="mt-3 text-sm text-gray-800 space-y-1">
                  {c.homepage && (
                    <div>
                      <a href={c.homepage} target="_blank" rel="noopener noreferrer" className="text-[#a83900] hover:underline">
                        {c.homepage}
                      </a>
                    </div>
                  )}
                  {c.hq_address && <div>{c.hq_address}</div>}
                  {c.phone && <div>{c.phone}</div>}
                  {c.inquiry_form_url && (
                    <div>
                      <a href={c.inquiry_form_url} target="_blank" rel="noopener noreferrer" className="text-[#a83900] hover:underline">
                        Inquiry form
                      </a>
                    </div>
                  )}
                  {c.linkedin_url && (
                    <div>
                      <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-[#a83900] hover:underline">
                        LinkedIn
                      </a>
                    </div>
                  )}
                </div>
                {c.likely_decision_maker_role && (
                  <div className="mt-3">
                    <span className="px-2 py-0.5 text-[11px] font-semibold rounded-none bg-[#a83900]/10 text-[#a83900]">
                      {c.likely_decision_maker_role}
                    </span>
                  </div>
                )}
              </div>
            ))}

            {deepBrief.reputation.rating && (
              <DetailSection title="Rating">{deepBrief.reputation.rating}</DetailSection>
            )}
            {deepBrief.reputation.listed_on_otas?.length > 0 && (
              <DetailSection title="Listed on OTAs">
                <div className="flex flex-wrap gap-1.5">
                  {deepBrief.reputation.listed_on_otas.map((o) => (
                    <span key={o} className="px-2 py-0.5 text-[11px] rounded-none bg-gray-100 text-gray-600">{o}</span>
                  ))}
                </div>
              </DetailSection>
            )}
            {deepBrief.reputation.recent_news && (
              <DetailSection title="Recent news (Deep Search)">{deepBrief.reputation.recent_news}</DetailSection>
            )}
            <DetailSection title="Next action">
              <div className="bg-[#fff5ef] border border-[#fde4d3] p-3 text-sm text-gray-800">
                {deepBrief.next_action}
              </div>
            </DetailSection>
          </div>
        ) : deepLoading ? (
          <div className="mt-6 border-t border-gray-200 pt-5">
            <div className="flex flex-col items-center py-6">
              <div className="w-6 h-6 border-2 border-gray-200 border-t-[#a83900] rounded-full animate-spin" />
              <span className="text-sm text-gray-400 mt-2">Running Deep Research...</span>
            </div>
          </div>
        ) : deepError ? (
          <div className="mt-6 border-t border-gray-200 pt-5">
            <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-none">
              Deep Research error: {deepError}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 mt-6">
          <button
            onClick={onGenerateEmail}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#a83900] rounded-none hover:opacity-90"
          >
            Generate Cold Email
          </button>
          {!deepBrief && !deepLoading && (
            <button
              onClick={runDeepResearch}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-none hover:opacity-90"
            >
              Deep Research
            </button>
          )}
          {isAdded ? (
            <button
              disabled
              className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-none cursor-not-allowed"
            >
              Added ✓
            </button>
          ) : (
            <button
              onClick={() => onAddToCrm(deepBrief ? buildEnrichedNotes() : undefined)}
              disabled={adding}
              className="px-4 py-2 text-sm font-semibold text-gray-900 border border-gray-300 rounded-none hover:border-gray-500 disabled:opacity-60"
            >
              {adding ? 'Adding...' : deepBrief ? 'Add to CRM (Enriched)' : 'Add to CRM'}
            </button>
          )}
          <a
            href="/leads"
            className="px-4 py-2 text-sm font-semibold text-gray-900 border border-gray-300 rounded-none hover:border-gray-500"
          >
            Open in CRM
          </a>
        </div>
        {addError && (
          <div className="mt-3 p-2.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-none">
            {addError}
          </div>
        )}
      </div>
    </div>
  )
}

function DetailSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mt-5">
      <h3 className="text-[10px] tracking-[0.18em] font-semibold text-gray-500 mb-1.5">
        {title.toUpperCase()}
      </h3>
      <div className="text-sm text-gray-800 leading-relaxed">{children}</div>
    </section>
  )
}

/* ============================================================
   Email Modal
   ============================================================ */
function EmailModal({
  lead,
  onClose,
  onToast,
}: {
  lead: FinderLead
  onClose: () => void
  onToast: (msg: string) => void
}) {
  const [u1, setU1] = useState('')
  const [u2, setU2] = useState('')
  const [u3, setU3] = useState('')
  const [u4, setU4] = useState('')
  const [generating, setGenerating] = useState(false)
  const [output, setOutput] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const generate = async () => {
    setGenerating(true)
    setErr(null)
    setOutput(null)
    try {
      const res = await fetch('/api/lead-finder/email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          companyName: lead.name,
          city: lead.city,
          description: lead.description ?? '',
          whyCompany: u1,
          whyHeadout: u2,
          meetingDates: u3,
          otherNotes: u4,
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

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-5"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-none max-w-2xl w-full max-h-[90vh] overflow-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-4">
          Generate Cold Email · {lead.name}
        </h2>
        {(
          [
            ['Why this company', u1, setU1, 'What makes them a good Headout partner?'],
            ['Why Headout helps them', u2, setU2, 'What value does Headout bring?'],
            ['Meeting date options', u3, setU3, 'Propose 2-3 date/time options'],
            ['Other talking points', u4, setU4, 'Anything else to mention?'],
          ] as Array<[string, string, (v: string) => void, string]>
        ).map(([label, val, setter, ph]) => (
          <div key={label} className="mb-3">
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              {label}
            </label>
            <textarea
              value={val}
              onChange={(e) => setter(e.target.value)}
              placeholder={ph}
              className="w-full min-h-[60px] p-2.5 text-sm border border-gray-200 rounded-none bg-gray-50 focus:bg-white focus:border-[#a83900] outline-none"
            />
          </div>
        ))}
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-900 border border-gray-300 rounded-none hover:border-gray-500"
          >
            Close
          </button>
          <button
            onClick={generate}
            disabled={generating}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#a83900] rounded-none hover:opacity-90 disabled:opacity-60"
          >
            {generating ? 'Generating...' : 'Generate Email'}
          </button>
        </div>
        {err && (
          <div className="mt-3 p-2.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-none">
            {err}
          </div>
        )}
        {output && (
          <div className="mt-4">
            <pre className="p-3.5 text-xs leading-relaxed bg-gray-50 border border-gray-200 rounded-none whitespace-pre-wrap font-sans">
              {output}
            </pre>
            <div className="flex justify-end mt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(output)
                  onToast('Email copied')
                }}
                className="px-3 py-1.5 text-xs font-semibold text-gray-900 border border-gray-300 rounded-none hover:border-gray-500"
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ============================================================
   Settings Modal
   ============================================================ */
function SettingsModal({
  leadCount,
  onClose,
  onClearAll,
}: {
  leadCount: number
  onClose: () => void
  onClearAll: () => void
}) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-5"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-none max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-4">Settings</h2>
        <p className="text-sm text-gray-600 mb-2">
          Search is powered by Gemini (server-side). No API key needed.
        </p>
        <p className="text-xs text-gray-500 mt-3">
          Total leads stored: <strong>{leadCount}</strong>
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClearAll}
            className="px-3 py-2 text-xs font-semibold text-red-700 border border-red-200 rounded-none hover:bg-red-50"
          >
            Clear all leads
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-900 border border-gray-300 rounded-none hover:border-gray-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
