import React from 'react'
import { createPortal } from 'react-dom'
import { X, ExternalLink, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface InvoicePreviewDrawerProps {
  isOpen: boolean
  onClose: () => void
  url: string | null
  title?: string
}

export function InvoicePreviewDrawer({ isOpen, onClose, url, title = 'Podgląd faktury' }: InvoicePreviewDrawerProps) {
  if (!isOpen || !url) return null

  let previewUrl = url

  const isPdf = previewUrl.toLowerCase().includes('.pdf')

  // Make PDF fit the width of the drawer by default and hide bulky toolbars
  if (isPdf && !previewUrl.includes('#')) {
    previewUrl = `${previewUrl}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`
  }

  return createPortal(
    <div className="fixed inset-0 z-[130] flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative bg-[var(--background)] text-[var(--foreground)] border-l border-[var(--border)] shadow-2xl w-full max-w-md h-full flex flex-col animate-in slide-in-from-right duration-300">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--card)] shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-md bg-[var(--sidebar-primary)]/10 text-[var(--sidebar-primary)] shrink-0">
              <FileText size={16} />
            </div>
            <h3 className="font-bold text-sm truncate">{title}</h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[var(--sidebar-primary)]/10 text-[var(--sidebar-primary)] hover:bg-[var(--sidebar-primary)]/20 transition-colors"
              title="Otwórz w nowej karcie"
            >
              <ExternalLink size={14} />
              Otwórz w nowej karcie
            </a>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full hover:bg-[var(--muted)]"
            >
              <X size={18} />
            </Button>
          </div>
        </div>

        {/* Content (Iframe) */}
        <div className="flex-1 w-full h-full bg-zinc-100 dark:bg-zinc-900 overflow-hidden relative">
          {isPdf ? (
            <iframe
              src={previewUrl}
              className="w-full h-full border-none"
              title="Podgląd dokumentu"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads"
            />
          ) : (
            <div style={{ width: '150%', height: '150%', transform: 'scale(0.6666)', transformOrigin: 'top left' }}>
              <iframe
                src={previewUrl}
                className="w-full h-full border-none"
                title="Podgląd dokumentu"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads"
              />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
