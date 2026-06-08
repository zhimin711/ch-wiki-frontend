<template>
  <div class="avatar-page">
    <div class="page-header">
      <div>
        <h1>头像</h1>
        <p>上传头像或使用已有图片地址。</p>
      </div>
    </div>

    <el-skeleton v-if="loading" :rows="5" animated />
    <div v-else class="avatar-body">
      <div class="avatar-preview">
        <el-avatar :size="112" :src="previewSrc">
          {{ avatarText }}
        </el-avatar>
      </div>

      <el-upload
        :auto-upload="false"
        :show-file-list="false"
        accept="image/*"
        :on-change="handleFileChange"
      >
        <el-button>选择图片</el-button>
      </el-upload>

      <el-form label-position="top" class="avatar-form">
        <el-form-item label="头像地址">
          <el-input v-model="avatarUrl" maxlength="512" />
        </el-form-item>
        <div class="avatar-actions">
          <el-button type="primary" :loading="saving" @click="saveAvatar">
            保存头像
          </el-button>
          <el-button :loading="uploading" :disabled="!selectedFile" @click="uploadAndSave">
            上传并保存
          </el-button>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UploadFile } from 'element-plus'
import type { UserProfile } from '~/services/user-api'

definePageMeta({
  layout: 'center',
  middleware: 'auth',
})

const userApi = useUserApi()
const auth = useAuth()

const loading = ref(true)
const saving = ref(false)
const uploading = ref(false)
const profile = ref<UserProfile | null>(null)
const avatarUrl = ref('')
const selectedFile = ref<File | null>(null)
const localPreviewUrl = ref('')

const avatarText = computed(() => (profile.value?.nickname || profile.value?.username || '?').slice(0, 1))
const savedAvatarSrc = computed(() => resolveDisplayImage(
  avatarUrl.value,
  profile.value?.nickname || profile.value?.username || '?',
  112,
))
const previewSrc = computed(() => localPreviewUrl.value || savedAvatarSrc.value)

function revokeLocalPreview() {
  if (localPreviewUrl.value) {
    URL.revokeObjectURL(localPreviewUrl.value)
    localPreviewUrl.value = ''
  }
}

async function loadProfile() {
  loading.value = true
  try {
    const data = await userApi.getProfile()
    profile.value = data
    avatarUrl.value = data?.avatar || ''
  } catch {
    ElMessage?.error?.('头像信息加载失败')
  } finally {
    loading.value = false
  }
}

function handleFileChange(uploadFile: UploadFile) {
  const raw = uploadFile.raw
  if (!raw) return
  selectedFile.value = raw
  revokeLocalPreview()
  localPreviewUrl.value = URL.createObjectURL(raw)
}

async function persistAvatar(url: string) {
  if (!url.trim()) {
    ElMessage?.error?.('请先选择图片或填写头像地址')
    return
  }
  const data = await userApi.updateAvatar(url.trim())
  if (data) {
    profile.value = data
    avatarUrl.value = data.avatar || ''
    auth.setAvatar(data.avatar || null)
    revokeLocalPreview()
    selectedFile.value = null
    ElMessage?.success?.('头像已保存')
  }
}

async function saveAvatar() {
  saving.value = true
  try {
    await persistAvatar(avatarUrl.value)
  } catch {
    ElMessage?.error?.('保存失败')
  } finally {
    saving.value = false
  }
}

async function uploadAndSave() {
  if (!selectedFile.value) return
  uploading.value = true
  try {
    const fileInfo = await userApi.uploadAvatar(selectedFile.value)
    const uploadedUrl = uploadedAvatarUrl(fileInfo)
    await persistAvatar(uploadedUrl)
  } catch {
    ElMessage?.error?.('上传失败')
  } finally {
    uploading.value = false
  }
}

onMounted(loadProfile)
onBeforeUnmount(revokeLocalPreview)

useHead({ title: '头像 - ch-wiki' })
</script>

<style scoped>
.avatar-page {
  max-width: 640px;
  background: #fff;
  border-radius: 8px;
  padding: 24px;
}
.page-header {
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
.avatar-body {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.avatar-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 132px;
  height: 132px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fafafa;
}
.avatar-form {
  max-width: 520px;
}
.avatar-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
</style>
