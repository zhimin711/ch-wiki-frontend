<template>
  <div class="login-page">
    <div class="login-container">
      <!-- 品牌视觉区 -->
      <div class="login-visual">
        <NuxtLink to="/" class="login-brand">ch-wiki</NuxtLink>
        <h2 class="login-slogan">沉淀知识，连接创作</h2>
        <p class="login-subtitle">Chao Hua Wiki</p>
        <p class="login-description">登录后继续管理文章、文档、资源与个人工作台。</p>
      </div>

      <!-- 右侧表单区 -->
      <div class="login-panel">
        <h1 class="login-title">账号登录</h1>

        <!-- 错误提示 -->
        <el-alert
          v-if="errorMessage"
          :title="errorMessage"
          type="error"
          show-icon
          :closable="true"
          @close="errorMessage = ''"
          class="login-error"
        />

        <!-- 账号密码表单 -->
        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-position="top"
          @submit.prevent="handleLogin"
        >
          <el-form-item label="账号" prop="account">
            <el-input
              v-model="form.account"
              placeholder="请输入用户名/邮箱/手机号"
              size="large"
              prefix-icon="User"
            />
          </el-form-item>

          <el-form-item label="密码" prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="请输入密码"
              size="large"
              prefix-icon="Lock"
              show-password
            />
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              size="large"
              :loading="loading"
              native-type="submit"
              class="login-button"
            >
              登录
            </el-button>
          </el-form-item>
        </el-form>

        <!-- 第三方登录 -->
        <div class="oauth2-section">
          <p class="oauth2-label">第三方登录</p>
          <div class="oauth2-buttons">
            <a
              v-for="(url, provider) in oauth2Providers"
              :key="provider"
              :href="url"
              class="oauth2-btn"
              :class="provider"
              :title="providerLabel(provider)"
              @click="handleOAuthClick"
            >
              <svg v-if="provider === 'github'" class="oauth2-svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              <svg v-else-if="provider === 'gitee'" class="oauth2-svg" viewBox="0 0 24 24" fill="currentColor"><path d="M11.984 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.016 0zm6.09 5.333c.328 0 .593.266.592.593v1.482a.594.594 0 01-.593.592H9.777c-.982 0-1.778.796-1.778 1.778v5.926c0 .982.796 1.778 1.778 1.778h4.452c.982 0 1.778-.796 1.778-1.778v-.296a.593.593 0 00-.592-.593h-2.963a.593.593 0 01-.593-.592v-1.482a.593.593 0 01.593-.592h5.926c.327 0 .593.265.593.592v3.408a4 4 0 01-4 4H9.185a4 4 0 01-4-4V9.778a4.444 4.444 0 014.444-4.444h8.445z"/></svg>
              <span v-else class="oauth2-icon">{{ provider }}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
})

import { useAuthApi } from '~/services/auth-api'

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const authApi = useAuthApi()

const formRef = ref()
const loading = ref(false)
const errorMessage = ref('')

const form = reactive({
  account: '',
  password: '',
})

const redirectPath = computed(() => normalizeAuthRedirect(route.query.redirect, '/'))

const rules = {
  account: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

// OAuth2 登录地址 — 必须直接跳转到后端，不能走 Nuxt 代理（OAuth2 需要 302 重定向）
const config = useRuntimeConfig()
const oauth2Providers = computed(() => {
  const baseUrl = config.public.apiBaseUrl || ''
  try {
    const paths: Record<string, string> = JSON.parse(config.public.oauth2LoginUrls || '{}')
    const result: Record<string, string> = {}
    for (const [provider, path] of Object.entries(paths)) {
      result[provider] = path.startsWith('http') ? path : `${baseUrl}${path}`
    }
    return result
  } catch {
    return {}
  }
})

function providerLabel(provider: string) {
  const labels: Record<string, string> = { gitee: 'Gitee', github: 'GitHub' }
  return labels[provider] || provider
}

// URL 参数处理
const errorMessages: Record<string, string> = {
  code_expired: '登录码已过期，请重新登录',
  code_exchange_failed: '第三方登录失败，请重试',
  code_missing: '登录回调缺少授权码，请重新登录',
  session_expired: '登录状态已失效，请重新登录',
}

const loginError = typeof route.query.error === 'string' ? route.query.error : ''
if (loginError && errorMessages[loginError]) {
  errorMessage.value = errorMessages[loginError]
}

onMounted(() => {
  auth.restore()
  if (auth.isAuthenticated.value) {
    router.replace(redirectPath.value)
  }
})

function handleOAuthClick() {
  rememberOAuthRedirect(redirectPath.value)
}

async function handleLogin() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  errorMessage.value = ''

  try {
    const result = await authApi.passwordLogin({
      account: form.account,
      password: form.password,
    })
    if (result) {
      auth.setAuth({
        accessToken: result.accessToken,
        username: result.username,
        nickname: result.nickname,
      })
      router.replace(redirectPath.value)
    } else {
      errorMessage.value = '账号或密码错误'
    }
  } catch {
    errorMessage.value = '账号或密码错误'
  } finally {
    loading.value = false
  }
}

useHead({
  title: '登录 - ch-wiki',
})
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}
.login-container {
  display: flex;
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  max-width: 900px;
  width: 100%;
  min-height: 500px;
}
.login-visual {
  flex: 1;
  padding: 40px;
  background: linear-gradient(135deg, #409eff 0%, #3a8ee6 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.login-brand {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  text-decoration: none;
  margin-bottom: 24px;
}
.login-slogan {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 8px;
}
.login-subtitle {
  font-size: 14px;
  opacity: 0.8;
  margin-bottom: 16px;
}
.login-description {
  font-size: 14px;
  opacity: 0.7;
  line-height: 1.6;
}
.login-panel {
  flex: 1;
  padding: 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.login-title {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 24px;
  color: #303133;
}
.login-error {
  margin-bottom: 16px;
}
.login-button {
  width: 100%;
}
.oauth2-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e4e7ed;
}
.oauth2-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 12px;
}
.oauth2-buttons {
  display: flex;
  gap: 12px;
}
.oauth2-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #f5f7fa;
  color: #606266;
  text-decoration: none;
  font-size: 12px;
  transition: background 0.2s, color 0.2s;
}
.oauth2-btn:hover {
  background: #e4e7ed;
}
.oauth2-btn.github {
  color: #24292e;
}
.oauth2-btn.github:hover {
  background: #24292e;
  color: #fff;
}
.oauth2-btn.gitee {
  color: #c71d23;
}
.oauth2-btn.gitee:hover {
  background: #c71d23;
  color: #fff;
}
.oauth2-svg {
  width: 22px;
  height: 22px;
}

@media (max-width: 768px) {
  .login-visual {
    display: none;
  }
}
</style>
