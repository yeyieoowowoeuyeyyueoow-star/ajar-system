import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getPermit, deletePermit, getPermitPdfUrl, getPermitQrUrl } from '../../api/permits'
import { Permit } from '../../types'
import StatusBadge from '../../components/StatusBadge'
import ConfirmDialog from '../../components/ConfirmDialog'
import LoadingSpinner from '../../components/LoadingSpinner'
import { formatDate } from '../../utils/format'
import toast from 'react-hot-toast'

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500 font-medium w-36 flex-shrink-0">{label}</span>
      <span className="text-sm text-slate-800 font-semibold flex-1">{value ?? '—'}</span>
    </div>
  )
}

export default function PermitDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [permit, setPermit] = useState<Permit | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    if (!id) return
    getPermit(id).then(setPermit).finally(() => setLoading(false))
  }, [id])

  const handleDelete = async () => {
    if (!id) return
    setDeleteLoading(true)
    try {
      await deletePermit(id)
      toast.success('تم حذف التصريح')
      navigate('/permits')
    } catch {
      toast.error('حدث خطأ')
      setDeleteLoading(false)
    }
  }

  if (loading) return <LoadingSpinner />
  if (!permit) return <div className="card p-8 text-center text-slate-500">التصريح غير موجود</div>

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/permits" className="text-slate-400 hover:text-slate-700 transition-colors">← العودة</Link>
        <h1 className="text-2xl font-extrabold text-slate-900 flex-1">
          تصريح رقم: <span className="text-primary-700 font-mono">{permit.permitNumber}</span>
        </h1>
        <StatusBadge status={permit.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-5">
            <h2 className="font-bold text-slate-800 mb-3 pb-2 border-b border-slate-100">معلومات التصريح</h2>
            <DetailRow label="رقم التصريح" value={permit.permitNumber} />
            <DetailRow label="المهنة" value={permit.occupation} />
            <DetailRow label="موقع العمل" value={permit.workLocation} />
            <DetailRow label="الملاحظات" value={permit.notes} />
            <DetailRow label="تاريخ الإصدار" value={formatDate(permit.issueDate)} />
            <DetailRow label="تاريخ البدء" value={formatDate(permit.startDate)} />
            <DetailRow label="تاريخ الانتهاء" value={formatDate(permit.expiryDate)} />
          </div>

          <div className="card p-5">
            <h2 className="font-bold text-slate-800 mb-3 pb-2 border-b border-slate-100">معلومات العامل</h2>
            {permit.worker ? (
              <>
                <DetailRow label="الاسم الكامل" value={permit.worker.fullName} />
                <DetailRow label="رقم الهوية" value={permit.worker.idNumber} />
                <DetailRow label="الجنسية" value={permit.worker.nationality} />
                <DetailRow label="الجوال" value={permit.worker.phone} />
                <DetailRow label="البريد الإلكتروني" value={permit.worker.email} />
              </>
            ) : <p className="text-slate-500 text-sm">لا توجد بيانات</p>}
          </div>

          <div className="card p-5">
            <h2 className="font-bold text-slate-800 mb-3 pb-2 border-b border-slate-100">معلومات الشركات</h2>
            <DetailRow label="الشركة المزودة" value={permit.providerCompany?.name} />
            <DetailRow label="رقم السجل (مزودة)" value={permit.providerCompany?.companyNumber} />
            <DetailRow label="الشركة المستفيدة" value={permit.beneficiaryCompany?.name} />
            <DetailRow label="رقم السجل (مستفيدة)" value={permit.beneficiaryCompany?.companyNumber} />
          </div>
        </div>

        {/* Actions + QR */}
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="font-bold text-slate-800 mb-3">الإجراءات</h2>
            <div className="space-y-2">
              <a
                href={getPermitPdfUrl(permit.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary w-full justify-center"
              >
                📥 تحميل PDF
              </a>
              <Link to={`/permits/${permit.id}/edit`} className="btn-secondary w-full justify-center">
                ✏️ تعديل
              </Link>
              <button onClick={() => setConfirmDelete(true)} className="btn-danger w-full justify-center">
                🗑️ حذف
              </button>
            </div>
          </div>

          <div className="card p-5 text-center">
            <h2 className="font-bold text-slate-800 mb-3">رمز QR</h2>
            <img
              src={getPermitQrUrl(permit.id)}
              alt="QR Code"
              className="mx-auto w-40 h-40 rounded-lg border border-slate-200"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            <p className="text-xs text-slate-400 mt-2">امسح الرمز للتحقق من التصريح</p>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="حذف التصريح"
        message="هل أنت متأكد من حذف هذا التصريح؟ لا يمكن التراجع."
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
        loading={deleteLoading}
      />
    </div>
  )
}
