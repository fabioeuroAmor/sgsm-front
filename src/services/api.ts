import axios from 'axios'

const api = axios.create({
  baseURL: '/v1/api',
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.erro ?? err.message ?? 'Erro desconhecido'
    return Promise.reject(new Error(message))
  },
)

export default api
