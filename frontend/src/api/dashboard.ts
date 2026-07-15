import client from './client'

export const getStats = () => client.get('/dashboard/stats').then((r) => r.data)
export const getPermitsByStatus = () => client.get('/dashboard/permits-by-status').then((r) => r.data)
export const getExpiringSoon = (days = 30) =>
  client.get('/dashboard/expiring-soon', { params: { days, limit: 8 } }).then((r) => r.data)
export const getActivity = (limit = 10) =>
  client.get('/dashboard/activity', { params: { limit } }).then((r) => r.data)
