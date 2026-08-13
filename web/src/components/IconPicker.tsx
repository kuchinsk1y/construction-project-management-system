import { useState, useRef, useEffect, useMemo } from 'react'
import { Search, Check } from 'lucide-react'
import { departmentIcons, getDepartmentIcon } from '@/constants/department-icons'

interface IconPickerProps {
  value: string
  onChange: (value: string) => void
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedIcon = getDepartmentIcon(value)
  const SelectedIconComp = selectedIcon.icon

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const filteredIcons = useMemo(() => {
    if (!search.trim()) return departmentIcons
    const q = search.toLowerCase()
    return departmentIcons.filter(icon => 
      icon.label.toLowerCase().includes(q) || 
      icon.tags.some(tag => tag.toLowerCase().includes(q))
    )
  }, [search])

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-[42px] h-[42px] rounded-xl border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--accent)] hover:border-[var(--sidebar-primary)] transition-colors text-[var(--sidebar-primary)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--sidebar-primary)]/20"
        title="Wybierz ikonę działu"
      >
        <SelectedIconComp size={22} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 md:w-72 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl z-[100] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
          <div className="p-2 border-b border-[var(--border)] bg-[var(--background)]/50">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <input
                type="text"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Szukaj ikony..."
                className="w-full h-8 pl-8 pr-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:border-[var(--sidebar-primary)] focus:ring-1 focus:ring-[var(--sidebar-primary)]/30 transition-all"
              />
            </div>
          </div>
          
          <div className="p-2 max-h-64 overflow-y-auto custom-scrollbar">
            {filteredIcons.length === 0 ? (
              <div className="text-center py-6 text-sm text-[var(--muted-foreground)]">
                Brak wyników dla "{search}"
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-1">
                {filteredIcons.map((iconInfo) => {
                  const IconComp = iconInfo.icon
                  const isSelected = value === iconInfo.id
                  return (
                    <button
                      key={iconInfo.id}
                      type="button"
                      onClick={() => {
                        onChange(iconInfo.id)
                        setIsOpen(false)
                        setSearch('')
                      }}
                      className={`relative flex flex-col items-center justify-center p-3 rounded-xl transition-all ${
                        isSelected 
                          ? 'bg-[var(--sidebar-primary)]/10 text-[var(--sidebar-primary)] border border-[var(--sidebar-primary)]/30' 
                          : 'text-[var(--foreground)] hover:bg-[var(--accent)] hover:text-[var(--sidebar-primary)] border border-transparent'
                      }`}
                      title={iconInfo.label}
                    >
                      <IconComp size={22} strokeWidth={isSelected ? 2.5 : 2} />
                      {isSelected && (
                        <div className="absolute top-1 right-1 bg-[var(--sidebar-primary)] text-white rounded-full p-0.5 shadow-sm">
                          <Check size={10} strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
