import { useAuthStore } from '~/stores/auth'

/** 获取认证 token（供 api-client 拦截器使用） */
export function useAuthToken() {
  const store = useAuthStore()
  return computed(() => store.token)
}

/** 认证相关组合式函数 */
export function useAuth() {
  const store = useAuthStore()
  const router = useRouter()

  return {
    isAuthenticated: computed(() => store.isAuthenticated),
    username: computed(() => store.username),
    nickname: computed(() => store.nickname),
    avatar: computed(() => store.avatar),
    token: computed(() => store.token),

    /** 设置认证信息 */
    setAuth(data: { accessToken: string; username: string; nickname: string; avatar?: string }) {
      store.setAuth(data)
    },

    /** 更新头像 */
    setAvatar(avatar: string | null) {
      store.setAvatar(avatar)
    },

    /** 登出 */
    logout(redirectTo: string | null = '/login') {
      store.logout()
      if (redirectTo) {
        router.push(normalizeAuthRedirect(redirectTo, '/login'))
      }
    },

    /** 从 localStorage 恢复认证状态 */
    restore() {
      return store.restore()
    },

    /**
     * 需要登录时跳转
     * 注意：避免在 middleware 内调用 useRoute()，调用方请传入当前路径
     */
    requireAuth(currentPath: string = '/') {
      if (!store.isAuthenticated) {
        router.push(buildLoginRedirectPath(currentPath))
        return false
      }
      return true
    },
  }
}
