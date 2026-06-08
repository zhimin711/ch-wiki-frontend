import { defineStore } from 'pinia'

interface AuthState {
  token: string | null
  username: string | null
  nickname: string | null
  avatar: string | null
}

const AUTH_STORAGE_KEYS = ['auth_token', 'auth_username', 'auth_nickname', 'auth_avatar']
const INVALID_STORAGE_VALUES = new Set(['', 'null', 'undefined'])

function readStoredValue(key: string): string | null {
  const value = localStorage.getItem(key)
  if (!value || INVALID_STORAGE_VALUES.has(value)) return null
  return value
}

function clearStoredAuth() {
  for (const key of AUTH_STORAGE_KEYS) {
    localStorage.removeItem(key)
  }
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: null,
    username: null,
    nickname: null,
    avatar: null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
  },

  actions: {
    setAuth(data: { accessToken: string; username: string; nickname: string; avatar?: string }) {
      this.token = data.accessToken
      this.username = data.username
      this.nickname = data.nickname || data.username
      this.avatar = data.avatar || null
      if (import.meta.client) {
        localStorage.setItem('auth_token', data.accessToken)
        localStorage.setItem('auth_username', data.username)
        localStorage.setItem('auth_nickname', data.nickname || data.username)
        if (data.avatar) localStorage.setItem('auth_avatar', data.avatar)
        else localStorage.removeItem('auth_avatar')
      }
    },

    setAvatar(avatar: string | null) {
      this.avatar = avatar
      if (import.meta.client) {
        if (avatar) localStorage.setItem('auth_avatar', avatar)
        else localStorage.removeItem('auth_avatar')
      }
    },

    logout() {
      this.token = null
      this.username = null
      this.nickname = null
      this.avatar = null
      if (import.meta.client) {
        clearStoredAuth()
      }
    },

    restore() {
      if (!import.meta.client) return false

      const token = readStoredValue('auth_token')
      const username = readStoredValue('auth_username')
      if (!token || !username) {
        this.logout()
        return false
      }

      this.token = token
      this.username = username
      this.nickname = readStoredValue('auth_nickname') || username
      this.avatar = readStoredValue('auth_avatar')
      return true
    },
  },
})
