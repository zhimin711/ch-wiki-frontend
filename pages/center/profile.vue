<template>
  <div class="profile-page">
    <div class="page-header">
      <div>
        <h1>个人资料</h1>
        <p>维护昵称、联系方式和个人备注。</p>
      </div>
      <el-button type="primary" :loading="saving" @click="saveProfile">保存</el-button>
    </div>

    <el-skeleton v-if="loading" :rows="6" animated />
    <el-alert
      v-else-if="errorMessage"
      :title="errorMessage"
      type="error"
      show-icon
      :closable="false"
    />
    <el-form
      v-else
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      class="profile-form"
    >
      <div class="readonly-row">
        <div>
          <span>用户名</span>
          <strong>{{ profile?.username }}</strong>
        </div>
        <div>
          <span>等级</span>
          <strong>{{ profile?.type || '-' }} · {{ profile?.level || 0 }}</strong>
        </div>
        <div>
          <span>积分</span>
          <strong>{{ profile?.integral || 0 }}</strong>
        </div>
      </div>

      <div class="form-grid">
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="form.nickname" maxlength="40" show-word-limit />
        </el-form-item>
        <el-form-item label="真实姓名" prop="realName">
          <el-input v-model="form.realName" maxlength="40" show-word-limit />
        </el-form-item>
        <el-form-item label="性别" prop="sex">
          <el-select v-model="form.sex" clearable placeholder="请选择">
            <el-option label="女" :value="0" />
            <el-option label="男" :value="1" />
          </el-select>
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" maxlength="120" />
        </el-form-item>
        <el-form-item label="手机号" prop="mobile">
          <el-input v-model="form.mobile" maxlength="20" />
        </el-form-item>
      </div>

      <el-form-item label="个人备注" prop="remark">
        <el-input v-model="form.remark" type="textarea" :rows="4" maxlength="240" show-word-limit />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import type { UserProfile } from '~/services/user-api'

definePageMeta({
  layout: 'center',
  middleware: 'auth',
})

const userApi = useUserApi()

const formRef = ref()
const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const profile = ref<UserProfile | null>(null)

const form = reactive({
  nickname: '',
  realName: '',
  sex: null as number | null,
  email: '',
  mobile: '',
  remark: '',
})

const rules = {
  nickname: [{ max: 40, message: '昵称不能超过 40 个字符', trigger: 'blur' }],
  realName: [{ max: 40, message: '真实姓名不能超过 40 个字符', trigger: 'blur' }],
  email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }],
  mobile: [{ pattern: /^$|^1\d{10}$/, message: '手机号格式不正确', trigger: 'blur' }],
}

function fillForm(data: UserProfile) {
  form.nickname = data.nickname || ''
  form.realName = data.realName || ''
  form.sex = data.sex ?? null
  form.email = data.email || ''
  form.mobile = data.mobile || ''
  form.remark = data.remark || ''
}

async function loadProfile() {
  loading.value = true
  errorMessage.value = ''
  try {
    const data = await userApi.getProfile()
    if (data) {
      profile.value = data
      fillForm(data)
    } else {
      errorMessage.value = '未获取到个人资料'
    }
  } catch {
    errorMessage.value = '个人资料加载失败'
  } finally {
    loading.value = false
  }
}

async function saveProfile() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    const data = await userApi.updateProfile({ ...form })
    if (data) {
      profile.value = data
      fillForm(data)
      ElMessage?.success?.('资料已保存')
    }
  } catch {
    ElMessage?.error?.('保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(loadProfile)

useHead({ title: '个人资料 - ch-wiki' })
</script>

<style scoped>
.profile-page {
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
.readonly-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}
.readonly-row div {
  padding: 14px 16px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
}
.readonly-row span {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  color: #909399;
}
.readonly-row strong {
  font-size: 14px;
  color: #303133;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 20px;
}
@media (max-width: 768px) {
  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }
  .readonly-row,
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
