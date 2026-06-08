/** 客户端启动时从 localStorage 恢复认证状态 */
export default defineNuxtPlugin(() => {
  const authStore = useAuthStore()
  authStore.restore()
})
