import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getUser, createUser, updateUser } from '../../api/users'
import toast from 'react-hot-toast'
import LoadingSpinner from '../../components/LoadingSpinner'

interface FormData {
  fullName: string; username: string; email: string
  role: string; status: string; password: string
}
const EMPTY: FormData = { fullName: '', username: '', email: '', role: 'operator', status: 'active', password: '' }

export default function UserForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const [form, setForm] = useState<FormData>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [initLoading, setInitLoading] = useState(isEdit)

  useEffect(() => {
    if (!isEdit) return
    getUser(id!).then((u) => setForm({ fullName: u.fullName, username: u.username, email: u.email, role: u.role, status: u.status, password: '' })).finally(() => setInitLoading(false))
  }, [id])

  const set = (k: keyof FormData, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.fullName || !form.username) { toast.error('يرجى ملء الحقول المطلوبة'); return }
    if (!isEdit && !form.password) { toast.error('كلمة المرور مطلوبة'); return }
    setLoading(true)
    try {
      const payload: Record<string, string> = { fullName: form.fullName, username: form.username, email: form.email, role: form.role, status: form.status }
      if (form.password) payload.password = form.password
      if (isEdit) { await updateUser(id!, payload); toast.success('تم تحديث المستخدم') }
      else { await createUser(payload); toast.success('تم إضافة المستخدم') }
      navigate('/users')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'حدث خطأ')
    } finally { setLoading(false) }
  }

  if (initLoading) return <LoadingSpinner />

  return (
    <div className="max-w-xl space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/users" className="text-slate-400 hover:text-slate-700">← العودة</Link>
        <h1 className="text-2xl font-extrabold text-slate-900">{isEdit ? 'تعديل المستخدم' : 'إضافة مستخدم'}</h1>
      </div>
      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">الاسم الكامل <span className="text-red-500">*</span></label>
            <input value={form.fullName} onChange={(e) => set('fullName', e.target.value)} className="input" required />
          </div>
          <div>
            <label className="label">اسم المستخدم <span className="text-red-500">*</span></label>
            <input value={form.username} onChange={(e) => set('username', e.target.value)} className="input" required />
          </div>
          <div>
            <label className="label">البريد الإلكتروني</label>
            <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">الدور</label>
            <select value={form.role} onChange={(e) => set('role', e.target.value)} className="input">
              <option value="admin">مدير النظام</option>
              <option value="manager">مشرف</option>
              <option value="operator">مشغل</option>
            </select>
          </div>
          <div>
            <label className="label">الحالة</label>
            <select value={form.status} onChange={(e) => set('status', e.target.value)} className="input">
              <option value="active">نشط</option>
              <option value="suspended">موقوف</option>
            </select>
          </div>
          <div>
            <label className="label">{isEdit ? 'كلمة مرور جديدة (اتركها فارغة للإبقاء)' : 'كلمة المرور *'}</label>
            <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} className="input" required={!isEdit} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link to="/users" className="btn-secondary">إلغاء</Link>
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'جاري الحفظ...' : isEdit ? 'حفظ التغييرات' : 'إضافة المستخدم'}</button>
        </div>
      </form>
    </div>
  )
}
