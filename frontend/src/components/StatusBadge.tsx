interface Props { status: string; size?: 'sm' | 'md' }

const config: Record<string, { label: string; dot: string; cls: string }> = {
  active:    { label: 'ساري',          dot: 'bg-emerald-500', cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  pending:   { label: 'قيد الانتظار', dot: 'bg-amber-500',   cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  expired:   { label: 'منتهي',         dot: 'bg-red-500',     cls: 'bg-red-50 text-red-600 ring-1 ring-red-200' },
  rejected:  { label: 'مرفوض',        dot: 'bg-slate-400',   cls: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200' },
  suspended: { label: 'موقوف',         dot: 'bg-orange-500',  cls: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' },
}

export default function StatusBadge({ status, size = 'md' }: Props) {
  const c = config[status] ?? { label: status, dot: 'bg-slate-400', cls: 'bg-slate-100 text-slate-600' }
  const sz = size === 'sm' ? 'text-xs px-2 py-0.5 gap-1' : 'text-xs px-2.5 py-1 gap-1.5'
  const dotSz = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'
  return (
    <span className={`inline-flex items-center rounded-full font-semibold ${sz} ${c.cls}`}>
      <span className={`${dotSz} rounded-full flex-shrink-0 ${c.dot} ${status === 'active' ? 'animate-pulse' : ''}`} />
      {c.label}
    </span>
  )
}
