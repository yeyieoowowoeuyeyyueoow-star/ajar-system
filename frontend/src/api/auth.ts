import client from './client'

export const login = (username: string, password: string) =>
  client.post('/auth/login', { username, password }).then((r) => r.data)

export const logout = () => client.post('/auth/logout').then((r) => r.data)

export const me = () => client.get('/auth/me').then((r) => r.data)
