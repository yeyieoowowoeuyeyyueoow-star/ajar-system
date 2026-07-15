import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getPermits, deletePermit } from '../../api/permits'
import { Permit, PaginatedResponse } from '../../types'
import StatusBadge from '../../components/StatusBadge'
import Pagination from '../../components/Pagination'
import ConfirmDialog from '../../components/ConfirmDialog'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import { formatDate } from '../../utils/format'
import toast from 'react-hot-toast'

const STATUSES = [
  { value: '', label: 'الكل' },
  { value: 'active', label: 'ساري' },
  { value: 'pending', label: 'قيد الانتظار' },
  { value: 'expired', label: 'منتهي' },
  { value: 'rejected', label: 'مرفوض' },
]

export default function PermitsList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [data, setData] = useState<PaginatedResponse<Permit> | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const q = searchParams.get('q') ?? ''
  const status = searchParams.get('status') ?? ''
  const page = Number(searchParams.get('page') ?? 1)

  const load = () => {
    setLoading(true)
    getPermits({ q, status, page, limit: 20 })
      .then(setData)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [q, status, page])

  const setParam = (key: string, val: string) => {
    const p = new URLSearchParams(searchParams)
    if (val) p.set(key, val); else p.delete(key)
    p.delete('page')
    setSearchParams(p)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleteLoading(true)
    try {
      await deletePermit(deleteId)
      toast.success('تم حذف التصريح')
      setDeleteId(null)
      load()
    } catch {
      toast.error('حدث خطأ أثناء الحذف')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">التصاريح</h1>
          <p className="text-sm text-slate-500 mt-0.5">إدارة تصاريح العمل</p>
        </div>
        <Link to="/permits/new" className="btn-primary">
          <span>+</span> إضافة تصريح
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setParam('q', e.target.value)}
          placeholder="بحث برقم التصريح أو اسم العامل..."
          className="input flex-1 min-w-48"
        />
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => setParam('status', s.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                status === s.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <LoadingSpinner />
        ) : !data || data.data.length === 0 ? (
          <EmptyState icon="📋" title="لا توجد تصاريح" description="لم يتم العثور على تصاريح تطابق البحث" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="th">رقم التصريح</th>
                    <th className="th">العامل</th>
                    <th className="th">الشركة المزودة</th>
                    <th className="th">المهنة</th>
                    <th className="th">تاريخ الانتهاء</th>
                    <th className="th">الحالة</th>
                    <th className="th">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((p) => (
                    <tr key={p.id} className="table-row">
                      <td className="td font-mono font-bold text-primary-700">
                        <Link to={`/permits/${p.id}`} className="hover:underline">{p.permitNumber}</Link>
                      </td>
                      <td className="td font-semibold">{p.workerName}</td>
                      <td className="td text-slate-500">{p.companyName}</td>
                      <td className="td">{p.occupation}</td>
                      <td className="td">{formatDate(p.expiryDate)}</td>
                      <td className="td"><StatusBadge status={p.status} /></td>
                      <td className="td">
                        <div className="flex items-center gap-2">
                          <Link to={`/permits/${p.id}`} className="text-xs text-primary-600 hover:text-primary-800 font-semibold">عرض</Link>
                          <Link to={`/permits/${p.id}/edit`} className="text-xs text-slate-600 hover:text-slate-900 font-semibold">تعديل</Link>
                          <button onClick={() => setDeleteId(p.id)} className="text-xs text-red-500 hover:text-red-700 font-semibold">حذف</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              total={data.total}
              limit={data.limit}
              onPageChange={(p) => setParam('page', String(p))}
            />
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="حذف التصريح"
        message="هل أنت متأكد من حذف هذا التصريح؟ لا يمكن التراجع عن هذا الإجراء."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleteLoading}
      />
    </div>
  )
}
