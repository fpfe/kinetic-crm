'use client'

import { createContext, useCallback, useContext, useState } from 'react'

type ToastType = 'success' | 'error' | 'info'

type Toast = {
  id: number
  message: string
  type: ToastType
}

type ToastContextValue = {
  toast: (message: string, type?: ToastType) => void
  toastSuccess: (message: string) => void
  toastError: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const toast = useCallback(
    (message: string, type?: ToastType) => addToast(message, type),
    [addToast]
  )
  const toastSuccess = useCallback(
    (message: string) => addToast(message, 'success'),
    [addToast]
  )
  const toastError = useCallback(
    (message: string) => addToast(message, 'error'),
    [addToast]
  )

  const colors: Record<ToastType, string> = {
    success: 'bg-green-800 text-white',
    error: 'bg-red-700 text-white',
    info: 'bg-gray-900 text-white',
  }

  const icons: Record<ToastType, string> = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
  }

  return (
    <ToastContext.Provider value={{ toast, toastSuccess, toastError }}>
      {children}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-[9999] pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 text-sm font-medium shadow-lg animate-slide-up ${colors[t.type]}`}
            style={{ borderRadius: 0, minWidth: 240 }}
          >
            <span className="text-xs font-bold opacity-80">{icons[t.type]}</span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
