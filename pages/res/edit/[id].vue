<template>
  <UploadResourceUploadForm
    mode="edit"
    :initial-value="resource"
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
import type { UserResourceItem, UserResourceSaveRequest } from '~/services/resource-api'

definePageMeta({
  layout: 'center',
  middleware: 'auth',
})

const route = useRoute()
const router = useRouter()
const resourceApi = useResourceApi()
const loading = ref(true)
const saving = ref(false)
const uploadProgress = ref(0)
const submitError = ref('')
const categories = ref<APIClassifyDTO[]>([])
const resource = ref<UserResourceItem | null>(null)
const resourceId = computed(() => Number(route.params.id))

async function loadData() {
  if (!Number.isFinite(resourceId.value)) {
    router.push('/center/resource')
    return
  }
  loading.value = true
  try {
    const [categoryData, resourceData] = await Promise.all([
      resourceApi.getResourceCategories(),
      resourceApi.getMyResource(resourceId.value),
    ])
    categories.value = categoryData
    if (!resourceData) {
      ElMessage?.error?.('资源不存在或无权访问')
      router.push('/center/resource')
      return
    }
    resource.value = resourceData
  } catch {
    ElMessage?.error?.('资源加载失败')
    router.push('/center/resource')
  } finally {
    loading.value = false
  }
}

async function saveResource(value: UserResourceSaveRequest) {
  saving.value = true
  uploadProgress.value = 0
  submitError.value = ''
  try {
    const record = await resourceApi.updateMyResource(resourceId.value, value, percent => {
      uploadProgress.value = percent
    })
    if (record) {
      ElMessage?.success?.('资源已更新并提交审核')
      router.push('/center/resource')
    }
  } catch {
    submitError.value = '保存失败，请检查文件和表单后重试'
  } finally {
    saving.value = false
  }
}

onMounted(loadData)
useHead({ title: '编辑资源 - ch-wiki' })
</script>
