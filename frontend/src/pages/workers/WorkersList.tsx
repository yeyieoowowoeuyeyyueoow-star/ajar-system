import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getWorkers, deleteWorker } from '../../api/workers'
import { Worker, PaginatedResponse } from '../../types'
import StatusBadge from '../../components/StatusBadge'
import Pagination from '../../components/Pagination'
import ConfirmDialog from '../../components/ConfirmDialog'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import toast from 'react-hot-toast'

export default function WorkersList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [data, setData] = useState<PaginatedResponse<Worker> | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const q = searchParams.get('q') ?? ''
  const page = Number(searchParams.get('page') ?? 1)

  const load = () => {
    setLoading(true)
    getWorkers({ q, page, limit: 20 }).then(setData).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [q, page])

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
      await deleteWorker(deleteId)
      toast.success('تم حذف العامل')
      setDeleteId(null)
      load()
    } catch { toast.error('حدث خطأ أثناء الحذف') }
    finally { setDeleteLoading(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">العمال</h1>
          <p className="text-sm text-slate-500 mt-0.5">إدارة بيانات العمال</p>
        </div>
        <Link to="/workers/new" className="btn-primary"><span>+</span> إضافة عامل</Link>
      </div>

      <div className="card p-4">
        <input
          value={q}
          onChange={(e) => setParam('q', e.target.value)}
          placeholder="بحث بالاسم أو رقم الهوية..."
          className="input max-w-sm"
        />
      </div>

      <div className="card overflow-hidden">
        {loading ? <LoadingSpinner /> : !data || data.data.length === 0 ? (
          <EmptyState icon="👷" title="لا يوجد عمال" description="لم يتم العثور على عمال يطابقون البحث" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="th">الاسم الكامل</th>
                    <th className="th">رقم الهوية</th>
                    <th className="th">الجنسية</th>
                    <th className="th">المهنة</th>
                    <th className="th">الجوال</th>
                    <th className="th">الحالة</th>
                    <th className="th">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((w) => (
                    <tr key={w.id} className="table-row">
                      <td className="td font-semibold">{w.fullName}</td>
                      <td className="td font-mono text-slate-500">{w.idNumber}</td>
                      <td className="td">{w.nationality}</td>
                      <td className="td">{w.occupation}</td>
                      <td className="td">{w.phone}</td>
                      <td className="td"><StatusBadge status={w.status} /></td>
                      <td className="td">
                        <div className="flex items-center gap-2">
                          <Link to={`/workers/${w.id}/edit`} className="text-xs text-primary-600 hover:text-primary-800 font-semibold">تعديل</Link>
                          <Link to={`/permits?workerId=${w.id}`} className="text-xs text-slate-600 hover:text-slate-900 font-semibold">التصاريح</Link>
                          <button onClick={() => setDeleteId(w.id)} className="text-xs text-red-500 hover:text-red-700 font-semibold">حذف</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={data.page} totalPages={data.totalPages} total={data.total} limit={data.limit} onPageChange={(p) => setParam('page', String(p))} />
          </>
        )}
      </div>

      <ConfirmDialog open={!!deleteId} title="حذف العامل" message="هل أنت متأكد من حذف هذا العامل؟" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} loading={deleteLoading} />
    </div>
  )
}
