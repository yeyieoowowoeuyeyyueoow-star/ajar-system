import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getWorker, createWorker, updateWorker } from '../../api/workers'
import { getCompanies } from '../../api/companies'
import { Company } from '../../types'
import toast from 'react-hot-toast'
import LoadingSpinner from '../../components/LoadingSpinner'

interface FormData {
  fullName: string; idNumber: string; nationality: string; occupation: string
  phone: string; email: string; passportNumber: string; birthDate: string
  companyId: string; status: string
}
const EMPTY: FormData = {
  fullName: '', idNumber: '', nationality: '', occupation: '',
  phone: '', email: '', passportNumber: '', birthDate: '',
  companyId: '', status: 'active',
}

export default function WorkerForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const [form, setForm] = useState<FormData>(EMPTY)
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(false)
  const [initLoading, setInitLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getCompanies({ limit: 100 }),
      isEdit ? getWorker(id!) : Promise.resolve(null),
    ]).then(([c, w]) => {
      setCompanies(c.data)
      if (w) setForm({ fullName: w.fullName, idNumber: w.idNumber, nationality: w.nationality, occupation: w.occupation, phone: w.phone, email: w.email, passportNumber: w.passportNumber, birthDate: w.birthDate, companyId: w.companyId, status: w.status })
    }).finally(() => setInitLoading(false))
  }, [id])

  const set = (k: keyof FormData, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.fullName || !form.idNumber) { toast.error('يرجى ملء الحقول المطلوبة'); return }
    setLoading(true)
    try {
      if (isEdit) { await updateWorker(id!, form); toast.success('تم تحديث بيانات العامل'); navigate('/workers') }
      else { await createWorker(form); toast.success('تم إضافة العامل'); navigate('/workers') }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'حدث خطأ')
    } finally { setLoading(false) }
  }

  if (initLoading) return <LoadingSpinner />

  const F = ({ label, field, type = 'text', placeholder = '', required = false }: { label: string; field: keyof FormData; type?: string; placeholder?: string; required?: boolean }) => (
    <div>
      <label className="label">{label}{required && <span className="text-red-500 mr-1">*</span>}</label>
      <input type={type} value={form[field]} onChange={(e) => set(field, e.target.value)} className="input" placeholder={placeholder} required={required} />
    </div>
  )

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/workers" className="text-slate-400 hover:text-slate-700">← العودة</Link>
        <h1 className="text-2xl font-extrabold text-slate-900">{isEdit ? 'تعديل بيانات العامل' : 'إضافة عامل جديد'}</h1>
      </div>
      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <F label="الاسم الكامل" field="fullName" placeholder="محمد عبدالله" required />
          <F label="رقم الهوية / الإقامة" field="idNumber" placeholder="2XXXXXXXXX" required />
          <F label="الجنسية" field="nationality" placeholder="سعودي / يمني / ..." />
          <F label="المهنة" field="occupation" placeholder="فني كهرباء" />
          <F label="رقم الجوال" field="phone" placeholder="05XXXXXXXX" />
          <F label="البريد الإلكتروني" field="email" type="email" placeholder="worker@email.com" />
          <F label="رقم جواز السفر" field="passportNumber" placeholder="A12345678" />
          <F label="تاريخ الميلاد" field="birthDate" type="date" />
          <div>
            <label className="label">الشركة</label>
            <select value={form.companyId} onChange={(e) => set('companyId', e.target.value)} className="input">
              <option value="">-- اختر الشركة --</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">الحالة</label>
            <select value={form.status} onChange={(e) => set('status', e.target.value)} className="input">
              <option value="active">نشط</option>
              <option value="suspended">موقوف</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link to="/workers" className="btn-secondary">إلغاء</Link>
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'جاري الحفظ...' : isEdit ? 'حفظ التغييرات' : 'إضافة العامل'}</button>
        </div>
      </form>
    </div>
  )
}
