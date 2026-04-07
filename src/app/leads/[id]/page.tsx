import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLeads } from '@/lib/sheets'
import MerchantProfile from '@/components/profile/MerchantProfile'

export default async function LeadProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const leads = await getLeads()
  const lead = leads.find((l) => l.id === id)
  if (!lead) notFound()

  return (
    <div>
      <div className="text-[13px] text-[#181c23] mb-6 font-medium">
        <Link href="/leads" className="hover:underline">
          ← Leads
        </Link>
        <span className="mx-2 text-gray-400">/</span>
        <span>{lead.company}</span>
      </div>
      <MerchantProfile lead={lead} />
    </div>
  )
}
