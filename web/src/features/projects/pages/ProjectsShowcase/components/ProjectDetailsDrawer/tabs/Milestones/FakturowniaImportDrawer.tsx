import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { Search, Loader2, Plus, FileText, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { searchFakturowniaInvoices } from '@/features/projects/api'
import { Button } from '@/components/ui/button'

interface FakturowniaImportDrawerProps {
  isOpen: boolean
  onClose: () => void
  onImport: (invoiceData: any) => void
  country?: string
}

export function FakturowniaImportDrawer({
  isOpen,
  onClose,
  onImport,
  country,
}: FakturowniaImportDrawerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [query, setQuery] = useState('')

  const { data: invoices, isLoading, isError } = useQuery({
    queryKey: ['fakturownia', query, country],
    queryFn: () => searchFakturowniaInvoices(query, country),
    enabled: isOpen,
  })

  if (!isOpen) return null

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setQuery(searchTerm)
  }

  const handleImport = (inv: any) => {
    onImport(inv)
  }

  return createPortal(
    <div className="fixed inset-0 z-[120] flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-300"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="relative bg-[var(--card)] text-[var(--foreground)] border-l border-[var(--border)] shadow-2xl w-full max-w-md h-full flex flex-col animate-in slide-in-from-right duration-300">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)] bg-[var(--card)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--sidebar-primary)]/10 text-[var(--sidebar-primary)] rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[var(--foreground)] leading-tight">Import z Fakturowni</h3>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5 truncate max-w-[250px]">
                Wyszukaj fakturę po numerze lub kwocie
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)] rounded-md transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              placeholder="Wpisz numer lub kwotę..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 rounded-md border border-[var(--border)] bg-transparent px-3 py-1.5 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--sidebar-primary)] disabled:cursor-not-allowed disabled:opacity-50"
            />
            <Button type="submit" className="bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] hover:bg-[var(--sidebar-primary)]/90">
              <Search size={16} className="mr-2" />
              Szukaj
            </Button>
          </form>

          {isLoading && (
            <div className="flex justify-center py-10 text-[var(--muted-foreground)]">
              <Loader2 className="animate-spin" size={24} />
            </div>
          )}

          {isError && (
            <div className="text-center py-10 text-red-500 text-sm">
              Wystąpił błąd podczas pobierania danych. Sprawdź, czy token jest poprawnie skonfigurowany.
            </div>
          )}

          {!isLoading && !isError && invoices && (
            <div className="space-y-3">
              {invoices.length === 0 ? (
                <div className="text-center py-10 text-[var(--muted-foreground)] text-sm">
                  Brak wyników.
                </div>
              ) : (
                invoices.map((inv) => (
                  <div key={inv.id} className="p-3 rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-xs flex items-center justify-between gap-3 group hover:border-[var(--sidebar-primary)]/30 transition-colors">
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-sm truncate" title={inv.number}>{inv.number || 'Brak numeru'}</span>
                      <span className="text-xs text-[var(--muted-foreground)] mt-0.5">
                        Netto: <strong className="text-[var(--foreground)]">{inv.price_net} {inv.currency}</strong>
                        {' • '}
                        Brutto: <strong className="text-[var(--foreground)]">{inv.price_gross} {inv.currency}</strong>
                      </span>
                      <span className="text-[10px] text-[var(--muted-foreground)] mt-1">
                        Wystawiono: {inv.issue_date || '-'}
                      </span>
                    </div>
                    <Button
                      size="icon"
                      className="shrink-0 h-8 w-8 rounded-full bg-[var(--sidebar-primary)]/10 text-[var(--sidebar-primary)] hover:bg-[var(--sidebar-primary)] hover:text-[var(--sidebar-primary-foreground)]"
                      onClick={() => handleImport(inv)}
                      title="Użyj tych danych"
                    >
                      <Plus size={16} />
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
