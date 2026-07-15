import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getCompany, createCompany, updateCompany } from '../../api/companies'
import toast from 'react-hot-toast'
import LoadingSpinner from '../../components/LoadingSpinner'

interface FormData {
  name: string; companyNumber: string; email: string; phone: string
  status: string; city: string; address: string
}
const EMPTY: FormData = { name: '', companyNumber: '', email: '', phone: '', status: 'active', city: '', address: '' }

export default function CompanyForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const [form, setForm] = useState<FormData>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [initLoading, setInitLoading] = useState(isEdit)

  useEffect(() => {
    if (!isEdit) return
    getCompany(id!).then((c) => setForm({ name: c.name, companyNumber: c.companyNumber, email: c.email, phone: c.phone, status: c.status, city: c.city, address: c.address })).finally(() => setInitLoading(false))
  }, [id])

  const set = (k: keyof FormData, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name) { toast.error('يرجى إدخال اسم الشركة'); return }
    setLoading(true)
    try {
      if (isEdit) { await updateCompany(id!, form); toast.success('تم تحديث الشركة') }
      else { await createCompany(form); toast.success('تم إضافة الشركة') }
      navigate('/companies')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'حدث خطأ')
    } finally { setLoading(false) }
  }

  if (initLoading) return <LoadingSpinner />

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/companies" className="text-slate-400 hover:text-slate-700">← العودة</Link>
        <h1 className="text-2xl font-extrabold text-slate-900">{isEdit ? 'تعديل الشركة' : 'إضافة شركة جديدة'}</h1>
      </div>
      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="label">اسم الشركة <span className="text-red-500">*</span></label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} className="input" placeholder="شركة ..." required />
          </div>
          <div>
            <label className="label">رقم السجل التجاري</label>
            <input value={form.companyNumber} onChange={(e) => set('companyNumber', e.target.value)} className="input" placeholder="CR-XXXXXXX" />
          </div>
          <div>
            <label className="label">الحالة</label>
            <select value={form.status} onChange={(e) => set('status', e.target.value)} className="input">
              <option value="active">نشطة</option>
              <option value="suspended">موقوفة</option>
            </select>
          </div>
          <div>
            <label className="label">رقم الجوال</label>
            <input value={form.phone} onChange={(e) => set('phone', e.target.value)} className="input" placeholder="011XXXXXXX" />
          </div>
          <div>
            <label className="label">البريد الإلكتروني</label>
            <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className="input" placeholder="info@company.sa" />
          </div>
          <div>
            <label className="label">المدينة</label>
            <input value={form.city} onChange={(e) => set('city', e.target.value)} className="input" placeholder="الرياض" />
          </div>
          <div>
            <label className="label">العنوان</label>
            <input value={form.address} onChange={(e) => set('address', e.target.value)} className="input" placeholder="الحي، الشارع" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link to="/companies" className="btn-secondary">إلغاء</Link>
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'جاري الحفظ...' : isEdit ? 'حفظ التغييرات' : 'إضافة الشركة'}</button>
        </div>
      </form>
    </div>
  )
}
