import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getPermit, createPermit, updatePermit } from '../../api/permits'
import { getWorkers, createWorker } from '../../api/workers'
import { getCompanies, createCompany } from '../../api/companies'
import { Worker, Company } from '../../types'
import EntityCombobox, { ComboOption } from '../../components/EntityCombobox'
import toast from 'react-hot-toast'
import LoadingSpinner from '../../components/LoadingSpinner'

const STATUS_OPTIONS = ['active', 'pending', 'expired', 'rejected']
const STATUS_LABELS: Record<string, string> = {
  active: 'ساري', pending: 'قيد الانتظار', expired: 'منتهي', rejected: 'مرفوض',
}

// ── Entity state helpers ──────────────────────────────────────────────────────
interface EntityState {
  id: string       // '' when new
  text: string     // display name
  isNew: boolean
}
const emptyEntity = (): EntityState => ({ id: '', text: '', isNew: false })

// New-worker extra fields
interface NewWorker { idNumber: string; nationality: string; phone: string }
// New-company extra field
interface NewCompany { companyNumber: string }

// Core permit fields (no IDs — those come from entity states)
interface PermitFields {
  occupation: string
  notes: string
  workLocation: string
  status: string
  startDate: string
  expiryDate: string
  issueDate: string
}
const EMPTY_FIELDS: PermitFields = {
  occupation: '', notes: '', workLocation: '',
  status: 'pending', startDate: '', expiryDate: '', issueDate: '',
}

export default function PermitForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [fields, setFields] = useState<PermitFields>(EMPTY_FIELDS)
  const set = (k: keyof PermitFields, v: string) => setFields((f) => ({ ...f, [k]: v }))

  // Entity states
  const [worker, setWorker] = useState<EntityState>(emptyEntity())
  const [newWorker, setNewWorker] = useState<NewWorker>({ idNumber: '', nationality: '', phone: '' })
  const setNW = (k: keyof NewWorker, v: string) => setNewWorker((p) => ({ ...p, [k]: v }))

  const [provider, setProvider] = useState<EntityState>(emptyEntity())
  const [newProvider, setNewProvider] = useState<NewCompany>({ companyNumber: '' })

  const [beneficiary, setBeneficiary] = useState<EntityState>(emptyEntity())
  const [newBeneficiary, setNewBeneficiary] = useState<NewCompany>({ companyNumber: '' })

  // Options lists
  const [workerOpts, setWorkerOpts] = useState<ComboOption[]>([])
  const [companyOpts, setCompanyOpts] = useState<ComboOption[]>([])
  const [loading, setLoading] = useState(false)
  const [initLoading, setInitLoading] = useState(true)

  // ── Load initial data ───────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      getWorkers({ limit: 200 }),
      getCompanies({ limit: 200 }),
      isEdit ? getPermit(id!) : Promise.resolve(null),
    ]).then(([w, c, p]) => {
      setWorkerOpts(
        (w.data as Worker[]).map((x) => ({ id: x.id, label: x.fullName, sub: x.idNumber }))
      )
      setCompanyOpts(
        (c.data as Company[]).map((x) => ({ id: x.id, label: x.name, sub: x.companyNumber }))
      )

      if (p) {
        setFields({
          occupation:   p.occupation   ?? '',
          notes:        p.notes        ?? '',
          workLocation: p.workLocation ?? '',
          status:       p.status       ?? 'pending',
          startDate:    p.startDate    ?? '',
          expiryDate:   p.expiryDate   ?? '',
          issueDate:    p.issueDate    ?? '',
        })
        // Restore entity states from enriched permit
        if (p.workerId) {
          const wName = p.worker?.fullName ?? p.workerName ?? p.workerId
          setWorker({ id: p.workerId, text: wName, isNew: false })
        }
        if (p.companyId) {
          const cName = p.providerCompany?.name ?? p.companyName ?? p.companyId
          setProvider({ id: p.companyId, text: cName, isNew: false })
        }
        if (p.beneficiaryCompanyId) {
          const bName = p.beneficiaryCompany?.name ?? p.beneficiaryCompanyId
          setBeneficiary({ id: p.beneficiaryCompanyId, text: bName, isNew: false })
        }
      }
    }).finally(() => setInitLoading(false))
  }, [id])

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!worker.text) { toast.error('يرجى إدخال اسم العامل'); return }
    if (!provider.text) { toast.error('يرجى إدخال الشركة المزودة'); return }
    if (!fields.occupation) { toast.error('يرجى إدخال المهنة'); return }

    setLoading(true)
    try {
      // 1. Create new worker if needed
      let workerId = worker.id
      if (worker.isNew) {
        const created = await createWorker({
          fullName:    worker.text,
          idNumber:    newWorker.idNumber,
          nationality: newWorker.nationality,
          phone:       newWorker.phone,
          occupation:  fields.occupation,
          status:      'active',
        })
        workerId = created.id
        toast.success(`تم حفظ العامل: ${worker.text}`)
      }

      // 2. Create new provider company if needed
      let companyId = provider.id
      if (provider.isNew) {
        const created = await createCompany({
          name:          provider.text,
          companyNumber: newProvider.companyNumber,
          status:        'active',
        })
        companyId = created.id
        toast.success(`تم حفظ الشركة: ${provider.text}`)
      }

      // 3. Create new beneficiary company if needed
      let beneficiaryCompanyId = beneficiary.id
      if (beneficiary.isNew && beneficiary.text) {
        const created = await createCompany({
          name:          beneficiary.text,
          companyNumber: newBeneficiary.companyNumber,
          status:        'active',
        })
        beneficiaryCompanyId = created.id
        toast.success(`تم حفظ الشركة: ${beneficiary.text}`)
      }

      // 4. Create / update permit
      const payload = { ...fields, workerId, companyId, beneficiaryCompanyId }

      if (isEdit) {
        await updatePermit(id!, payload)
        toast.success('تم تحديث التصريح')
        navigate(`/permits/${id}`)
      } else {
        const p = await createPermit(payload)
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
        <Link to={isEdit ? `/permits/${id}` : '/permits'} className="text-slate-400 hover:text-slate-700">
          ← العودة
        </Link>
        <h1 className="text-2xl font-extrabold text-slate-900">
          {isEdit ? 'تعديل التصريح' : 'إضافة تصريح جديد'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-6">

        {/* ── Worker ─────────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide border-b pb-1">
            بيانات العامل
          </h2>
          <EntityCombobox
            label="اسم العامل"
            required
            options={workerOpts}
            selectedId={worker.id}
            inputText={worker.text}
            isNew={worker.isNew}
            onSelect={(id, text) => setWorker({ id, text, isNew: false })}
            onNew={(text) => setWorker({ id: '', text, isNew: true })}
            placeholder="ابحث باسم العامل أو أدخل اسماً جديداً..."
          />

          {worker.isNew && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-blue-50 rounded-lg p-3">
              <div>
                <label className="label">رقم الهوية / الإقامة</label>
                <input
                  value={newWorker.idNumber}
                  onChange={(e) => setNW('idNumber', e.target.value)}
                  className="input"
                  placeholder="مثال: 1234567890"
                />
              </div>
              <div>
                <label className="label">الجنسية</label>
                <input
                  value={newWorker.nationality}
                  onChange={(e) => setNW('nationality', e.target.value)}
                  className="input"
                  placeholder="مثال: سعودي"
                />
              </div>
              <div>
                <label className="label">الهاتف</label>
                <input
                  value={newWorker.phone}
                  onChange={(e) => setNW('phone', e.target.value)}
                  className="input"
                  placeholder="05xxxxxxxx"
                />
              </div>
            </div>
          )}
        </section>

        {/* ── Companies ──────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide border-b pb-1">
            بيانات الشركات
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Provider */}
            <div className="space-y-2">
              <EntityCombobox
                label="الشركة المزودة"
                required
                options={companyOpts}
                selectedId={provider.id}
                inputText={provider.text}
                isNew={provider.isNew}
                onSelect={(id, text) => setProvider({ id, text, isNew: false })}
                onNew={(text) => setProvider({ id: '', text, isNew: true })}
                placeholder="ابحث أو أدخل اسم الشركة..."
              />
              {provider.isNew && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <label className="label">رقم المنشأة</label>
                  <input
                    value={newProvider.companyNumber}
                    onChange={(e) => setNewProvider({ companyNumber: e.target.value })}
                    className="input"
                    placeholder="مثال: 2-4015519"
                  />
                </div>
              )}
            </div>

            {/* Beneficiary */}
            <div className="space-y-2">
              <EntityCombobox
                label="الشركة المستفيدة"
                options={companyOpts}
                selectedId={beneficiary.id}
                inputText={beneficiary.text}
                isNew={beneficiary.isNew}
                onSelect={(id, text) => setBeneficiary({ id, text, isNew: false })}
                onNew={(text) => setBeneficiary({ id: '', text, isNew: true })}
                placeholder="اختياري..."
              />
              {beneficiary.isNew && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <label className="label">رقم المنشأة</label>
                  <input
                    value={newBeneficiary.companyNumber}
                    onChange={(e) => setNewBeneficiary({ companyNumber: e.target.value })}
                    className="input"
                    placeholder="مثال: 6-1976381"
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Permit details ─────────────────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide border-b pb-1">
            بيانات التصريح
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">المهنة <span className="text-red-500">*</span></label>
              <input
                value={fields.occupation}
                onChange={(e) => set('occupation', e.target.value)}
                className="input"
                placeholder="مثال: فني كهرباء"
                required
              />
            </div>
            <div>
              <label className="label">الحالة</label>
              <select value={fields.status} onChange={(e) => set('status', e.target.value)} className="input">
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">موقع العمل</label>
              <input
                value={fields.workLocation}
                onChange={(e) => set('workLocation', e.target.value)}
                className="input"
                placeholder="المدينة، الحي"
              />
            </div>
            <div>
              <label className="label">تاريخ الإصدار</label>
              <input type="date" value={fields.issueDate} onChange={(e) => set('issueDate', e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">تاريخ البدء</label>
              <input type="date" value={fields.startDate} onChange={(e) => set('startDate', e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">تاريخ الانتهاء</label>
              <input type="date" value={fields.expiryDate} onChange={(e) => set('expiryDate', e.target.value)} className="input" />
            </div>
          </div>
          <div>
            <label className="label">الملاحظات / نبذة عن التعاقد</label>
            <textarea
              value={fields.notes}
              onChange={(e) => set('notes', e.target.value)}
              className="input h-24 resize-none"
              placeholder="ملاحظات إضافية..."
            />
          </div>
        </section>

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
