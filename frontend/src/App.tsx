import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import { PageLoader } from './components/LoadingSpinner'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import PermitsList from './pages/permits/PermitsList'
import PermitForm from './pages/permits/PermitForm'
import PermitDetail from './pages/permits/PermitDetail'
import WorkersList from './pages/workers/WorkersList'
import WorkerForm from './pages/workers/WorkerForm'
import CompaniesList from './pages/companies/CompaniesList'
import CompanyForm from './pages/companies/CompanyForm'
import UsersList from './pages/users/UsersList'
import UserForm from './pages/users/UserForm'
import Logs from './pages/Logs'
import Search from './pages/Search'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!isAdmin) return <Navigate to="/" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/permits" element={<PermitsList />} />
                <Route path="/permits/new" element={<PermitForm />} />
                <Route path="/permits/:id" element={<PermitDetail />} />
                <Route path="/permits/:id/edit" element={<PermitForm />} />
                <Route path="/workers" element={<WorkersList />} />
                <Route path="/workers/new" element={<WorkerForm />} />
                <Route path="/workers/:id/edit" element={<WorkerForm />} />
                <Route path="/companies" element={<CompaniesList />} />
                <Route path="/companies/new" element={<CompanyForm />} />
                <Route path="/companies/:id/edit" element={<CompanyForm />} />
                <Route
                  path="/users"
                  element={<RequireAdmin><UsersList /></RequireAdmin>}
                />
                <Route
                  path="/users/new"
                  element={<RequireAdmin><UserForm /></RequireAdmin>}
                />
                <Route
                  path="/users/:id/edit"
                  element={<RequireAdmin><UserForm /></RequireAdmin>}
                />
                <Route path="/logs" element={<Logs />} />
                <Route path="/search" element={<Search />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </RequireAuth>
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
