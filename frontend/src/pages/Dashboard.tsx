import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { getStats, getPermitsByStatus, getExpiringSoon, getActivity } from '../api/dashboard'
import { DashboardStats, Permit, Log } from '../types'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import { formatDate, formatDateTime, daysUntil } from '../utils/format'
import {
  IconPermits, IconWorkers, IconCompanies, IconCheck, IconClock, IconWarning, IconArrowLeft,
} from '../components/Icons'

const STATUS_COLORS: Record<string, string> = {
  active: '#10b981', pending: '#f59e0b', expired: '#ef4444', rejected: '#94a3b8',
}
const STATUS_NAMES: Record<string, string> = {
  active: 'ساري', pending: 'قيد الانتظار', expired: 'منتهي', rejected: 'مرفوض',
}

interface StatCardProps {
  label: string; value: number; Icon: React.FC<{ className?: string }>
  color: string; bg: string; border: string; link?: string; sub?: string
}

function StatCard({ label, value, Icon, color, bg, border, link, sub }: StatCardProps) {
  const content = (
    <div className={`card p-5 border-r-4 ${border} hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide truncate">{label}</p>
          <p className={`text-3xl font-extrabold mt-1 tabular-nums ${color}`}>
            {value.toLocaleString('ar-SA')}
          </p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-11 h-11 rounded-2xl ${bg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
    </div>
  )
  return link ? <Link to={link}>{content}</Link> : content
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-slate-100 rounded-xl shadow-lg px-4 py-2.5 text-sm font-semibold text-slate-700">
        {payload[0].name}: <span className="text-primary-600">{payload[0].value}</span>
      </div>
    )
  }
  return null
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [byStatus, setByStatus] = useState<{ status: string; count: number }[]>([])
  const [expiring, setExpiring] = useState<Permit[]>([])
  const [activity, setActivity] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getStats(), getPermitsByStatus(), getExpiringSoon(30), getActivity(8)])
      .then(([s, b, e, a]) => { setStats(s); setByStatus(b); setExpiring(e); setActivity(a) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />

  const pieData = byStatus.map((x) => ({ name: STATUS_NAMES[x.status] ?? x.status, value: x.count, status: x.status }))
  const total = pieData.reduce((s, x) => s + x.value, 0)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">لوحة التحكم</p>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">نظرة عامة</h1>
        </div>
        <Link to="/permits/new" className="btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          تصريح جديد
        </Link>
      </div>

      {/* Stat Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 stagger">
          <StatCard label="إجمالي التصاريح" value={stats.totalPermits}    Icon={IconPermits}   color="text-slate-700"   bg="bg-slate-100"  border="border-slate-300"   link="/permits" />
          <StatCard label="التصاريح السارية" value={stats.activePermits}  Icon={IconCheck}     color="text-emerald-600" bg="bg-emerald-50" border="border-emerald-400" link="/permits?status=active" />
          <StatCard label="قيد الانتظار"     value={stats.pendingPermits} Icon={IconClock}     color="text-amber-600"   bg="bg-amber-50"   border="border-amber-400"   link="/permits?status=pending" />
          <StatCard label="تنتهي قريباً"     value={stats.expiringPermits}Icon={IconWarning}   color="text-orange-600"  bg="bg-orange-50"  border="border-orange-400" />
          <StatCard label="العمال"           value={stats.totalWorkers}   Icon={IconWorkers}   color="text-blue-600"    bg="bg-blue-50"    border="border-blue-400"    link="/workers" />
          <StatCard label="الشركات"          value={stats.totalCompanies} Icon={IconCompanies} color="text-violet-600"  bg="bg-violet-50"  border="border-violet-400"  link="/companies" />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Pie chart */}
        <div className="card p-6 xl:col-span-2">
          <h2 className="font-bold text-slate-800 mb-1">التصاريح حسب الحالة</h2>
          <p className="text-xs text-slate-400 mb-4">توزيع {total} تصريح</p>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                    dataKey="value" paddingAngle={3} strokeWidth={0}>
                    {pieData.map((e) => (
                      <Cell key={e.status} fill={STATUS_COLORS[e.status] ?? '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {pieData.map((e) => (
                  <div key={e.status} className="flex items-center gap-2 text-xs text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[e.status] ?? '#94a3b8' }} />
                    <span className="truncate">{e.name}</span>
                    <span className="font-bold text-slate-800 mr-auto">{e.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">لا توجد بيانات</div>
          )}
        </div>

        {/* Activity */}
        <div className="card xl:col-span-3">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
            <div>
              <h2 className="font-bold text-slate-800">آخر النشاطات</h2>
              <p className="text-xs text-slate-400 mt-0.5">آخر {activity.length} عملية</p>
            </div>
            <Link to="/logs" className="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors">
              الكل <IconArrowLeft className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {activity.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-12">لا توجد نشاطات</p>
            )}
            {activity.map((log, i) => (
              <div key={log.id} className="flex items-start gap-3 px-6 py-3.5 hover:bg-slate-50/60 transition-colors animate-fade-in"
                style={{ animationDelay: `${i * 30}ms` }}>
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-100 to-primary-50 border border-primary-100 flex items-center justify-center text-primary-700 font-bold flex-shrink-0 text-xs">
                  {log.userName?.[0] ?? '؟'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-semibold text-sm text-slate-800">{log.userName}</span>
                    <span className="text-slate-400 text-xs">·</span>
                    <span className="text-slate-500 text-xs">{log.action}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{log.details}</p>
                </div>
                <span className="text-xs text-slate-400 flex-shrink-0 mt-0.5">{formatDateTime(log.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Expiring soon */}
      {expiring.length > 0 && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center">
                <IconWarning className="w-4 h-4 text-orange-500" />
              </div>
              <div>
                <h2 className="font-bold text-slate-800">تصاريح تنتهي قريباً</h2>
                <p className="text-xs text-slate-400 mt-0.5">خلال 30 يوماً</p>
              </div>
            </div>
            <Link to="/permits?status=active" className="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700">
              عرض الكل <IconArrowLeft className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {expiring.map((p) => {
              const days = daysUntil(p.expiryDate)
              const urgent = days <= 7
              const soon   = days <= 14
              const pct    = Math.max(0, Math.min(100, ((30 - days) / 30) * 100))
              return (
                <Link key={p.id} to={`/permits/${p.id}`}
                  className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50/60 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-slate-800 text-sm truncate">{p.workerName}</p>
                      <StatusBadge status={p.status} size="sm" />
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-slate-400 truncate">{p.permitNumber} · {p.occupation}</p>
                    </div>
                    {/* urgency bar */}
                    <div className="mt-1.5 h-1 bg-slate-100 rounded-full overflow-hidden w-32">
                      <div
                        className={`h-full rounded-full transition-all ${urgent ? 'bg-red-400' : soon ? 'bg-orange-400' : 'bg-amber-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-left flex-shrink-0">
                    <p className="text-sm font-semibold text-slate-700">{formatDate(p.expiryDate)}</p>
                    <p className={`text-xs font-bold text-left ${urgent ? 'text-red-500' : soon ? 'text-orange-500' : 'text-amber-500'}`}>
                      {days <= 0 ? 'انتهى' : `${days} يوم`}
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-slate-300 group-hover:text-slate-400 flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
