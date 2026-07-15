import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getCompanies, deleteCompany } from '../../api/companies'
import { Company, PaginatedResponse } from '../../types'
import StatusBadge from '../../components/StatusBadge'
import Pagination from '../../components/Pagination'
import ConfirmDialog from '../../components/ConfirmDialog'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import toast from 'react-hot-toast'

export default function CompaniesList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [data, setData] = useState<PaginatedResponse<Company> | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const q = searchParams.get('q') ?? ''
  const page = Number(searchParams.get('page') ?? 1)

  const load = () => {
    setLoading(true)
    getCompanies({ q, page, limit: 20 }).then(setData).finally(() => setLoading(false))
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
    try { await deleteCompany(deleteId); toast.success('تم حذف الشركة'); setDeleteId(null); load() }
    catch { toast.error('حدث خطأ أثناء الحذف') }
    finally { setDeleteLoading(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">الشركات</h1>
          <p className="text-sm text-slate-500 mt-0.5">إدارة الشركات المسجلة</p>
        </div>
        <Link to="/companies/new" className="btn-primary"><span>+</span> إضافة شركة</Link>
      </div>

      <div className="card p-4">
        <input value={q} onChange={(e) => setParam('q', e.target.value)} placeholder="بحث باسم الشركة..." className="input max-w-sm" />
      </div>

      <div className="card overflow-hidden">
        {loading ? <LoadingSpinner /> : !data || data.data.length === 0 ? (
          <EmptyState icon="🏢" title="لا توجد شركات" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="th">اسم الشركة</th>
                    <th className="th">رقم السجل التجاري</th>
                    <th className="th">المدينة</th>
                    <th className="th">الجوال</th>
                    <th className="th">البريد</th>
                    <th className="th">الحالة</th>
                    <th className="th">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((c) => (
                    <tr key={c.id} className="table-row">
                      <td className="td font-semibold">{c.name}</td>
                      <td className="td font-mono text-slate-500">{c.companyNumber}</td>
                      <td className="td">{c.city}</td>
                      <td className="td">{c.phone}</td>
                      <td className="td text-slate-500">{c.email}</td>
                      <td className="td"><StatusBadge status={c.status} /></td>
                      <td className="td">
                        <div className="flex items-center gap-2">
                          <Link to={`/companies/${c.id}/edit`} className="text-xs text-primary-600 hover:text-primary-800 font-semibold">تعديل</Link>
                          <button onClick={() => setDeleteId(c.id)} className="text-xs text-red-500 hover:text-red-700 font-semibold">حذف</button>
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
      <ConfirmDialog open={!!deleteId} title="حذف الشركة" message="هل أنت متأكد من حذف هذه الشركة؟" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} loading={deleteLoading} />
    </div>
  )
}
