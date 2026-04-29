'use client'

import { usePathname } from 'next/navigation'
import { useCommandPalette } from '@/components/ui/CommandPalette'
import { useI18n, LanguageToggle } from '@/lib/i18n'

const TITLE_MAP: Record<string, string> = {
  '/dashboard': 'page.dashboard',
  '/leads': 'page.leadManagement',
  '/pipeline': 'page.salesPipeline',
  '/reports': 'page.reports',
  '/crm': 'page.merchantCRM',
  '/lead-finder': 'page.leadFinder',
  '/deep-search': 'page.deepSearch',
  '/members': 'page.teamMembers',
}

function titleKeyFor(pathname: string | null): string {
  if (!pathname) return 'Headout Japan CRM'
  if (/^\/leads\/[^/]+/.test(pathname)) return 'page.merchantProfile'
  for (const [prefix, key] of Object.entries(TITLE_MAP)) {
    if (pathname.startsWith(prefix)) return key
  }
  return 'Headout Japan CRM'
}

export default function TopNav() {
  const pathname = usePathname()
  const { t } = useI18n()
  const titleKey = titleKeyFor(pathname)
  const title = titleKey.startsWith('page.') ? t(titleKey) : titleKey
  const { open: openPalette } = useCommandPalette()
  return (
    <header
      className="sticky top-0 z-20 h-[60px] flex items-center px-10 gap-6"
      style={{
        background: 'rgba(255,255,255,0.75)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(24,28,35,0.06)',
      }}
    >
      <div className="font-display font-bold text-[15px] text-[#181c23]">
        {title}
      </div>

      <div className="flex-1 flex justify-center">
        <button
          type="button"
          onClick={openPalette}
          className="flex items-center gap-2.5 w-[420px] px-4 py-2 rounded-none text-[13px] text-[#6B7280] hover:text-[#181C23] transition-colors cursor-pointer"
          style={{ background: '#EBEDF8' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            search
          </span>
          <span className="flex-1 text-left">{t('ui.search')}</span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-none bg-white text-[#6B7280] font-medium"
            style={{ fontFamily: '"JetBrains Mono", monospace' }}
          >
            ⌘K
          </span>
        </button>
      </div>

      <div className="flex items-center gap-3">
        <LanguageToggle />
        <button
          className="w-9 h-9 flex items-center justify-center text-[#6B7280] hover:text-[#181C23] transition-colors"
          title="Notifications"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
            notifications
          </span>
        </button>
        <button
          className="w-9 h-9 flex items-center justify-center text-[#6B7280] hover:text-[#181C23] transition-colors"
          title="Settings"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
            settings
          </span>
        </button>
        <div
          className="w-9 h-9 rounded-none text-white text-xs font-bold flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #A83900 0%, #FF5A00 100%)' }}
          aria-label="user"
        >
          SA
        </div>
      </div>
    </header>
  )
}
