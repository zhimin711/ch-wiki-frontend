<template>
  <div class="password-page">
    <div class="page-header">
      <div>
        <h1>站内密码</h1>
        <p>{{ hasPassword ? '修改当前账号的站内登录密码。' : '为当前账号设置站内登录密码。' }}</p>
      </div>
      <el-tag :type="hasPassword ? 'success' : 'warning'">
        {{ hasPassword ? '已设置' : '未设置' }}
      </el-tag>
    </div>

    <el-skeleton v-if="loading" :rows="5" animated />
    <el-form
      v-else
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      class="password-form"
    >
      <el-form-item v-if="hasPassword" label="原密码" prop="origPassword">
        <el-input v-model="form.origPassword" type="password" show-password autocomplete="current-password" />
      </el-form-item>
      <el-form-item label="新密码" prop="newPassword">
        <el-input v-model="form.newPassword" type="password" show-password autocomplete="new-password" />
      </el-form-item>
      <el-form-item label="确认新密码" prop="confirmPassword">
        <el-input v-model="form.confirmPassword" type="password" show-password autocomplete="new-password" />
      </el-form-item>
      <el-button type="primary" :loading="saving" @click="savePassword">
        {{ hasPassword ? '修改密码' : '设置密码' }}
      </el-button>
    </el-form>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'center',
  middleware: 'auth',
})

const userApi = useUserApi()

const formRef = ref()
const loading = ref(true)
const saving = ref(false)
const hasPassword = ref(false)

const form = reactive({
  origPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const validateConfirm = (_rule: unknown, value: string, callback: (error?: Error) => void) => {
  if (value !== form.newPassword) {
    callback(new Error('两次输入的新密码不一致'))
    return
  }
  callback()
}

const rules = computed(() => ({
  origPassword: hasPassword.value ? [{ required: true, message: '请输入原密码', trigger: 'blur' }] : [],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 8, max: 128, message: '密码长度需为 8-128 个字符', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    { validator: validateConfirm, trigger: 'blur' },
  ],
}))

function resetForm() {
  form.origPassword = ''
  form.newPassword = ''
  form.confirmPassword = ''
  formRef.value?.clearValidate?.()
}

async function loadStatus() {
  loading.value = true
  try {
    const status = await userApi.getPasswordStatus()
    hasPassword.value = !!status?.hasPassword
  } catch {
    ElMessage?.error?.('密码状态加载失败')
  } finally {
    loading.value = false
  }
}

async function savePassword() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    const ok = await userApi.updatePassword({
      origPassword: hasPassword.value ? form.origPassword : undefined,
      newPassword: form.newPassword,
    })
    if (ok) {
      ElMessage?.success?.(hasPassword.value ? '密码已修改' : '密码已设置')
      hasPassword.value = true
      resetForm()
    } else {
      ElMessage?.error?.('操作失败')
    }
  } catch {
    ElMessage?.error?.('操作失败')
  } finally {
    saving.value = false
  }
}

onMounted(loadStatus)

useHead({ title: '站内密码 - ch-wiki' })
</script>

<style scoped>
.password-page {
  max-width: 640px;
  background: #fff;
  border-radius: 8px;
  padding: 24px;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}
.page-header h1 {
  margin: 0 0 6px;
  font-size: 22px;
  color: #303133;
}
.page-header p {
  margin: 0;
  color: #909399;
  font-size: 13px;
}
@media (max-width: 768px) {
  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
