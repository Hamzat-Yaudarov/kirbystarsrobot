import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Автоматически добавляем токен к запросам
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Обработка ошибок авторизации
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.reload()
    }
    return Promise.reject(error)
  }
)

// API для статистики
export const statsApi = {
  getStats: () => api.get('/stats'),
}

// API для пользователей
export const usersApi = {
  getUsers: (params?: any) => api.get('/users', { params }),
  getUser: (id: string) => api.get(`/users/${id}`),
  banUser: (id: string) => api.post(`/users/${id}/ban`),
  unbanUser: (id: string) => api.post(`/users/${id}/unban`),
  deleteUser: (id: string) => api.delete(`/users/${id}`),
  updateBalance: (id: string, сумма: number, операция: string) => 
    api.post(`/users/${id}/balance`, { сумма, операция }),
}

// API для промокодов
export const promocodesApi = {
  getPromocodes: () => api.get('/promocodes'),
  getPromocode: (id: string) => api.get(`/promocodes/${id}`),
  createPromocode: (data: any) => api.post('/promocodes', data),
  updatePromocode: (id: string, data: any) => api.put(`/promocodes/${id}`, data),
  deletePromocode: (id: string) => api.delete(`/promocodes/${id}`),
  togglePromocode: (id: string) => api.post(`/promocodes/${id}/toggle`),
}

// API для заданий
export const tasksApi = {
  getTasks: () => api.get('/tasks'),
  getTask: (id: string) => api.get(`/tasks/${id}`),
  createTask: (data: any) => api.post('/tasks', data),
  updateTask: (id: string, data: any) => api.put(`/tasks/${id}`, data),
  deleteTask: (id: string) => api.delete(`/tasks/${id}`),
  toggleTask: (id: string) => api.post(`/tasks/${id}/toggle`),
}

// API для лотерей
export const lotteriesApi = {
  getLotteries: () => api.get('/lotteries'),
  getLottery: (id: string) => api.get(`/lotteries/${id}`),
  createLottery: (data: any) => api.post('/lotteries', data),
  finishLottery: (id: string, победительId?: string) => 
    api.post(`/lotteries/${id}/finish`, { победительId }),
  deleteLottery: (id: string) => api.delete(`/lotteries/${id}`),
  toggleLottery: (id: string) => api.post(`/lotteries/${id}/toggle`),
}

// API для каналов
export const channelsApi = {
  getChannels: () => api.get('/channels'),
  getChannel: (id: string) => api.get(`/channels/${id}`),
  createChannel: (data: any) => api.post('/channels', data),
  updateChannel: (id: string, data: any) => api.put(`/channels/${id}`, data),
  deleteChannel: (id: string) => api.delete(`/channels/${id}`),
  toggleChannel: (id: string) => api.post(`/channels/${id}/toggle`),
}

// API для питомцев
export const petsApi = {
  getPets: () => api.get('/pets'),
  getPet: (id: string) => api.get(`/pets/${id}`),
  createPet: (data: any) => api.post('/pets', data),
  updatePet: (id: string, data: any) => api.put(`/pets/${id}`, data),
  deletePet: (id: string) => api.delete(`/pets/${id}`),
  togglePet: (id: string) => api.post(`/pets/${id}/toggle`),
}

// API для рассылок
export const broadcastsApi = {
  getBroadcasts: () => api.get('/broadcasts'),
  getBroadcast: (id: string) => api.get(`/broadcasts/${id}`),
  createBroadcast: (data: any) => api.post('/broadcasts', data),
  updateBroadcast: (id: string, data: any) => api.put(`/broadcasts/${id}`, data),
  sendBroadcast: (id: string) => api.post(`/broadcasts/${id}/send`),
  deleteBroadcast: (id: string) => api.delete(`/broadcasts/${id}`),
}
