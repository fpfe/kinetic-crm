import { NextRequest, NextResponse } from 'next/server'
import {
  getContactsByLeadId,
  createContact,
  updateContact,
  deleteContact,
  setPrimaryContact,
} from '@/lib/sheets'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const contacts = await getContactsByLeadId(id)
    return NextResponse.json(contacts)
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const contact = await createContact({
      leadId: id,
      name: body.name || '',
      role: body.role || '',
      email: body.email || '',
      phone: body.phone || '',
      isPrimary: body.isPrimary || 'false',
    })
    return NextResponse.json(contact, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params
    const body = await req.json()
    const { contactId, ...patch } = body

    if (!contactId) {
      return NextResponse.json(
        { error: 'contactId is required' },
        { status: 400 }
      )
    }

    // Handle set-primary action
    if (patch.isPrimary === 'true') {
      await setPrimaryContact(leadId, contactId)
      const contacts = await getContactsByLeadId(leadId)
      return NextResponse.json(contacts)
    }

    const updated = await updateContact(contactId, patch)
    if (!updated) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(updated)
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
) {
  try {
    const { searchParams } = new URL(req.url)
    const contactId = searchParams.get('contactId')
    if (!contactId) {
      return NextResponse.json(
        { error: 'contactId query param is required' },
        { status: 400 }
      )
    }
    const ok = await deleteContact(contactId)
    if (!ok) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      )
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    )
  }
}
