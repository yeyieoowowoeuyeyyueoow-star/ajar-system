import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getLogs } from '../api/logs'
import { Log, PaginatedResponse } from '../types'
import Pagination from '../components/Pagination'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import { formatDateTime } from '../utils/format'

const ENTITY_ICONS: Record<string, string> = {
  auth: '🔐', permit: '📋', worker: '👷', company: '🏢', user: '👤',
}

export default function Logs() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [data, setData] = useState<PaginatedResponse<Log> | null>(null)
  const [loading, setLoading] = useState(true)

  const q = searchParams.get('q') ?? ''
  const page = Number(searchParams.get('page') ?? 1)

  useEffect(() => {
    setLoading(true)
    getLogs({ q, page, limit: 25 }).then(setData).finally(() => setLoading(false))
  }, [q, page])

  const setParam = (key: string, val: string) => {
    const p = new URLSearchParams(searchParams)
    if (val) p.set(key, val); else p.delete(key)
    p.delete('page')
    setSearchParams(p)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">سجل النشاط</h1>
        <p className="text-sm text-slate-500 mt-0.5">جميع العمليات المُنفَّذة في النظام</p>
      </div>

      <div className="card p-4">
        <input value={q} onChange={(e) => setParam('q', e.target.value)} placeholder="بحث في السجل..." className="input max-w-sm" />
      </div>

      <div className="card overflow-hidden">
        {loading ? <LoadingSpinner /> : !data || data.data.length === 0 ? (
          <EmptyState icon="📄" title="لا توجد سجلات" />
        ) : (
          <>
            <div className="divide-y divide-slate-100">
              {data.data.map((log) => (
                <div key={log.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg flex-shrink-0">
                    {ENTITY_ICONS[log.entityType] ?? '📝'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-800 text-sm">{log.userName}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-sm font-semibold text-primary-700">{log.action}</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-0.5">{log.details}</p>
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0 whitespace-nowrap">{formatDateTime(log.createdAt)}</span>
                </div>
              ))}
            </div>
            <Pagination page={data.page} totalPages={data.totalPages} total={data.total} limit={data.limit} onPageChange={(p) => setParam('page', String(p))} />
          </>
        )}
      </div>
    </div>
  )
}
