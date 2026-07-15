import client from './client'

export const getUsers = (params?: Record<string, unknown>) =>
  client.get('/users/', { params }).then((r) => r.data)

export const getUser = (id: string) =>
  client.get(`/users/${id}`).then((r) => r.data)

export const createUser = (data: unknown) =>
  client.post('/users/', data).then((r) => r.data)

export const updateUser = (id: string, data: unknown) =>
  client.put(`/users/${id}`, data).then((r) => r.data)

export const deleteUser = (id: string) =>
  client.delete(`/users/${id}`).then((r) => r.data)
