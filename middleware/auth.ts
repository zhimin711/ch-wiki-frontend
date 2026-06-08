/**
 * 认证中间件：未登录用户跳转到登录页
 */
export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return

  const auth = useAuth()
  auth.restore()

  if (!auth.isAuthenticated.value) {
    return navigateTo(buildLoginRedirectPath(to.fullPath))
  }
})
