'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Contact } from '@/types'
import { useToast } from '@/components/ui/Toast'

type Props = {
  leadId: string
}

const EMPTY_FORM = { name: '', role: '', email: '', phone: '' }

export default function ContactsPanel({ leadId }: Props) {
  const { toastSuccess, toastError } = useToast()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const fetchContacts = useCallback(async () => {
    try {
      const res = await fetch(`/api/leads/${leadId}/contacts`)
      if (!res.ok) throw new Error('Failed to load contacts')
      const data = await res.json()
      setContacts(Array.isArray(data) ? data : [])
    } catch {
      // silently fail on first load
    } finally {
      setLoading(false)
    }
  }, [leadId])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  /* ---- Add ---- */
  const handleAdd = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/leads/${leadId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          isPrimary: contacts.length === 0 ? 'true' : 'false',
        }),
      })
      if (!res.ok) throw new Error('Failed to add contact')
      toastSuccess(`Added ${form.name}`)
      setForm(EMPTY_FORM)
      setAdding(false)
      fetchContacts()
    } catch (err) {
      toastError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  /* ---- Edit ---- */
  const startEdit = (c: Contact) => {
    setEditingId(c.id)
    setEditForm({ name: c.name, role: c.role, email: c.email, phone: c.phone })
  }

  const handleEdit = async () => {
    if (!editingId || !editForm.name.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/leads/${leadId}/contacts`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: editingId, ...editForm }),
      })
      if (!res.ok) throw new Error('Failed to update contact')
      toastSuccess('Contact updated')
      setEditingId(null)
      fetchContacts()
    } catch (err) {
      toastError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  /* ---- Delete ---- */
  const handleDelete = async (c: Contact) => {
    if (!confirm(`Delete contact "${c.name}"?`)) return
    try {
      const res = await fetch(
        `/api/leads/${leadId}/contacts?contactId=${c.id}`,
        { method: 'DELETE' }
      )
      if (!res.ok) throw new Error('Failed to delete')
      toastSuccess(`Deleted ${c.name}`)
      fetchContacts()
    } catch (err) {
      toastError((err as Error).message)
    }
  }

  /* ---- Set Primary ---- */
  const handleSetPrimary = async (c: Contact) => {
    try {
      const res = await fetch(`/api/leads/${leadId}/contacts`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: c.id, isPrimary: 'true' }),
      })
      if (!res.ok) throw new Error('Failed to set primary')
      toastSuccess(`${c.name} set as primary contact`)
      const updated = await res.json()
      setContacts(Array.isArray(updated) ? updated : contacts)
    } catch (err) {
      toastError((err as Error).message)
    }
  }

  const sorted = [...contacts].sort((a, b) => {
    if (a.isPrimary === 'true') return -1
    if (b.isPrimary === 'true') return 1
    return 0
  })

  return (
    <div className="bg-white rounded-none p-5" style={{ border: '1px solid rgba(24,28,35,0.06)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-brand" style={{ fontSize: 18 }}>group</span>
          <span className="text-[10px] tracking-[0.18em] uppercase font-bold text-muted-2">Contacts</span>
          <span className="text-[11px] text-muted ml-1">{contacts.length}</span>
        </div>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 text-[12px] font-semibold text-brand hover:underline"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>person_add</span>
            Add
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse flex gap-3">
              <div className="w-9 h-9 bg-gray-200 rounded-none" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-gray-200 rounded w-32" />
                <div className="h-2.5 bg-gray-100 rounded w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {sorted.map((c) => {
            if (editingId === c.id) {
              return (
                <div key={c.id} className="p-3 bg-surface-low rounded-none space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="Name *"
                      className="px-2.5 py-1.5 text-[12px] rounded-none border border-gray-200 bg-white outline-none focus:border-brand"
                    />
                    <input
                      type="text"
                      value={editForm.role}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                      placeholder="Role (e.g. Manager)"
                      className="px-2.5 py-1.5 text-[12px] rounded-none border border-gray-200 bg-white outline-none focus:border-brand"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      placeholder="Email"
                      className="px-2.5 py-1.5 text-[12px] rounded-none border border-gray-200 bg-white outline-none focus:border-brand"
                    />
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="Phone"
                      className="px-2.5 py-1.5 text-[12px] rounded-none border border-gray-200 bg-white outline-none focus:border-brand"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1 text-[11px] text-muted hover:text-fg"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleEdit}
                      disabled={saving || !editForm.name.trim()}
                      className="px-3 py-1 text-[11px] font-bold text-white bg-brand rounded-none disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )
            }

            const initials = c.name
              .split(/\s+/)
              .map((w) => w[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)

            return (
              <div
                key={c.id}
                className="group flex items-center gap-3 px-3 py-2.5 rounded-none hover:bg-surface-low transition-colors"
              >
                <div
                  className="w-9 h-9 flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                  style={{ background: c.isPrimary === 'true' ? '#a83900' : '#6b7280' }}
                >
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-fg truncate">{c.name}</span>
                    {c.isPrimary === 'true' && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-none bg-brand/10 text-brand uppercase">Primary</span>
                    )}
                  </div>
                  {c.role && (
                    <div className="text-[11px] text-muted truncate">{c.role}</div>
                  )}
                  <div className="flex items-center gap-3 mt-0.5">
                    {c.email && (
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          window.open(
                            `https://mail.google.com/mail/?authuser=juns810208@gmail.com&view=cm&to=${encodeURIComponent(c.email)}`,
                            'gmail_compose',
                            'width=680,height=600,left=200,top=100'
                          )
                        }}
                        className="text-[11px] text-brand hover:underline truncate"
                      >
                        {c.email}
                      </a>
                    )}
                    {c.phone && (
                      <a href={`tel:${c.phone}`} className="text-[11px] text-muted hover:text-fg">
                        {c.phone}
                      </a>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  {c.isPrimary !== 'true' && (
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(c)}
                      className="p-1 text-muted hover:text-brand transition-colors"
                      title="Set as primary"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>star</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => startEdit(c)}
                    className="p-1 text-muted hover:text-fg transition-colors"
                    title="Edit"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(c)}
                    className="p-1 text-muted hover:text-red-600 transition-colors"
                    title="Delete"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                  </button>
                </div>
              </div>
            )
          })}

          {contacts.length === 0 && !adding && (
            <div className="text-center py-6">
              <span className="material-symbols-outlined text-gray-300" style={{ fontSize: 32 }}>person_add</span>
              <div className="text-[12px] text-muted mt-2">No contacts yet</div>
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="text-[12px] font-semibold text-brand hover:underline mt-1"
              >
                Add first contact
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add form */}
      {adding && (
        <div className="mt-3 p-3 bg-surface-low rounded-none space-y-2" style={{ border: '1px dashed rgba(168,57,0,0.2)' }}>
          <div className="text-[11px] font-bold text-fg mb-1">New Contact</div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Name *"
              autoFocus
              className="px-2.5 py-1.5 text-[12px] rounded-none border border-gray-200 bg-white outline-none focus:border-brand"
            />
            <input
              type="text"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              placeholder="Role (e.g. Manager)"
              className="px-2.5 py-1.5 text-[12px] rounded-none border border-gray-200 bg-white outline-none focus:border-brand"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Email"
              className="px-2.5 py-1.5 text-[12px] rounded-none border border-gray-200 bg-white outline-none focus:border-brand"
            />
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Phone"
              className="px-2.5 py-1.5 text-[12px] rounded-none border border-gray-200 bg-white outline-none focus:border-brand"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setAdding(false); setForm(EMPTY_FORM) }}
              className="px-3 py-1 text-[11px] text-muted hover:text-fg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={saving || !form.name.trim()}
              className="px-3 py-1 text-[11px] font-bold text-white bg-brand rounded-none disabled:opacity-50"
            >
              {saving ? 'Adding...' : 'Add Contact'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
