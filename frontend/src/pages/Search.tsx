import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { globalSearch } from '../api/search'
import { Permit, Worker, Company } from '../types'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'

interface SearchResults { permits: Permit[]; workers: Worker[]; companies: Company[] }

export default function Search() {
  const [searchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!q) return
    setLoading(true)
    globalSearch(q).then(setResults).finally(() => setLoading(false))
  }, [q])

  const total = results ? results.permits.length + results.workers.length + results.companies.length : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">نتائج البحث</h1>
        {q && <p className="text-sm text-slate-500 mt-0.5">بحث عن: "<span className="font-semibold text-slate-800">{q}</span>"</p>}
      </div>

      {!q && (
        <div className="card p-12 text-center">
          <p className="text-5xl mb-3">🔍</p>
          <p className="text-slate-500">اكتب في شريط البحث للعثور على نتائج</p>
        </div>
      )}

      {loading && <LoadingSpinner />}

      {results && !loading && (
        <>
          <p className="text-sm text-slate-500 font-medium">{total} نتيجة</p>

          {results.permits.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                <h2 className="font-bold text-slate-700">التصاريح ({results.permits.length})</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {results.permits.map((p) => (
                  <Link to={`/permits/${p.id}`} key={p.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors">
                    <span className="text-2xl">📋</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800">{p.workerName}</p>
                      <p className="text-xs text-slate-500">{p.permitNumber} · {p.occupation}</p>
                    </div>
                    <StatusBadge status={p.status} size="sm" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {results.workers.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                <h2 className="font-bold text-slate-700">العمال ({results.workers.length})</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {results.workers.map((w) => (
                  <Link to={`/workers/${w.id}/edit`} key={w.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors">
                    <span className="text-2xl">👷</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800">{w.fullName}</p>
                      <p className="text-xs text-slate-500">{w.idNumber} · {w.nationality} · {w.occupation}</p>
                    </div>
                    <StatusBadge status={w.status} size="sm" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {results.companies.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                <h2 className="font-bold text-slate-700">الشركات ({results.companies.length})</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {results.companies.map((c) => (
                  <Link to={`/companies/${c.id}/edit`} key={c.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors">
                    <span className="text-2xl">🏢</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800">{c.name}</p>
                      <p className="text-xs text-slate-500">{c.companyNumber} · {c.city}</p>
                    </div>
                    <StatusBadge status={c.status} size="sm" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {total === 0 && (
            <div className="card p-12 text-center">
              <p className="text-5xl mb-3">😔</p>
              <p className="text-lg font-bold text-slate-700">لا توجد نتائج</p>
              <p className="text-sm text-slate-500 mt-1">لم يتم العثور على أي نتائج تطابق "{q}"</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
