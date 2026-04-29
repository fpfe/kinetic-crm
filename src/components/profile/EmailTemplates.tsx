'use client'

import { useState } from 'react'
import type { Lead } from '@/types'
import { useToast } from '@/components/ui/Toast'

/* ------------------------------------------------------------------ */
/*  Template definitions                                               */
/* ------------------------------------------------------------------ */

type Template = {
  id: string
  name: string
  icon: string
  subject: string
  body: string
  category: 'outreach' | 'followup' | 'proposal'
}

const TEMPLATES: Template[] = [
  {
    id: 'intro',
    name: '初回アプローチ',
    icon: 'waving_hand',
    category: 'outreach',
    subject: '{{company}}様 — Headoutとの連携のご提案',
    body: `{{company}}
ご担当者様

突然のご連絡失礼いたします。Headoutの安と申します。弊社は欧米からの訪日観光客に特化した体験予約プラットフォームを運営しております。

{{company}}様の{{serviceType}}は、訪日外国人、特に欧米のお客様に人気が高く、{{region}}エリアを訪れる際に「ぜひ行きたい」場所の1つになっていると伺っています。しかし、欧米の皆様は、日本語が読めなかったり、現金を持ってなかったりと、チケットの購買に苦労されていて、また、案内文を読めなかったり、英語の案内文を探せなかったりと、訪問時にも色々苦労していると伺ってます。

Headoutは、多言語対応の予約システムと多様な決済方法で、このようなペインポイントをなくし、{{company}}様の魅力をさらに多くの方へ届けることが可能です。導入費用はかかりません。

弊社の紹介も含め、ぜひ来週木曜か金曜に、オンラインで短時間お話させていただけませんか。来週木曜か金曜であれば、いつでも時間調整は可能です。

ご検討のほど、よろしくお願い致します。

Headout 日本事業開発本部長
安 承俊（アン スンジュン）`,
  },
  {
    id: 'followup-1',
    name: '1回目フォローアップ',
    icon: 'reply',
    category: 'followup',
    subject: 'Re: {{company}}様 — Headoutとの連携について',
    body: `{{company}}
ご担当者様

先日お送りしたHeadoutとの連携の件で、改めてご連絡させていただきました。

最近、{{region}}エリアの{{serviceType}}体験に対する欧米からの需要が非常に高まっておりまして、{{company}}様のような魅力的な施設との連携で、多くの訪日客にリーチできると考えております。

具体的な訪日客の需要データや、他の施設様での実績をお見せしながら、短時間お話しさせていただければ幸いです。

今週中でご都合のよいお時間はありますでしょうか。

ご検討のほど、よろしくお願い致します。

Headout 日本事業開発本部長
安 承俊（アン スンジュン）`,
  },
  {
    id: 'followup-2',
    name: '2回目フォローアップ',
    icon: 'forward',
    category: 'followup',
    subject: '{{company}}様 — Headout連携の件（再送）',
    body: `{{company}}
ご担当者様

お忙しいところ恐れ入ります。何度もご連絡してしまい恐縮ですが、Headoutとの連携の件で改めてご連絡させていただきました。

Headoutは、同じ{{serviceType}}カテゴリの施設様で、海外からの予約数を30〜50%増加させた実績がございます。{{company}}様でも同様のお力添えができると考えております。

以下の日程でしたら、オンラインで15分ほどお時間をいただけませんでしょうか。
・[候補日1]
・[候補日2]
・[候補日3]

もしタイミングが合わなければ、ご都合の良い時期をお教えいただければ、改めてご連絡いたします。

ご検討のほど、よろしくお願い致します。

Headout 日本事業開発本部長
安 承俊（アン スンジュン）`,
  },
  {
    id: 'proposal',
    name: '提携提案書送付',
    icon: 'description',
    category: 'proposal',
    subject: '{{company}}様 — Headout提携のご提案書',
    body: `{{company}}
{{contactName}}様

先日はお忙しい中お時間をいただき、ありがとうございました。お打ち合わせの内容を踏まえ、{{company}}様とHeadoutの連携についてのご提案書をお送りいたします。

主なポイントは以下の通りです。
・年間2,500万人以上、50カ国以上のユーザーへのリーチ
・日本市場専門のサポートとローカライズ対応
・成果報酬型の柔軟な手数料体系
・リアルタイムの在庫管理システム

詳細は添付の提案書をご覧いただけますと幸いです。ご不明な点やご質問がございましたら、お気軽にお申し付けください。

来週中に改めてお打ち合わせの場をいただき、詳細をお話しできればと思っております。

ご検討のほど、よろしくお願い致します。

Headout 日本事業開発本部長
安 承俊（アン スンジュン）`,
  },
  {
    id: 'thank-you',
    name: 'お打ち合わせお礼',
    icon: 'thumb_up',
    category: 'followup',
    subject: '本日のお打ち合わせありがとうございました — {{company}}様',
    body: `{{company}}
{{contactName}}様

本日はお忙しい中、お打ち合わせのお時間をいただきありがとうございました。{{company}}様の{{serviceType}}事業について詳しくお伺いでき、大変勉強になりました。

お打ち合わせで確認した今後の進め方は以下の通りです。
・[アクション1]
・[アクション2]
・[アクション3]

関連資料は[日付]までにお送りいたします。ご不明な点がございましたら、いつでもお気軽にご連絡ください。

今後とも、よろしくお願い致します。

Headout 日本事業開発本部長
安 承俊（アン スンジュン）`,
  },
]

const CATEGORY_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  outreach: { label: 'アプローチ', color: '#378ADD', bg: '#DBEAFE' },
  followup: { label: 'フォローアップ', color: '#92400E', bg: '#FEF3C7' },
  proposal: { label: '提案', color: '#166534', bg: '#DCFCE7' },
}

/* ------------------------------------------------------------------ */
/*  Merge helper                                                       */
/* ------------------------------------------------------------------ */

function merge(text: string, lead: Lead): string {
  return text
    .replace(/\{\{company\}\}/g, lead.company || '—')
    .replace(/\{\{contactName\}\}/g, lead.contactName || '—')
    .replace(/\{\{serviceType\}\}/g, lead.serviceType || '—')
    .replace(/\{\{region\}\}/g, lead.region || 'Japan')
    .replace(/\{\{email\}\}/g, lead.email || '—')
    .replace(/\{\{phone\}\}/g, lead.phone || '—')
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

type Props = {
  lead: Lead
  onClose: () => void
}

export default function EmailTemplates({ lead, onClose }: Props) {
  const { toastSuccess } = useToast()
  const [selected, setSelected] = useState<Template | null>(null)
  const [editedSubject, setEditedSubject] = useState('')
  const [editedBody, setEditedBody] = useState('')
  const [filter, setFilter] = useState<string | null>(null)

  function selectTemplate(t: Template) {
    setSelected(t)
    setEditedSubject(merge(t.subject, lead))
    setEditedBody(merge(t.body, lead))
  }

  function openInGmail() {
    if (!lead.email) return
    const gmailUrl = `https://mail.google.com/mail/?authuser=juns810208@gmail.com&view=cm&to=${encodeURIComponent(lead.email)}&su=${encodeURIComponent(editedSubject)}&body=${encodeURIComponent(editedBody)}`
    window.open(gmailUrl, 'gmail_compose', 'width=680,height=700,left=200,top=100')
    toastSuccess(`Email draft opened for ${lead.company}`)
  }

  function copyToClipboard() {
    const full = `Subject: ${editedSubject}\n\n${editedBody}`
    navigator.clipboard.writeText(full)
    toastSuccess('Email copied to clipboard')
  }

  const filtered = filter ? TEMPLATES.filter((t) => t.category === filter) : TEMPLATES

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[60px]">
      <div className="absolute inset-0" style={{ background: 'rgba(24,28,35,0.4)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div
        className="relative bg-white rounded-none w-full max-w-[780px] max-h-[calc(100vh-120px)] flex flex-col animate-slide-up"
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(24,28,35,0.06)' }}>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-brand" style={{ fontSize: 22 }}>mail</span>
            <div>
              <div className="text-[15px] font-bold text-fg">Email Templates</div>
              <div className="text-[12px] text-muted">Sending to {lead.contactName} at {lead.company}</div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-muted hover:text-fg transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Template list */}
          <div className="w-[260px] flex-shrink-0 overflow-y-auto" style={{ borderRight: '1px solid rgba(24,28,35,0.06)' }}>
            {/* Category filters */}
            <div className="flex items-center gap-1 px-4 py-3" style={{ borderBottom: '1px solid rgba(24,28,35,0.06)' }}>
              <button
                type="button"
                onClick={() => setFilter(null)}
                className="px-2.5 py-1 text-[11px] font-bold rounded-none transition-colors"
                style={{
                  background: filter === null ? '#181c23' : '#f3f4f6',
                  color: filter === null ? '#fff' : '#6b7280',
                }}
              >
                All
              </button>
              {Object.entries(CATEGORY_LABELS).map(([key, val]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-none transition-colors"
                  style={{
                    background: filter === key ? val.bg : '#f3f4f6',
                    color: filter === key ? val.color : '#6b7280',
                  }}
                >
                  {val.label}
                </button>
              ))}
            </div>

            <div className="py-2">
              {filtered.map((t) => {
                const cat = CATEGORY_LABELS[t.category]
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => selectTemplate(t)}
                    className="w-full text-left px-4 py-3 transition-colors"
                    style={{ background: selected?.id === t.id ? '#f1f3fe' : 'transparent' }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: selected?.id === t.id ? '#a83900' : '#6b7280' }}>{t.icon}</span>
                      <span className="text-[13px] font-semibold text-fg">{t.name}</span>
                    </div>
                    <div className="flex items-center gap-2 pl-6">
                      <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-none" style={{ background: cat.bg, color: cat.color }}>{cat.label}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Preview / edit */}
          <div className="flex-1 flex flex-col overflow-y-auto">
            {!selected ? (
              <div className="flex-1 flex items-center justify-center text-center px-8">
                <div>
                  <span className="material-symbols-outlined text-muted-2" style={{ fontSize: 40 }}>drafts</span>
                  <div className="text-[14px] text-muted mt-3">Select a template to preview</div>
                  <div className="text-[12px] text-muted-2 mt-1">Merge fields auto-fill with lead data</div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col flex-1 p-5">
                {/* Subject */}
                <div className="mb-4">
                  <label className="text-[10px] uppercase font-bold text-muted-2 mb-1 block" style={{ letterSpacing: '0.18em' }}>Subject</label>
                  <input
                    type="text"
                    value={editedSubject}
                    onChange={(e) => setEditedSubject(e.target.value)}
                    className="w-full px-3 py-2 text-[13px] text-fg rounded-none bg-surface-low outline-none focus:ring-1 focus:ring-brand/30"
                  />
                </div>

                {/* Body */}
                <div className="flex-1 mb-4">
                  <label className="text-[10px] uppercase font-bold text-muted-2 mb-1 block" style={{ letterSpacing: '0.18em' }}>Body</label>
                  <textarea
                    value={editedBody}
                    onChange={(e) => setEditedBody(e.target.value)}
                    className="w-full h-full min-h-[280px] px-3 py-2 text-[13px] text-fg rounded-none bg-surface-low outline-none resize-none focus:ring-1 focus:ring-brand/30"
                    style={{ fontFamily: 'var(--font-sans)', lineHeight: 1.6 }}
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-3" style={{ borderTop: '1px solid rgba(24,28,35,0.06)' }}>
                  {lead.email && lead.email !== 'N/a' ? (
                    <button
                      type="button"
                      onClick={openInGmail}
                      className="rust-gradient text-white text-[13px] font-bold px-5 py-2.5 rounded-none inline-flex items-center gap-2 hover:opacity-95 transition"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>open_in_new</span>
                      Open in Gmail
                    </button>
                  ) : (
                    <span className="text-[12px] text-muted italic">No email address on file</span>
                  )}
                  <button
                    type="button"
                    onClick={copyToClipboard}
                    className="text-[13px] font-bold px-5 py-2.5 rounded-none inline-flex items-center gap-2 text-fg hover:bg-surface-low transition"
                    style={{ border: '1px solid rgba(24,28,35,0.1)' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>content_copy</span>
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => selectTemplate(selected)}
                    className="text-[13px] font-medium text-muted hover:text-fg transition ml-auto"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
