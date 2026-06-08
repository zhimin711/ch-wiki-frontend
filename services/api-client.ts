import axios from 'axios'
import type { AxiosInstance } from 'axios'
import { buildLoginRedirectPath } from '~/composables/useAuthRedirect'
import { useAuthStore } from '~/stores/auth'

export interface ApiResult<T = any> {
  code: string | number
  message: string | null
  data?: T
  extra: any
  timestamp: number
  success: boolean
}

/** 从 ApiResult 中提取实际数据 */
export function extractData<T>(result: ApiResult<T>): T | null {
  if (result.data !== undefined) return result.data
  return null
}

export interface PageData<T = any> {
  rows: T[]
  total: number
}

export interface PageResult<T = any> {
  code: string | number
  message: string | null
  data?: PageData<T>
  extra: any
  timestamp: number
  success: boolean
}

/** 从分页结果中提取列表数据 */
export function extractPageData<T>(result: PageResult<T>): { list: T[]; total: number } {
  if (result.data) {
    return { list: result.data.rows, total: result.data.total }
  }
  return { list: [], total: 0 }
}

let _apiClient: AxiosInstance | null = null

/** 获取 API 客户端（懒初始化，仅在 Nuxt 上下文中调用） */
export function useApiClient(): AxiosInstance {
  if (_apiClient) return _apiClient

  const config = useRuntimeConfig()

  // SSR 用完整 URL，客户端用相对路径走 routeRules 代理
  const baseURL = import.meta.server ? config.public.apiBaseUrl : ''

  _apiClient = axios.create({
    baseURL,
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // 请求拦截器：添加 Authorization header
  _apiClient.interceptors.request.use((reqConfig) => {
    const token = useAuthToken()
    if (token.value) {
      reqConfig.headers.Authorization = `Bearer ${token.value}`
    }
    return reqConfig
  })

  // 响应拦截器：统一处理错误
  _apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      const requestUrl = String(error.config?.url || '')
      const handlesOwnAuthError = requestUrl === '/api/session/login'
        || requestUrl === '/api/auth/code/token'

      if (error.response?.status === 401 && !handlesOwnAuthError) {
        const authStore = useAuthStore()
        const route = useRoute()
        authStore.logout()
        navigateTo(buildLoginRedirectPath(route.fullPath))
      }
      return Promise.reject(error)
    },
  )

  return _apiClient
}
