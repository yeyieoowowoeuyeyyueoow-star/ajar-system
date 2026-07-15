import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { login } from '../api/auth'
import toast from 'react-hot-toast'

export default function Login() {
  const navigate = useNavigate()
  const { setAuth } = useAuth()
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.username || !form.password) {
      toast.error('يرجى إدخال اسم المستخدم وكلمة المرور')
      return
    }
    setLoading(true)
    try {
      const data = await login(form.username, form.password)
      setAuth(data.token, data.user)
      toast.success(`مرحباً ${data.user.fullName}`)
      navigate('/')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'خطأ في تسجيل الدخول')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-800 via-navy-700 to-primary-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-500 text-white text-3xl font-bold shadow-lg mb-4">
            أ
          </div>
          <h1 className="text-3xl font-extrabold text-white">نظام أجير</h1>
          <p className="text-primary-200 mt-1">إدارة تصاريح العمل</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-6">تسجيل الدخول</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">اسم المستخدم</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="admin"
                className="input"
                autoComplete="username"
                disabled={loading}
              />
            </div>
            <div>
              <label className="label">كلمة المرور</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="input"
                autoComplete="current-password"
                disabled={loading}
              />
            </div>
            <button type="submit" className="btn-primary w-full justify-center py-3 text-base mt-2" disabled={loading}>
              {loading ? 'جاري الدخول...' : 'دخول'}
            </button>
          </form>

          <div className="mt-6 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-xs text-slate-500 font-semibold mb-2">بيانات تجريبية:</p>
            <div className="space-y-1">
              {[
                { role: 'مدير النظام', u: 'admin', p: 'admin123' },
                { role: 'مشرف', u: 'manager1', p: 'manager123' },
                { role: 'مشغل', u: 'operator1', p: 'operator123' },
              ].map((x) => (
                <button
                  key={x.u}
                  onClick={() => setForm({ username: x.u, password: x.p })}
                  className="w-full text-right text-xs text-slate-600 hover:text-primary-600 transition-colors py-0.5"
                >
                  {x.role}: <span className="font-mono font-bold">{x.u}</span> / <span className="font-mono">{x.p}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
