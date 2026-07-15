import client from './client'

export const getWorkers = (params?: Record<string, unknown>) =>
  client.get('/workers/', { params }).then((r) => r.data)

export const getWorker = (id: string) =>
  client.get(`/workers/${id}`).then((r) => r.data)

export const createWorker = (data: unknown) =>
  client.post('/workers/', data).then((r) => r.data)

export const updateWorker = (id: string, data: unknown) =>
  client.put(`/workers/${id}`, data).then((r) => r.data)

export const deleteWorker = (id: string) =>
  client.delete(`/workers/${id}`).then((r) => r.data)
