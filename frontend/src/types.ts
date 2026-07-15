export interface User {
  id: string
  fullName: string
  username: string
  email: string
  role: 'admin' | 'manager' | 'operator'
  status: 'active' | 'suspended'
  createdAt: string
  updatedAt: string
}

export interface Company {
  id: string
  name: string
  companyNumber: string
  email: string
  phone: string
  status: 'active' | 'suspended'
  city: string
  address: string
  createdAt: string
  updatedAt: string
}

export interface Worker {
  id: string
  fullName: string
  idNumber: string
  nationality: string
  occupation: string
  phone: string
  email: string
  passportNumber: string
  birthDate: string
  photoUrl: string
  companyId: string
  status: 'active' | 'suspended'
  createdAt: string
  updatedAt: string
}

export interface Permit {
  id: string
  permitNumber: string
  workerId: string
  companyId: string
  beneficiaryCompanyId: string
  occupation: string
  notes: string
  workLocation: string
  status: 'active' | 'pending' | 'expired' | 'rejected'
  startDate: string
  expiryDate: string
  issueDate: string
  createdAt: string
  updatedAt: string
  // Enriched
  workerName?: string
  companyName?: string
  worker?: Worker
  providerCompany?: Company
  beneficiaryCompany?: Company
  contractDescription?: string
}

export interface Log {
  id: string
  action: string
  userId: string
  userName?: string
  entityType: string
  entityId: string | null
  details: string
  createdAt: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface DashboardStats {
  totalPermits: number
  activePermits: number
  totalWorkers: number
  totalCompanies: number
  expiringPermits: number
  pendingPermits: number
}
