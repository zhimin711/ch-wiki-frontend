import { usePublicApi } from '~/services/public-api'

/** 公开 API 组合式函数（SSR 安全） */
export function useApi() {
  return usePublicApi()
}

export function useSafeBackendUrl(url: string | null | undefined) {
  return computed(() => normalizeBackendUrl(url))
}
