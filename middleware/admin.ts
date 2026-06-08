/**
 * 管理员中间件：非管理员跳转到首页
 * 注意：前端中间件不是安全边界，仅做 UX 层面引导
 */
export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return

  const auth = useAuth()
  auth.restore()

  if (!auth.isAuthenticated.value) {
    return navigateTo(buildLoginRedirectPath(to.fullPath))
  }
  // TODO: 后端角色判断需要在用户 API 中提供角色信息
  // 当前仅检查认证状态，管理员权限由后端 API 兜底
})
