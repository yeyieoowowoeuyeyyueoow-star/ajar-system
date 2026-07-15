import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { getStats, getPermitsByStatus, getExpiringSoon, getActivity } from '../api/dashboard'
import { DashboardStats, Permit, Log } from '../types'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import { formatDate, formatDateTime, daysUntil } from '../utils/format'

const STATUS_COLORS: Record<string, string> = {
  active: '#10b981',
  pending: '#f59e0b',
  expired: '#ef4444',
  rejected: '#94a3b8',
}

const STATUS_NAMES: Record<string, string> = {
  active: 'ساري',
  pending: 'قيد الانتظار',
  expired: 'منتهي',
  rejected: 'مرفوض',
}

function StatCard({ label, value, icon, color, link }: { label: string; value: number; icon: string; color: string; link?: string }) {
  const content = (
    <div className={`card p-5 hover:shadow-md transition-shadow ${link ? 'cursor-pointer' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{label}</p>
          <p className={`text-3xl font-extrabold mt-1 ${color}`}>{value.toLocaleString('ar-SA')}</p>
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${color.replace('text-', 'bg-').replace('600', '100')}`}>
          {icon}
        </div>
      </div>
    </div>
  )
  return link ? <Link to={link}>{content}</Link> : content
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [byStatus, setByStatus] = useState<{ status: string; count: number }[]>([])
  const [expiring, setExpiring] = useState<Permit[]>([])
  const [activity, setActivity] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getStats(), getPermitsByStatus(), getExpiringSoon(30), getActivity(8)])
      .then(([s, b, e, a]) => {
        setStats(s)
        setByStatus(b)
        setExpiring(e)
        setActivity(a)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />

  const pieData = byStatus.map((x) => ({
    name: STATUS_NAMES[x.status] ?? x.status,
    value: x.count,
    status: x.status,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">لوحة التحكم</h1>
        <p className="text-sm text-slate-500 mt-1">نظرة عامة على نظام إدارة التصاريح</p>
      </div>

      {/* Stat Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard label="إجمالي التصاريح" value={stats.totalPermits} icon="📋" color="text-slate-700" link="/permits" />
          <StatCard label="التصاريح السارية" value={stats.activePermits} icon="✅" color="text-emerald-600" link="/permits?status=active" />
          <StatCard label="قيد الانتظار" value={stats.pendingPermits} icon="⏳" color="text-amber-600" link="/permits?status=pending" />
          <StatCard label="تنتهي قريباً" value={stats.expiringPermits} icon="⚠️" color="text-orange-600" />
          <StatCard label="العمال" value={stats.totalWorkers} icon="👷" color="text-blue-600" link="/workers" />
          <StatCard label="الشركات" value={stats.totalCompanies} icon="🏢" color="text-violet-600" link="/companies" />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Pie chart */}
        <div className="card p-5">
          <h2 className="font-bold text-slate-800 mb-4">التصاريح حسب الحالة</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={3}>
                  {pieData.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [`${value} تصريح`, name]}
                  contentStyle={{ fontFamily: 'Cairo, sans-serif', fontSize: 13, borderRadius: 8 }}
                />
                <Legend
                  formatter={(value) => <span style={{ fontFamily: 'Cairo, sans-serif', fontSize: 12 }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-slate-400 text-sm">لا توجد بيانات</div>
          )}
        </div>

        {/* Activity */}
        <div className="card p-5">
          <h2 className="font-bold text-slate-800 mb-4">آخر النشاطات</h2>
          <div className="space-y-3">
            {activity.length === 0 && <p className="text-sm text-slate-400 text-center py-8">لا توجد نشاطات</p>}
            {activity.map((log) => (
              <div key={log.id} className="flex items-start gap-3 text-sm">
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold flex-shrink-0 text-xs">
                  {log.userName?.[0] ?? '؟'}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-slate-800">{log.userName}</span>
                  <span className="text-slate-500 mx-1">·</span>
                  <span className="text-slate-600">{log.action}</span>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{log.details}</p>
                </div>
                <span className="text-xs text-slate-400 flex-shrink-0">{formatDateTime(log.createdAt)}</span>
              </div>
            ))}
          </div>
          {activity.length > 0 && (
            <Link to="/logs" className="block text-center text-sm text-primary-600 hover:text-primary-700 font-semibold mt-4">
              عرض كل النشاطات ←
            </Link>
          )}
        </div>
      </div>

      {/* Expiring soon */}
      {expiring.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-800">تصاريح تنتهي قريباً</h2>
            <Link to="/permits?status=active" className="text-sm text-primary-600 hover:text-primary-700 font-semibold">
              عرض الكل ←
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {expiring.map((p) => {
              const days = daysUntil(p.expiryDate)
              return (
                <Link
                  to={`/permits/${p.id}`}
                  key={p.id}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{p.workerName}</p>
                    <p className="text-xs text-slate-500 truncate">{p.permitNumber} · {p.occupation}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-slate-700">{formatDate(p.expiryDate)}</p>
                    <p className={`text-xs font-bold ${days <= 7 ? 'text-red-500' : days <= 14 ? 'text-orange-500' : 'text-amber-500'}`}>
                      {days <= 0 ? 'انتهى' : `${days} يوم`}
                    </p>
                  </div>
                  <StatusBadge status={p.status} size="sm" />
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
