<template>
  <EditorArticleEditorForm
    ref="editorRef"
    mode="add"
    :categories="categories"
    :loading="loading"
    :saving="saving"
    @submit="saveArticle"
    @analyze="analyzeArticle"
  />
</template>

<script setup lang="ts">
import type { APIClassifyDTO } from '~/services/public-api'
import type { UserArticleSaveRequest } from '~/services/article-api'

definePageMeta({
  layout: 'center',
  middleware: 'auth',
})

const articleApi = useArticleApi()
const router = useRouter()
const editorRef = ref()
const loading = ref(true)
const saving = ref(false)
const categories = ref<APIClassifyDTO[]>([])

async function loadData() {
  loading.value = true
  try {
    categories.value = await articleApi.getArticleCategories()
  } catch {
    ElMessage?.error?.('分类加载失败')
  } finally {
    loading.value = false
  }
}

async function saveArticle(value: UserArticleSaveRequest) {
  saving.value = true
  try {
    const id = await articleApi.createMyArticle(value)
    if (id) {
      ElMessage?.success?.(value.status === 1 ? '文章已提交' : '草稿已保存')
      router.push('/center/article')
    }
  } catch {
    ElMessage?.error?.('保存失败')
  } finally {
    saving.value = false
  }
}

async function analyzeArticle(url: string) {
  try {
    const data = await articleApi.analyzeArticleUrl(url)
    if (data) {
      editorRef.value?.applyPatch?.(data)
      ElMessage?.success?.('已载入文章素材')
    }
  } catch {
    ElMessage?.error?.('加载源文章失败')
  }
}

onMounted(loadData)
useHead({ title: '写文章 - ch-wiki' })
</script>
