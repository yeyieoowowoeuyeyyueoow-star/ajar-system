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

export const downloadPermitPdf = async (id: string, permitNumber: string) => {
  const res = await client.get(`/permits/${id}/pdf`, { responseType: 'blob' })
  const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${permitNumber}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

export const getPermitQrUrl = (id: string) => `/api/permits/${id}/qr`
