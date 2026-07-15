import client from './client'

export const getCompanies = (params?: Record<string, unknown>) =>
  client.get('/companies/', { params }).then((r) => r.data)

export const getCompany = (id: string) =>
  client.get(`/companies/${id}`).then((r) => r.data)

export const createCompany = (data: unknown) =>
  client.post('/companies/', data).then((r) => r.data)

export const updateCompany = (id: string, data: unknown) =>
  client.put(`/companies/${id}`, data).then((r) => r.data)

export const deleteCompany = (id: string) =>
  client.delete(`/companies/${id}`).then((r) => r.data)
