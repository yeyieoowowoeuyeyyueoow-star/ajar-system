import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { logout } from '../api/auth'
import toast from 'react-hot-toast'
import {
  IconDashboard, IconPermits, IconWorkers, IconCompanies,
  IconLogs, IconUsers, IconSearch, IconLogout, IconMenu,
  IconChevronLeft, IconChevronRight, IconBell,
} from './Icons'

const navItems = [
  { to: '/',         label: 'لوحة التحكم', Icon: IconDashboard,  exact: true },
  { to: '/permits',  label: 'التصاريح',    Icon: IconPermits },
  { to: '/workers',  label: 'العمال',      Icon: IconWorkers },
  { to: '/companies',label: 'الشركات',     Icon: IconCompanies },
  { to: '/logs',     label: 'سجل النشاط',  Icon: IconLogs },
]
const adminNavItems = [
  { to: '/users', label: 'المستخدمين', Icon: IconUsers },
]

interface NavItemProps {
  to: string; label: string; Icon: React.FC<{className?: string}>
  exact?: boolean; collapsed: boolean; onClick?: () => void
}

function NavItem({ to, label, Icon, exact, collapsed, onClick }: NavItemProps) {
  const { pathname } = useLocation()
  const active = exact ? pathname === to : pathname.startsWith(to)
  return (
    <Link
      to={to}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`
        relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold
        transition-all duration-150 group
        ${active
          ? 'bg-white/15 text-white shadow-inner'
          : 'text-slate-400 hover:bg-white/8 hover:text-slate-200'
        }
      `}
    >
      {active && (
        <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-400 rounded-l-full" />
      )}
      <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${active ? 'text-primary-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  )
}

export default function Layout({ children }: { children: React.ReactNode }) {
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
      <div className={`flex items-center gap-3 px-4 py-5 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-extrabold text-lg flex-shrink-0 shadow-lg shadow-primary-900/40">
          أ
        </div>
        {!collapsed && (
          <div>
            <div className="font-extrabold text-white text-base leading-tight tracking-tight">نظام أجير</div>
            <div className="text-xs text-slate-500 leading-tight mt-0.5">إدارة التصاريح</div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-white/6 mb-2" />

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {allNav.map((item) => (
          <NavItem key={item.to} {...item} collapsed={collapsed} onClick={() => setMobileOpen(false)} />
        ))}
      </nav>

      {/* Divider */}
      <div className="mx-4 h-px bg-white/6 mt-2" />

      {/* User info */}
      <div className={`p-3 ${collapsed ? 'flex justify-center' : ''}`}>
        {collapsed ? (
          <button
            onClick={handleLogout}
            title="تسجيل الخروج"
            className="w-9 h-9 rounded-xl hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <IconLogout />
          </button>
        ) : (
          <div className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/8 transition-colors group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500/30 to-primary-700/30 border border-primary-500/20 flex items-center justify-center text-primary-300 text-sm font-bold flex-shrink-0">
              {user?.fullName?.[0] ?? '؟'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-200 truncate leading-tight">{user?.fullName}</p>
              <p className="text-xs text-slate-500 truncate mt-0.5">{user?.username}</p>
            </div>
            <button
              onClick={handleLogout}
              title="تسجيل الخروج"
              className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
            >
              <IconLogout className="w-4 h-4" />
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
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar – desktop */}
      <aside className={`hidden lg:flex flex-col flex-shrink-0 transition-all duration-200 relative
        bg-gradient-to-b from-slate-900 to-[#0d1525]
        ${collapsed ? 'w-[68px]' : 'w-60'}`}
      >
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`absolute -left-3 top-6 z-10 w-6 h-6 rounded-full bg-white border border-slate-200
            shadow-md flex items-center justify-center text-slate-500 hover:text-slate-800
            hover:shadow-lg transition-all duration-150`}
        >
          {collapsed
            ? <IconChevronLeft className="w-3.5 h-3.5" />
            : <IconChevronRight className="w-3.5 h-3.5" />
          }
        </button>
        {sidebarContent}
      </aside>

      {/* Sidebar – mobile */}
      <aside className={`fixed top-0 right-0 z-50 h-full w-64 flex flex-col transform transition-transform duration-200 lg:hidden
        bg-gradient-to-b from-slate-900 to-[#0d1525]
        ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {sidebarContent}
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-100 px-5 py-3 flex items-center gap-3 flex-shrink-0 shadow-sm shadow-slate-100">
          <button
            className="lg:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <IconMenu />
          </button>

          <div className="flex-1">
            <SearchBar />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <button className="relative w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
              <IconBell />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
            </button>
            <div className="hidden sm:flex items-center gap-2 pl-3 border-r border-slate-100 mr-1">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold">
                {user?.fullName?.[0] ?? '؟'}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-semibold text-slate-800 leading-tight">{user?.fullName}</p>
                <p className="text-xs text-slate-400 leading-tight">{user?.username}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto p-5 lg:p-7">
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
    if (q.trim()) { navigate(`/search?q=${encodeURIComponent(q.trim())}`); setQ('') }
  }

  return (
    <form onSubmit={handleSearch} className="relative max-w-sm">
      <IconSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="بحث في التصاريح، العمال، الشركات..."
        className="w-full pr-9 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm
          focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400
          focus:bg-white transition-all duration-150 placeholder:text-slate-400"
      />
    </form>
  )
}
