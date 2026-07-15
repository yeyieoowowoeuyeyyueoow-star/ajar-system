import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getUsers, deleteUser } from '../../api/users'
import { User, PaginatedResponse } from '../../types'
import StatusBadge from '../../components/StatusBadge'
import Pagination from '../../components/Pagination'
import ConfirmDialog from '../../components/ConfirmDialog'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import { formatDateTime, ROLE_LABEL } from '../../utils/format'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function UsersList() {
  const { user: me } = useAuth()
  const [data, setData] = useState<PaginatedResponse<User> | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [page, setPage] = useState(1)

  const load = () => {
    setLoading(true)
    getUsers({ page, limit: 20 }).then(setData).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [page])

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleteLoading(true)
    try { await deleteUser(deleteId); toast.success('تم حذف المستخدم'); setDeleteId(null); load() }
    catch (err: unknown) { const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message; toast.error(msg ?? 'حدث خطأ') }
    finally { setDeleteLoading(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">المستخدمين</h1>
          <p className="text-sm text-slate-500 mt-0.5">إدارة حسابات المستخدمين</p>
        </div>
        <Link to="/users/new" className="btn-primary"><span>+</span> إضافة مستخدم</Link>
      </div>

      <div className="card overflow-hidden">
        {loading ? <LoadingSpinner /> : !data || data.data.length === 0 ? (
          <EmptyState icon="👥" title="لا يوجد مستخدمون" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="th">الاسم الكامل</th>
                    <th className="th">اسم المستخدم</th>
                    <th className="th">البريد الإلكتروني</th>
                    <th className="th">الدور</th>
                    <th className="th">الحالة</th>
                    <th className="th">تاريخ الإنشاء</th>
                    <th className="th">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((u) => (
                    <tr key={u.id} className="table-row">
                      <td className="td font-semibold flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {u.fullName?.[0]}
                        </div>
                        {u.fullName}
                        {u.id === me?.id && <span className="text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded font-bold">أنا</span>}
                      </td>
                      <td className="td font-mono text-slate-500">{u.username}</td>
                      <td className="td text-slate-500">{u.email}</td>
                      <td className="td"><span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">{ROLE_LABEL[u.role] ?? u.role}</span></td>
                      <td className="td"><StatusBadge status={u.status} /></td>
                      <td className="td text-slate-500">{formatDateTime(u.createdAt)}</td>
                      <td className="td">
                        <div className="flex items-center gap-2">
                          <Link to={`/users/${u.id}/edit`} className="text-xs text-primary-600 hover:text-primary-800 font-semibold">تعديل</Link>
                          {u.id !== me?.id && <button onClick={() => setDeleteId(u.id)} className="text-xs text-red-500 hover:text-red-700 font-semibold">حذف</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={data.page} totalPages={data.totalPages} total={data.total} limit={data.limit} onPageChange={setPage} />
          </>
        )}
      </div>
      <ConfirmDialog open={!!deleteId} title="حذف المستخدم" message="هل أنت متأكد من حذف هذا المستخدم؟" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} loading={deleteLoading} />
    </div>
  )
}
