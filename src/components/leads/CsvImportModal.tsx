'use client'

import { useState, useRef } from 'react'
import { useToast } from '@/components/ui/Toast'

type Props = {
  open: boolean
  onClose: () => void
  onImported: () => void
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const values: string[] = []
    let current = ''
    let inQuotes = false
    for (const ch of lines[i]) {
      if (ch === '"') {
        inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    values.push(current.trim())
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? ''
    })
    rows.push(row)
  }
  return rows
}

export default function CsvImportModal({ open, onClose, onImported }: Props) {
  const { toastSuccess, toastError } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null)

  if (!open) return null

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const parsed = parseCSV(text)
      setRows(parsed)
      if (parsed.length > 0) {
        setHeaders(Object.keys(parsed[0]))
      }
      setResult(null)
    }
    reader.readAsText(file)
  }

  async function handleImport() {
    if (rows.length === 0) return
    setImporting(true)
    setResult(null)
    try {
      const res = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')
      setResult(data)
      if (data.success > 0) {
        toastSuccess(`Imported ${data.success} lead(s)`)
        onImported()
      }
      if (data.errors?.length > 0) {
        toastError(`${data.errors.length} row(s) failed`)
      }
    } catch (err) {
      toastError((err as Error).message)
    } finally {
      setImporting(false)
    }
  }

  function handleClose() {
    setRows([])
    setHeaders([])
    setResult(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={handleClose} />
      <div
        className="relative bg-white rounded-none w-full max-w-2xl max-h-[80vh] flex flex-col"
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.15)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #e5e8f3' }}>
          <div>
            <h2 className="text-[16px] font-bold text-[#181c23]">Import Leads from CSV</h2>
            <p className="text-[12px] text-muted mt-0.5">Upload a CSV file with lead data. Required column: company</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center text-muted hover:text-fg"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 flex items-center justify-center bg-[#a83900]/5 mb-4">
                <span className="material-symbols-outlined text-brand" style={{ fontSize: 32 }}>upload_file</span>
              </div>
              <p className="text-[13px] text-muted mb-4">
                Columns: company, contactName, email, phone, serviceType, region, status, dealValue, tags
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                onChange={handleFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold text-brand rounded-none hover:bg-surface-low transition"
                style={{ border: '1px solid rgba(168,57,0,0.3)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>attach_file</span>
                Choose CSV File
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] font-bold text-fg">
                  {rows.length} row(s) ready to import
                </span>
                <button
                  type="button"
                  onClick={() => { setRows([]); setHeaders([]); setResult(null) }}
                  className="text-[12px] text-muted hover:text-brand"
                >
                  Clear
                </button>
              </div>
              <div className="overflow-x-auto" style={{ border: '1px solid #e5e8f3' }}>
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-surface-low">
                      <th className="px-3 py-2 text-left font-bold text-muted">#</th>
                      {headers.slice(0, 6).map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-bold text-muted">{h}</th>
                      ))}
                      {headers.length > 6 && (
                        <th className="px-3 py-2 text-left font-bold text-muted">+{headers.length - 6} more</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 10).map((row, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #f0f0ed' }}>
                        <td className="px-3 py-1.5 text-muted">{i + 1}</td>
                        {headers.slice(0, 6).map((h) => (
                          <td key={h} className="px-3 py-1.5 truncate max-w-[150px]">{row[h]}</td>
                        ))}
                        {headers.length > 6 && <td className="px-3 py-1.5 text-muted">...</td>}
                      </tr>
                    ))}
                    {rows.length > 10 && (
                      <tr style={{ borderTop: '1px solid #f0f0ed' }}>
                        <td colSpan={Math.min(headers.length, 6) + 2} className="px-3 py-1.5 text-muted text-center">
                          ...and {rows.length - 10} more rows
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {result && (
                <div className="mt-3 p-3 text-[12px]" style={{ background: result.errors.length > 0 ? '#fef3c7' : '#dcfce7' }}>
                  <span className="font-bold">{result.success} imported</span>
                  {result.errors.length > 0 && (
                    <span className="text-warning ml-2">{result.errors.length} failed</span>
                  )}
                  {result.errors.slice(0, 5).map((err, i) => (
                    <div key={i} className="mt-1 text-[11px] text-warning">{err}</div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {rows.length > 0 && (
          <div className="flex justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid #e5e8f3' }}>
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 text-[13px] font-semibold text-muted hover:text-fg rounded-none"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={importing || rows.length === 0}
              className="px-5 py-2.5 text-[13px] font-bold text-white rounded-none disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #a83900 0%, #ff5a00 100%)' }}
            >
              {importing ? `Importing... (${rows.length} rows)` : `Import ${rows.length} Leads`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
