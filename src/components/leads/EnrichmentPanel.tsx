'use client'

import { useState } from 'react'
import type { Lead } from '@/types'
import { useToast } from '@/components/ui/Toast'

type EnrichmentData = {
  companyNameJa: string | null
  website: string | null
  description: string | null
  keyContact: {
    name: string | null
    role: string | null
    email: string | null
    phone: string | null
  }
  address: string | null
  socialLinks: {
    instagram: string | null
    facebook: string | null
    linkedin: string | null
    tripadvisor: string | null
    google_maps: string | null
  }
  notableFacts: string[]
  competitors: string[]
  suggestedTags: string[]
}

type Props = {
  open: boolean
  lead: Lead | null
  onClose: () => void
  onApply: (lead: Lead, updates: Partial<Lead>) => void
}

export default function EnrichmentPanel({ open, lead, onClose, onApply }: Props) {
  const { toastSuccess, toastError } = useToast()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<EnrichmentData | null>(null)

  if (!open || !lead) return null

  async function enrich() {
    if (!lead) return
    setLoading(true)
    setData(null)
    try {
      const res = await fetch('/api/leads/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: lead.company,
          region: lead.region,
          serviceType: lead.serviceType,
          notes: lead.notes,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Enrichment failed')
      setData(json)
    } catch (err) {
      toastError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  function handleApply() {
    if (!data || !lead) return
    const updates: Partial<Lead> = {}

    // Build enriched notes
    const notesParts: string[] = []
    if (data.companyNameJa) notesParts.push(`JP: ${data.companyNameJa}`)
    if (data.description) notesParts.push(data.description)
    if (data.website) notesParts.push(`Web: ${data.website}`)
    if (data.address) notesParts.push(`Address: ${data.address}`)
    if (data.notableFacts?.length) notesParts.push(data.notableFacts.join(' | '))

    const socialParts: string[] = []
    if (data.socialLinks?.instagram) socialParts.push(`IG: ${data.socialLinks.instagram}`)
    if (data.socialLinks?.facebook) socialParts.push(`FB: ${data.socialLinks.facebook}`)
    if (data.socialLinks?.tripadvisor) socialParts.push(`TA: ${data.socialLinks.tripadvisor}`)
    if (socialParts.length) notesParts.push(socialParts.join(' | '))

    if (notesParts.length) {
      const existing = lead.notes ? lead.notes + ' | ' : ''
      updates.notes = existing + notesParts.join(' | ')
    }

    // Apply contact info if empty
    if (data.keyContact?.name && !lead.contactName) {
      updates.contactName = data.keyContact.name
    }
    if (data.keyContact?.email && !lead.email) {
      updates.email = data.keyContact.email
    }
    if (data.keyContact?.phone && !lead.phone) {
      updates.phone = data.keyContact.phone
    }

    // Merge tags
    if (data.suggestedTags?.length) {
      const existingTags = lead.tags ? lead.tags.split(',').map((t) => t.trim()) : []
      const newTags = data.suggestedTags.filter((t) => !existingTags.includes(t))
      if (newTags.length) {
        updates.tags = [...existingTags, ...newTags].join(',')
      }
    }

    onApply(lead, updates)
    toastSuccess(`Enriched "${lead.company}" — ${Object.keys(updates).length} fields updated`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        className="relative bg-white rounded-none w-full max-w-lg max-h-[85vh] flex flex-col"
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.15)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #e5e8f3' }}>
          <div>
            <div className="text-[10px] tracking-[0.18em] uppercase font-bold text-[#a83900]">
              Contact Enrichment
            </div>
            <h2 className="text-[16px] font-bold text-[#181c23] mt-0.5">
              {lead.company}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-[#181c23]"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {!data && !loading && (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="w-14 h-14 flex items-center justify-center bg-[#a83900]/5 mb-4">
                <span className="material-symbols-outlined text-[#a83900]" style={{ fontSize: 28 }}>auto_awesome</span>
              </div>
              <p className="text-[13px] text-gray-500 text-center mb-4 max-w-[280px]">
                AI will search the web for company details, contacts, social links, and notable facts.
              </p>
              <button
                type="button"
                onClick={enrich}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-bold text-white rounded-none"
                style={{ background: 'linear-gradient(135deg, #a83900 0%, #ff5a00 100%)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>search</span>
                Enrich Now
              </button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="flex gap-1.5 mb-4">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2.5 h-2.5 rounded-none bg-[#a83900]"
                    style={{
                      animation: 'pulse 1.2s infinite',
                      animationDelay: `${i * 0.2}s`,
                    }}
                  />
                ))}
              </div>
              <p className="text-[13px] text-gray-500">Searching the web for {lead.company}...</p>
            </div>
          )}

          {data && (
            <div className="flex flex-col gap-4">
              {/* Company Info */}
              {(data.companyNameJa || data.description || data.website) && (
                <Section title="Company Info">
                  {data.companyNameJa && <InfoRow label="Japanese Name" value={data.companyNameJa} />}
                  {data.description && <InfoRow label="Description" value={data.description} />}
                  {data.website && (
                    <InfoRow label="Website">
                      <a href={data.website} target="_blank" rel="noopener noreferrer" className="text-[#a83900] hover:underline text-[13px]">
                        {data.website}
                      </a>
                    </InfoRow>
                  )}
                  {data.address && <InfoRow label="Address" value={data.address} />}
                </Section>
              )}

              {/* Key Contact */}
              {data.keyContact && (data.keyContact.name || data.keyContact.email) && (
                <Section title="Key Contact">
                  {data.keyContact.name && <InfoRow label="Name" value={data.keyContact.name} />}
                  {data.keyContact.role && <InfoRow label="Role" value={data.keyContact.role} />}
                  {data.keyContact.email && <InfoRow label="Email" value={data.keyContact.email} />}
                  {data.keyContact.phone && <InfoRow label="Phone" value={data.keyContact.phone} />}
                </Section>
              )}

              {/* Social Links */}
              {data.socialLinks && Object.values(data.socialLinks).some(Boolean) && (
                <Section title="Social Links">
                  <div className="flex flex-wrap gap-2">
                    {data.socialLinks.instagram && <SocialChip label="Instagram" url={data.socialLinks.instagram} />}
                    {data.socialLinks.facebook && <SocialChip label="Facebook" url={data.socialLinks.facebook} />}
                    {data.socialLinks.linkedin && <SocialChip label="LinkedIn" url={data.socialLinks.linkedin} />}
                    {data.socialLinks.tripadvisor && <SocialChip label="TripAdvisor" url={data.socialLinks.tripadvisor} />}
                    {data.socialLinks.google_maps && <SocialChip label="Google Maps" url={data.socialLinks.google_maps} />}
                  </div>
                </Section>
              )}

              {/* Notable Facts */}
              {data.notableFacts?.length > 0 && (
                <Section title="Notable Facts">
                  <div className="flex flex-col gap-1">
                    {data.notableFacts.map((fact, i) => (
                      <div key={i} className="text-[13px] text-[#181c23] flex gap-2">
                        <span className="text-[#a83900] shrink-0">•</span>
                        <span>{fact}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Suggested Tags */}
              {data.suggestedTags?.length > 0 && (
                <Section title="Suggested Tags">
                  <div className="flex flex-wrap gap-1.5">
                    {data.suggestedTags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-[11px] font-semibold rounded-none"
                        style={{ background: '#ece6f4', color: '#685588' }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </Section>
              )}

              {/* Competitors */}
              {data.competitors?.length > 0 && (
                <Section title="Similar Companies">
                  <div className="text-[13px] text-gray-600">
                    {data.competitors.join(', ')}
                  </div>
                </Section>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {data && (
          <div className="flex justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid #e5e8f3' }}>
            <button
              type="button"
              onClick={() => { setData(null) }}
              className="px-4 py-2.5 text-[13px] font-semibold text-gray-500 hover:text-[#181c23]"
            >
              Re-run
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2.5 text-[13px] font-bold text-white rounded-none"
              style={{ background: 'linear-gradient(135deg, #a83900 0%, #ff5a00 100%)' }}
            >
              Apply to Lead
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-3" style={{ background: '#faf8f5', border: '1px solid #f0f0ed' }}>
      <div className="text-[10px] uppercase font-bold text-gray-400 mb-2" style={{ letterSpacing: '0.18em' }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function InfoRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-1">
      <span className="text-[12px] font-semibold text-gray-400 shrink-0" style={{ width: 90 }}>{label}</span>
      {children || <span className="text-[13px] text-[#181c23]">{value}</span>}
    </div>
  )
}

function SocialChip({ label, url }: { label: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-[#a83900] hover:bg-[#a83900]/5 transition-colors"
      style={{ border: '1px solid rgba(168,57,0,0.2)' }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
      {label}
    </a>
  )
}
