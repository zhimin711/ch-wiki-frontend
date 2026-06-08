<template>
  <EditorArticleEditorForm
    ref="editorRef"
    mode="edit"
    :initial-value="article"
    :categories="categories"
    :loading="loading"
    :saving="saving"
    @submit="saveArticle"
    @analyze="analyzeArticle"
  />
</template>

<script setup lang="ts">
import type { APIClassifyDTO } from '~/services/public-api'
import type { UserArticleItem, UserArticleSaveRequest } from '~/services/article-api'

definePageMeta({
  layout: 'center',
  middleware: 'auth',
})

const route = useRoute()
const router = useRouter()
const articleApi = useArticleApi()
const editorRef = ref()
const loading = ref(true)
const saving = ref(false)
const categories = ref<APIClassifyDTO[]>([])
const article = ref<UserArticleItem | null>(null)
const articleId = computed(() => Number(route.params.id))

async function loadData() {
  loading.value = true
  try {
    const [categoryData, articleData] = await Promise.all([
      articleApi.getArticleCategories(),
      articleApi.getMyArticle(articleId.value),
    ])
    categories.value = categoryData
    if (!articleData) {
      ElMessage?.error?.('文章不存在或无权访问')
      router.push('/center/article')
      return
    }
    const content = articleData.content || await articleApi.getMyArticleContent(articleId.value)
    article.value = { ...articleData, content }
  } catch {
    ElMessage?.error?.('文章加载失败')
    router.push('/center/article')
  } finally {
    loading.value = false
  }
}

async function saveArticle(value: UserArticleSaveRequest) {
  saving.value = true
  try {
    const ok = await articleApi.updateMyArticle(articleId.value, value)
    if (ok) {
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
useHead({ title: '编辑文章 - ch-wiki' })
</script>
