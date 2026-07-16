import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { login } from '../api/auth'
import toast from 'react-hot-toast'

const DEMO = [
  { role: 'مدير النظام', u: 'admin',     p: 'admin123' },
  { role: 'مشرف',        u: 'manager1',  p: 'manager123' },
  { role: 'مشغّل',       u: 'operator1', p: 'operator123' },
]

export default function Login() {
  const navigate = useNavigate()
  const { setAuth } = useAuth()
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.username || !form.password) { toast.error('يرجى إدخال بيانات الدخول'); return }
    setLoading(true)
    try {
      const data = await login(form.username, form.password)
      setAuth(data.token, data.user)
      toast.success(`مرحباً ${data.user.fullName} 👋`)
      navigate('/')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'بيانات الدخول غير صحيحة')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — decorative */}
      <div className="hidden lg:flex flex-col justify-between w-5/12 bg-gradient-to-br from-slate-900 via-[#0d1a2e] to-primary-900 p-12 relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-primary-400/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-extrabold text-2xl shadow-xl shadow-primary-900/50 mb-6">
            أ
          </div>
          <h1 className="text-3xl font-extrabold text-white leading-tight">نظام أجير</h1>
          <p className="text-primary-300 mt-2 text-base">منصة إدارة تصاريح العمل</p>
        </div>

        {/* Feature bullets */}
        <div className="relative z-10 space-y-5">
          {[
            { title: 'إدارة التصاريح',  desc: 'إنشاء وتتبع تصاريح العمل بسهولة' },
            { title: 'متابعة العمال',   desc: 'سجل شامل لبيانات العمال والجنسيات' },
            { title: 'تقارير PDF',      desc: 'تصدير تصاريح رسمية جاهزة للطباعة' },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-500/20 border border-primary-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{f.title}</p>
                <p className="text-slate-400 text-xs mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="relative z-10 text-slate-600 text-xs">© 2026 نظام أجير · جميع الحقوق محفوظة</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-extrabold text-xl shadow-lg">
              أ
            </div>
            <div>
              <p className="font-extrabold text-xl text-slate-900">نظام أجير</p>
              <p className="text-xs text-slate-500">إدارة تصاريح العمل</p>
            </div>
          </div>

          <div className="card p-8 shadow-xl shadow-slate-200/80">
            <div className="mb-7">
              <h2 className="text-2xl font-extrabold text-slate-900">تسجيل الدخول</h2>
              <p className="text-slate-500 text-sm mt-1">أدخل بيانات حسابك للمتابعة</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">اسم المستخدم</label>
                <div className="relative">
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="admin"
                    className="input pr-9"
                    autoComplete="username"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="label">كلمة المرور</label>
                <div className="relative">
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    className="input pr-9"
                    autoComplete="current-password"
                    disabled={loading}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary w-full justify-center py-3 text-base mt-2"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    جارٍ الدخول...
                  </span>
                ) : 'دخول'}
              </button>
            </form>

            {/* Demo credentials */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">بيانات تجريبية</p>
              <div className="grid grid-cols-3 gap-2">
                {DEMO.map((x) => (
                  <button
                    key={x.u}
                    onClick={() => setForm({ username: x.u, password: x.p })}
                    className="flex flex-col items-center p-2.5 rounded-xl border border-slate-200 hover:border-primary-300 hover:bg-primary-50 transition-all duration-150 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-primary-100 flex items-center justify-center text-slate-500 group-hover:text-primary-600 font-bold text-xs mb-1.5 transition-colors">
                      {x.role[0]}
                    </div>
                    <p className="text-xs font-semibold text-slate-700">{x.role}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{x.u}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
