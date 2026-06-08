<template>
  <div class="token-page">
    <div class="page-header">
      <div>
        <h1>私人令牌</h1>
        <p>为 API 访问创建和撤销个人访问令牌。</p>
      </div>
      <el-button type="primary" @click="openCreate">创建令牌</el-button>
    </div>

    <el-table v-loading="loading" :data="records" row-key="tokenId">
      <el-table-column prop="name" label="名称" min-width="180">
        <template #default="{ row }">
          <div class="name-cell">
            <strong>{{ row.name }}</strong>
            <span v-if="row.description">{{ row.description }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="令牌" width="170">
        <template #default="{ row }">
          {{ row.tokenPrefix || 'chwiki_pat_' }}****{{ row.tokenLastChars || '' }}
        </template>
      </el-table-column>
      <el-table-column label="授权范围" min-width="220">
        <template #default="{ row }">
          <div class="scope-tags">
            <el-tag v-for="scope in row.scopes || []" :key="scope" size="small">
              {{ scopeLabel(scope) }}
            </el-tag>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="personalTokenStatusType(row.status)">
            {{ personalTokenStatusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="过期时间" width="170">
        <template #default="{ row }">{{ formatDate(row.expiredAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button link type="danger" :disabled="row.status !== '0'" @click="revokeToken(row as PersonalTokenItem)">
            撤销
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="createVisible" title="创建私人令牌" width="560px">
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" maxlength="60" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="3" maxlength="200" show-word-limit />
        </el-form-item>
        <el-form-item label="过期时间" prop="expiredAt">
          <el-date-picker
            v-model="form.expiredAt"
            type="datetime"
            value-format="YYYY-MM-DDTHH:mm:ss"
            placeholder="不设置则长期有效"
          />
        </el-form-item>
        <el-form-item label="授权范围" prop="scopes">
          <el-checkbox-group v-model="form.scopes" class="scope-options">
            <el-checkbox v-for="scope in PERSONAL_TOKEN_SCOPE_OPTIONS" :key="scope.value" :label="scope.value">
              {{ scope.label }}
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="createToken">创建</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="createdVisible" title="令牌已创建" width="560px" @closed="createdToken = ''">
      <el-alert
        title="令牌明文只会显示这一次。"
        type="warning"
        show-icon
        :closable="false"
        class="token-alert"
      />
      <el-input v-model="createdToken" type="textarea" :rows="3" readonly />
      <template #footer>
        <el-button @click="copyToken">复制</el-button>
        <el-button type="primary" @click="createdVisible = false">完成</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import type { PersonalTokenItem } from '~/services/personal-token-api'
import {
  PERSONAL_TOKEN_SCOPE_OPTIONS,
  personalTokenStatusLabel,
  personalTokenStatusType,
} from '~/services/personal-token-api'

definePageMeta({
  layout: 'center',
  middleware: 'auth',
})

const tokenApi = usePersonalTokenApi()
const loading = ref(false)
const saving = ref(false)
const createVisible = ref(false)
const createdVisible = ref(false)
const createdToken = ref('')
const formRef = ref()
const records = ref<PersonalTokenItem[]>([])

const form = reactive({
  name: '',
  description: '',
  expiredAt: null as string | null,
  scopes: ['profile:read'],
})

const rules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  scopes: [{ type: 'array', required: true, message: '请选择授权范围', trigger: 'change' }],
}

function scopeLabel(scope: string) {
  return PERSONAL_TOKEN_SCOPE_OPTIONS.find((item) => item.value === scope)?.label || scope
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString() : '-'
}

function resetForm() {
  form.name = ''
  form.description = ''
  form.expiredAt = null
  form.scopes = ['profile:read']
  formRef.value?.clearValidate?.()
}

async function fetchData() {
  loading.value = true
  try {
    records.value = await tokenApi.listPersonalTokens()
  } catch {
    ElMessage?.error?.('令牌加载失败')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  resetForm()
  createVisible.value = true
}

async function createToken() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    const created = await tokenApi.createPersonalToken({ ...form })
    if (created?.token) {
      createdToken.value = created.token
      createVisible.value = false
      createdVisible.value = true
      fetchData()
    }
  } catch {
    ElMessage?.error?.('创建失败')
  } finally {
    saving.value = false
  }
}

async function revokeToken(row: PersonalTokenItem) {
  try {
    await ElMessageBox?.confirm?.('撤销后该令牌将立即无法继续访问 API。是否继续？', '撤销令牌', { type: 'warning' })
    const ok = await tokenApi.revokePersonalToken(row.tokenId)
    if (ok) {
      ElMessage?.success?.('已撤销')
      fetchData()
    }
  } catch {
    // cancel
  }
}

async function copyToken() {
  if (!createdToken.value) return
  await navigator.clipboard?.writeText?.(createdToken.value)
  ElMessage?.success?.('已复制')
}

onMounted(fetchData)

useHead({ title: '私人令牌 - ch-wiki' })
</script>

<style scoped>
.token-page {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
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
.name-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.name-cell span {
  color: #909399;
  font-size: 12px;
}
.scope-tags,
.scope-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.scope-options {
  gap: 0 16px;
}
.token-alert {
  margin-bottom: 14px;
}
@media (max-width: 768px) {
  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
