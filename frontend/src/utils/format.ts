export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return dateStr
  }
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    return d.toLocaleString('ar-SA', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

export function daysUntil(dateStr: string): number {
  const now = new Date()
  const target = new Date(dateStr)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export const STATUS_LABEL: Record<string, string> = {
  active: 'ساري',
  pending: 'قيد الانتظار',
  expired: 'منتهي',
  rejected: 'مرفوض',
  suspended: 'موقوف',
}

export const ROLE_LABEL: Record<string, string> = {
  admin: 'مدير النظام',
  manager: 'مشرف',
  operator: 'مشغل',
}
