'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { SessionProvider } from 'next-auth/react'
import Sidebar from './Sidebar'
import TopNav from './TopNav'
import CommandPalette from '@/components/ui/CommandPalette'
import { I18nProvider } from '@/lib/i18n'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const bare = pathname?.startsWith('/login')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <SessionProvider>
      <I18nProvider>
        {bare ? (
          children
        ) : (
          <div className="flex min-h-screen">
            {/* Desktop sidebar — always visible */}
            <div className="hidden lg:block">
              <Sidebar />
            </div>

            {/* Mobile sidebar — overlay drawer */}
            {sidebarOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-black/30 lg:hidden"
                  onClick={() => setSidebarOpen(false)}
                />
                <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
                  <Sidebar onNavigate={() => setSidebarOpen(false)} />
                </div>
              </>
            )}

            <div className="flex-1 lg:ml-[220px] flex flex-col">
              <TopNav onMenuToggle={() => setSidebarOpen((o) => !o)} />
              <main className="flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
                {children}
              </main>
            </div>
            <CommandPalette />
          </div>
        )}
      </I18nProvider>
    </SessionProvider>
  )
}
