import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getPermit, createPermit, updatePermit } from '../../api/permits'
import { getWorkers } from '../../api/workers'
import { getCompanies } from '../../api/companies'
import { Worker, Company } from '../../types'
import toast from 'react-hot-toast'
import LoadingSpinner from '../../components/LoadingSpinner'

const STATUS_OPTIONS = ['active', 'pending', 'expired', 'rejected']
const STATUS_LABELS: Record<string, string> = { active: 'ساري', pending: 'قيد الانتظار', expired: 'منتهي', rejected: 'مرفوض' }

interface FormData {
  workerId: string
  companyId: string
  beneficiaryCompanyId: string
  occupation: string
  notes: string
  workLocation: string
  status: string
  startDate: string
  expiryDate: string
  issueDate: string
}

const EMPTY: FormData = {
  workerId: '', companyId: '', beneficiaryCompanyId: '',
  occupation: '', notes: '', workLocation: '',
  status: 'pending', startDate: '', expiryDate: '', issueDate: '',
}

export default function PermitForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [form, setForm] = useState<FormData>(EMPTY)
  const [workers, setWorkers] = useState<Worker[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(false)
  const [initLoading, setInitLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getWorkers({ limit: 100 }),
      getCompanies({ limit: 100 }),
      isEdit ? getPermit(id!) : Promise.resolve(null),
    ]).then(([w, c, p]) => {
      setWorkers(w.data)
      setCompanies(c.data)
      if (p) {
        setForm({
          workerId: p.workerId ?? '',
          companyId: p.companyId ?? '',
          beneficiaryCompanyId: p.beneficiaryCompanyId ?? '',
          occupation: p.occupation ?? '',
          notes: p.notes ?? '',
          workLocation: p.workLocation ?? '',
          status: p.status ?? 'pending',
          startDate: p.startDate ?? '',
          expiryDate: p.expiryDate ?? '',
          issueDate: p.issueDate ?? '',
        })
      }
    }).finally(() => setInitLoading(false))
  }, [id])

  const set = (k: keyof FormData, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.workerId || !form.companyId || !form.occupation) {
      toast.error('يرجى ملء الحقول المطلوبة')
      return
    }
    setLoading(true)
    try {
      if (isEdit) {
        await updatePermit(id!, form)
        toast.success('تم تحديث التصريح')
        navigate(`/permits/${id}`)
      } else {
        const p = await createPermit(form)
        toast.success('تم إنشاء التصريح')
        navigate(`/permits/${p.id}`)
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'حدث خطأ')
    } finally {
      setLoading(false)
    }
  }

  if (initLoading) return <LoadingSpinner />

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <Link to={isEdit ? `/permits/${id}` : '/permits'} className="text-slate-400 hover:text-slate-700">← العودة</Link>
        <h1 className="text-2xl font-extrabold text-slate-900">{isEdit ? 'تعديل التصريح' : 'إضافة تصريح جديد'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">العامل <span className="text-red-500">*</span></label>
            <select value={form.workerId} onChange={(e) => set('workerId', e.target.value)} className="input" required>
              <option value="">-- اختر العامل --</option>
              {workers.map((w) => <option key={w.id} value={w.id}>{w.fullName}</option>)}
            </select>
          </div>
          <div>
            <label className="label">الشركة المزودة <span className="text-red-500">*</span></label>
            <select value={form.companyId} onChange={(e) => set('companyId', e.target.value)} className="input" required>
              <option value="">-- اختر الشركة --</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">الشركة المستفيدة</label>
            <select value={form.beneficiaryCompanyId} onChange={(e) => set('beneficiaryCompanyId', e.target.value)} className="input">
              <option value="">-- اختياري --</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">المهنة <span className="text-red-500">*</span></label>
            <input value={form.occupation} onChange={(e) => set('occupation', e.target.value)} className="input" placeholder="مثال: فني كهرباء" required />
          </div>
          <div>
            <label className="label">الحالة</label>
            <select value={form.status} onChange={(e) => set('status', e.target.value)} className="input">
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>
          <div>
            <label className="label">موقع العمل</label>
            <input value={form.workLocation} onChange={(e) => set('workLocation', e.target.value)} className="input" placeholder="المدينة، الحي" />
          </div>
          <div>
            <label className="label">تاريخ الإصدار</label>
            <input type="date" value={form.issueDate} onChange={(e) => set('issueDate', e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">تاريخ البدء</label>
            <input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">تاريخ الانتهاء</label>
            <input type="date" value={form.expiryDate} onChange={(e) => set('expiryDate', e.target.value)} className="input" />
          </div>
        </div>
        <div>
          <label className="label">الملاحظات</label>
          <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} className="input h-24 resize-none" placeholder="ملاحظات إضافية..." />
        </div>
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link to={isEdit ? `/permits/${id}` : '/permits'} className="btn-secondary">إلغاء</Link>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'جاري الحفظ...' : isEdit ? 'حفظ التغييرات' : 'إنشاء التصريح'}
          </button>
        </div>
      </form>
    </div>
  )
}
