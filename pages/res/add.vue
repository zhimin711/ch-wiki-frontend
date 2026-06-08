<template>
  <UploadResourceUploadForm
    mode="add"
    :categories="categories"
    :loading="loading"
    :saving="saving"
    :upload-progress="uploadProgress"
    :submit-error="submitError"
    @submit="saveResource"
  />
</template>

<script setup lang="ts">
import type { APIClassifyDTO } from '~/services/public-api'
import type { UserResourceSaveRequest } from '~/services/resource-api'

definePageMeta({
  layout: 'center',
  middleware: 'auth',
})

const resourceApi = useResourceApi()
const router = useRouter()
const loading = ref(true)
const saving = ref(false)
const uploadProgress = ref(0)
const submitError = ref('')
const categories = ref<APIClassifyDTO[]>([])

async function loadData() {
  loading.value = true
  try {
    categories.value = await resourceApi.getResourceCategories()
  } catch {
    ElMessage?.error?.('分类加载失败')
  } finally {
    loading.value = false
  }
}

async function saveResource(value: UserResourceSaveRequest) {
  saving.value = true
  uploadProgress.value = 0
  submitError.value = ''
  try {
    const record = await resourceApi.createMyResource(value, percent => {
      uploadProgress.value = percent
    })
    if (record) {
      ElMessage?.success?.('资源已提交审核')
      router.push('/center/resource')
    }
  } catch {
    submitError.value = '上传失败，请检查文件和表单后重试'
  } finally {
    saving.value = false
  }
}

onMounted(loadData)
useHead({ title: '上传资源 - ch-wiki' })
</script>
