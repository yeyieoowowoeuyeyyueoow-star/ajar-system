import client from './client'

export const getLogs = (params?: Record<string, unknown>) =>
  client.get('/logs/', { params }).then((r) => r.data)
