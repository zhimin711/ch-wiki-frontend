<template>
  <div class="chapter-editor">
    <el-skeleton v-if="loading" :rows="10" animated />
    <template v-else-if="chapter">
      <div class="page-header">
        <div>
          <NuxtLink :to="`/center/books/${bookId}`" class="back-link">返回目录</NuxtLink>
          <h1>{{ chapterTitle }}</h1>
        </div>
        <NuxtLink :to="`${route.path}/text`" class="table-link">纯文本查看</NuxtLink>
      </div>

      <el-form label-position="top">
        <div class="form-grid">
          <el-form-item label="编号">
            <el-input v-model="form.number" maxlength="80" />
          </el-form-item>
          <el-form-item label="名称">
            <el-input v-model="form.name" maxlength="160" />
          </el-form-item>
          <el-form-item label="内容类型">
            <el-select v-model="form.contentType">
              <el-option label="文字" value="TEXT" />
              <el-option label="图片" value="IMAGE" />
              <el-option label="视频" value="VIDEO" />
              <el-option label="混合" value="MIX" />
            </el-select>
          </el-form-item>
          <el-form-item label="源地址">
            <el-input v-model="form.srcUrl" maxlength="512" />
          </el-form-item>
        </div>

        <el-form-item label="正文">
          <ClientOnly>
            <EditorChapterContentEditor
              v-model="form.content"
              :content-type="form.contentType"
              height="600px"
            />
            <template #fallback>
              <el-skeleton :rows="16" animated />
            </template>
          </ClientOnly>
        </el-form-item>

        <div class="actions">
          <el-button type="primary" :loading="saving" @click="saveChapter">保存正文</el-button>
          <el-button :disabled="!chapter.pre" @click="goChapter(chapter.pre)">上一章</el-button>
          <el-button :disabled="!chapter.next" @click="goChapter(chapter.next)">下一章</el-button>
        </div>
      </el-form>
    </template>
    <el-empty v-else description="章节不存在或无权访问" />
  </div>
</template>

<script setup lang="ts">
import type { BookContentType, UserBookChapter } from '~/services/user-book-api'

definePageMeta({ layout: 'center', middleware: 'auth' })

const route = useRoute()
const api = useUserBookApi()
const loading = ref(true)
const saving = ref(false)
const chapter = ref<UserBookChapter | null>(null)
const bookId = computed(() => Number(route.params.bookId))
const chapterId = computed(() => `${route.params.chapterId}`)

const form = reactive({
  number: '',
  name: '',
  contentType: 'TEXT' as BookContentType,
  srcUrl: '',
  content: '',
})

const chapterTitle = computed(() => [form.number, form.name].filter(Boolean).join(' ') || '章节正文')

async function loadChapter() {
  loading.value = true
  try {
    chapter.value = await api.getChapter(bookId.value, chapterId.value)
    if (chapter.value) {
      Object.assign(form, {
        number: chapter.value.number || '',
        name: chapter.value.name || '',
        contentType: chapter.value.contentType || 'TEXT',
        srcUrl: chapter.value.srcUrl || '',
        content: chapter.value.content || '',
      })
    }
  } catch {
    ElMessage?.error?.('章节加载失败')
  } finally {
    loading.value = false
  }
}

async function saveChapter() {
  if (!chapter.value) return
  saving.value = true
  try {
    const ok = await api.updateChapter(bookId.value, chapter.value.id, {
      ...form,
      pid: chapter.value.pid,
      pre: chapter.value.pre,
      leaf: true,
      status: chapter.value.status ?? 1,
    })
    if (ok) ElMessage?.success?.('章节正文已保存')
  } catch {
    ElMessage?.error?.('章节保存失败')
  } finally {
    saving.value = false
  }
}

async function goChapter(id?: string) {
  if (id) await navigateTo(`/center/books/${bookId.value}/chapter/${id}`)
}

watch(chapterId, loadChapter)
onMounted(loadChapter)
useHead({ title: () => `${chapterTitle.value} - 我的书籍` })
</script>

<style scoped>
.chapter-editor {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}
.page-header h1 {
  margin: 8px 0 0;
  font-size: 22px;
}
.back-link,
.table-link {
  color: #1677b8;
  text-decoration: none;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}
.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
@media (max-width: 720px) {
  .page-header,
  .form-grid {
    grid-template-columns: 1fr;
  }
  .page-header {
    flex-direction: column;
  }
}
</style>
