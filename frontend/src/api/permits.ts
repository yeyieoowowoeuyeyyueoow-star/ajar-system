import client from './client'

export const getPermits = (params?: Record<string, unknown>) =>
  client.get('/permits/', { params }).then((r) => r.data)

export const getPermit = (id: string) =>
  client.get(`/permits/${id}`).then((r) => r.data)

export const createPermit = (data: unknown) =>
  client.post('/permits/', data).then((r) => r.data)

export const updatePermit = (id: string, data: unknown) =>
  client.put(`/permits/${id}`, data).then((r) => r.data)

export const deletePermit = (id: string) =>
  client.delete(`/permits/${id}`).then((r) => r.data)

export const getPermitPdfUrl = (id: string) => `/api/permits/${id}/pdf`
export const getPermitQrUrl = (id: string) => `/api/permits/${id}/qr`
