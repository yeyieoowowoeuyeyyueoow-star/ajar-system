import { useState, useRef, useEffect } from 'react'

export interface ComboOption {
  id: string
  label: string
  sub?: string   // subtitle (e.g. company number / id number)
}

interface Props {
  label: string
  required?: boolean
  options: ComboOption[]
  selectedId: string
  inputText: string
  isNew: boolean
  onSelect: (id: string, text: string) => void   // picked existing
  onNew: (text: string) => void                  // confirmed create-new
  placeholder?: string
}

export default function EntityCombobox({
  label, required, options, selectedId, inputText, isNew,
  onSelect, onNew, placeholder,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(inputText)
  const ref = useRef<HTMLDivElement>(null)

  // Sync query when parent resets
  useEffect(() => { setQuery(inputText) }, [inputText])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = query.trim()
    ? options.filter((o) => o.label.includes(query) || o.sub?.includes(query))
    : options

  const exactMatch = options.some(
    (o) => o.label === query.trim()
  )

  const handleInput = (v: string) => {
    setQuery(v)
    setOpen(true)
    // If user clears or changes text, reset selection
    if (selectedId || isNew) {
      onSelect('', v)
    }
  }

  const pick = (opt: ComboOption) => {
    setQuery(opt.label)
    setOpen(false)
    onSelect(opt.id, opt.label)
  }

  const createNew = () => {
    setOpen(false)
    onNew(query.trim())
  }

  const borderColor = isNew
    ? 'border-blue-400 ring-1 ring-blue-300'
    : selectedId
      ? 'border-green-400 ring-1 ring-green-300'
      : ''

  return (
    <div ref={ref} className="relative">
      <label className="label">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => setOpen(true)}
          className={`input pl-8 ${borderColor}`}
          placeholder={placeholder ?? `ابحث أو أدخل ${label}...`}
          autoComplete="off"
        />
        {/* indicator icon */}
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs">
          {isNew ? '🆕' : selectedId ? '✅' : '🔍'}
        </span>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {/* Existing options */}
          {filtered.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onMouseDown={() => pick(opt)}
              className={`w-full text-right px-3 py-2 text-sm hover:bg-slate-50 flex justify-between items-center gap-2 ${
                opt.id === selectedId ? 'bg-green-50 font-semibold' : ''
              }`}
            >
              <span className="text-slate-400 text-xs shrink-0">{opt.sub}</span>
              <span>{opt.label}</span>
            </button>
          ))}

          {/* Create new option — shown when query is non-empty and not exact match */}
          {query.trim() && !exactMatch && (
            <button
              type="button"
              onMouseDown={createNew}
              className="w-full text-right px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium border-t border-slate-100"
            >
              ＋ إنشاء جديد: «{query.trim()}»
            </button>
          )}

          {filtered.length === 0 && !query.trim() && (
            <p className="px-3 py-2 text-sm text-slate-400 text-center">لا يوجد سجلات</p>
          )}
        </div>
      )}

      {/* Badge */}
      {isNew && (
        <p className="mt-1 text-xs text-blue-600">سيتم إنشاء سجل جديد عند الحفظ</p>
      )}
      {selectedId && !isNew && (
        <p className="mt-1 text-xs text-green-600">تم الاختيار من السجلات الموجودة</p>
      )}
    </div>
  )
}
