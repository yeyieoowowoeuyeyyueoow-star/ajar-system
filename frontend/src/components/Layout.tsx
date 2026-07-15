import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { logout } from '../api/auth'
import toast from 'react-hot-toast'

const navItems = [
  { to: '/', label: 'لوحة التحكم', icon: '⊞', exact: true },
  { to: '/permits', label: 'التصاريح', icon: '📋' },
  { to: '/workers', label: 'العمال', icon: '👷' },
  { to: '/companies', label: 'الشركات', icon: '🏢' },
  { to: '/logs', label: 'سجل النشاط', icon: '📄' },
]

const adminNavItems = [
  { to: '/users', label: 'المستخدمين', icon: '👥' },
]

interface NavItemProps {
  to: string
  label: string
  icon: string
  exact?: boolean
  collapsed: boolean
  onClick?: () => void
}

function NavItem({ to, label, icon, exact, collapsed, onClick }: NavItemProps) {
  const location = useLocation()
  const active = exact ? location.pathname === to : location.pathname.startsWith(to)
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150
        ${active
          ? 'bg-primary-600 text-white shadow-sm shadow-primary-900/20'
          : 'text-slate-300 hover:bg-white/10 hover:text-white'
        }`}
    >
      <span className="text-lg flex-shrink-0">{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  )
}

interface Props { children: React.ReactNode }

export default function Layout({ children }: Props) {
  const { user, clearAuth, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    try { await logout() } catch {}
    clearAuth()
    navigate('/login')
    toast.success('تم تسجيل الخروج')
  }

  const allNav = [...navItems, ...(isAdmin ? adminNavItems : [])]

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/10 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
          أ
        </div>
        {!collapsed && (
          <div>
            <div className="font-bold text-white text-base leading-tight">نظام أجير</div>
            <div className="text-xs text-slate-400 leading-tight">إدارة التصاريح</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {allNav.map((item) => (
          <NavItem key={item.to} {...item} collapsed={collapsed} onClick={() => setMobileOpen(false)} />
        ))}
      </nav>

      {/* User info */}
      <div className={`border-t border-white/10 p-3 ${collapsed ? 'flex justify-center' : ''}`}>
        {collapsed ? (
          <button
            onClick={handleLogout}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 transition-colors"
            title="تسجيل الخروج"
          >
            ↩
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {user?.fullName?.[0] ?? '؟'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.fullName}</p>
              <p className="text-xs text-slate-400 truncate">{user?.username}</p>
            </div>
            <button
              onClick={handleLogout}
              title="تسجيل الخروج"
              className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors text-lg"
            >
              ↩
            </button>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar – desktop */}
      <aside
        className={`hidden lg:flex flex-col bg-navy-800 flex-shrink-0 transition-all duration-200 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-5 -left-3 z-10 w-6 h-6 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors"
          style={{ marginRight: collapsed ? '52px' : '228px' }}
        >
          {collapsed ? '›' : '‹'}
        </button>
        {sidebarContent}
      </aside>

      {/* Sidebar – mobile */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-64 bg-navy-800 flex flex-col transform transition-transform duration-200 lg:hidden ${
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            ☰
          </button>
          <div className="flex-1">
            <SearchBar />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

function SearchBar() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (q.trim()) {
      navigate(`/search?q=${encodeURIComponent(q.trim())}`)
      setQ('')
    }
  }

  return (
    <form onSubmit={handleSearch} className="relative max-w-md">
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="بحث في التصاريح، العمال، الشركات..."
        className="w-full pr-9 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      />
    </form>
  )
}
