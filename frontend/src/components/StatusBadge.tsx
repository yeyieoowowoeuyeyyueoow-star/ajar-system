interface Props {
  status: string
  size?: 'sm' | 'md'
}

const config: Record<string, { label: string; cls: string }> = {
  active:   { label: 'ساري',           cls: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200' },
  pending:  { label: 'قيد الانتظار',   cls: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200' },
  expired:  { label: 'منتهي',          cls: 'bg-red-100 text-red-600 ring-1 ring-red-200' },
  rejected: { label: 'مرفوض',         cls: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200' },
  suspended:{ label: 'موقوف',          cls: 'bg-orange-100 text-orange-700 ring-1 ring-orange-200' },
}

export default function StatusBadge({ status, size = 'md' }: Props) {
  const c = config[status] ?? { label: status, cls: 'bg-slate-100 text-slate-600' }
  const sz = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1'
  return (
    <span className={`inline-flex items-center rounded-full font-semibold ${sz} ${c.cls}`}>
      {c.label}
    </span>
  )
}
