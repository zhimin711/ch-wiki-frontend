<template>
  <div class="callback-page">
    <div class="callback-panel">
      <h1>第三方登录</h1>
      <p v-if="loading" class="callback-message">正在处理登录...</p>
      <template v-else>
        <el-alert
          :title="errorMessage"
          type="error"
          show-icon
          :closable="false"
          class="callback-error"
        />
        <el-button type="primary" @click="goLogin">重新登录</el-button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * OAuth2 回调页面。
 * 后端 OAuth2 登录成功后重定向到 /login/callback?code=xxx，
 * 此页面用 code 换取 JWT 并存储到本地。
 */
import { useAuthApi } from '~/services/auth-api'

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const authApi = useAuthApi()

const loading = ref(true)
const errorMessage = ref('')
const oauthRedirectFallback = ref('/')

const errorMessages: Record<string, string> = {
  oauth2_login_failed: '第三方登录失败，请重新登录',
  code_exchange_failed: '第三方登录失败，请重新登录',
  code_missing: '登录回调缺少授权码，请重新登录',
}

const redirectPath = computed(() => normalizeAuthRedirect(route.query.redirect, oauthRedirectFallback.value))

function goLogin() {
  navigateTo(buildLoginRedirectPath(redirectPath.value), { replace: true })
}

async function showError(error: keyof typeof errorMessages) {
  errorMessage.value = errorMessages[error]
  loading.value = false
  await router.replace({
    path: '/login/callback',
    query: redirectPath.value === '/' ? { error } : { error, redirect: redirectPath.value },
  })
}

onMounted(async () => {
  oauthRedirectFallback.value = consumeOAuthRedirect('/')

  const callbackError = typeof route.query.error === 'string' ? route.query.error : ''
  if (callbackError && errorMessages[callbackError]) {
    errorMessage.value = errorMessages[callbackError]
    loading.value = false
    return
  }

  const code = route.query.code as string
  if (!code) {
    await showError('code_missing')
    return
  }

  try {
    const result = await authApi.exchangeCodeToken(code)
    if (result) {
      auth.setAuth({
        accessToken: result.accessToken,
        username: result.username,
        nickname: result.nickname,
      })
      await navigateTo(redirectPath.value, { replace: true })
    } else {
      await showError('code_exchange_failed')
    }
  } catch {
    await showError('code_exchange_failed')
  }
})

useHead({
  title: '第三方登录 - ch-wiki',
})
</script>

<style scoped>
.callback-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: #f5f7fa;
}
.callback-panel {
  width: 100%;
  max-width: 420px;
  padding: 32px;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.08);
  text-align: center;
}
.callback-panel h1 {
  margin: 0 0 16px;
  font-size: 22px;
  color: #303133;
}
.callback-message {
  margin: 0;
  color: #606266;
}
.callback-error {
  margin-bottom: 20px;
  text-align: left;
}
</style>
