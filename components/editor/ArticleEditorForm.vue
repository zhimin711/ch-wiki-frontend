<template>
  <div class="editor-page">
    <div class="page-header">
      <div>
        <h1>{{ mode === 'edit' ? '编辑文章' : '写文章' }}</h1>
        <p>维护标题、分类、封面、摘要和正文内容。</p>
      </div>
      <NuxtLink to="/center/article" class="table-link">返回列表</NuxtLink>
    </div>

    <el-skeleton v-if="loading" :rows="8" animated />
    <el-form v-else ref="formRef" :model="form" :rules="rules" label-position="top">
      <div class="form-grid">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" maxlength="120" show-word-limit />
        </el-form-item>
        <el-form-item label="分类" prop="categoryIds">
          <el-select v-model="categoryIds" multiple filterable collapse-tags placeholder="选择分类">
            <el-option
              v-for="item in flatCategories"
              :key="item.id"
              :label="item.label"
              :value="`${item.id}`"
            />
          </el-select>
        </el-form-item>
      </div>

      <div class="form-grid">
        <el-form-item label="标签" prop="keywords">
          <el-input v-model="form.keywords" maxlength="120" placeholder="多个标签用逗号分隔" />
        </el-form-item>
      </div>

      <el-form-item label="封面地址" prop="image">
        <el-input v-model="form.image" maxlength="512" placeholder="/upload/... 或 https://..." />
      </el-form-item>

      <el-form-item label="转载地址" prop="href">
        <el-input v-model="form.href" maxlength="512" placeholder="http:// 或 https://" />
      </el-form-item>

      <el-form-item label="摘要" prop="description">
        <el-input v-model="form.description" type="textarea" maxlength="255" show-word-limit />
      </el-form-item>

      <el-form-item label="正文" prop="content">
        <el-tabs v-model="activeTab" type="card" class="content-tabs">
          <el-tab-pane label="富文本编辑" name="rich">
            <ClientOnly>
              <EditorRichTextEditor
                v-model="htmlContent"
                :height="editorHeight"
                media-purpose="ARTICLE_CONTENT"
                @media-status="handleMediaStatus"
              />
              <template #fallback>
                <el-skeleton :rows="12" animated />
              </template>
            </ClientOnly>
          </el-tab-pane>
          <el-tab-pane label="Markdown 编辑" name="markdown">
            <ClientOnly>
              <EditorMarkdownEditor
                v-model="mdContent"
                :height="editorHeight"
              />
              <template #fallback>
                <el-skeleton :rows="12" animated />
              </template>
            </ClientOnly>
          </el-tab-pane>
        </el-tabs>
      </el-form-item>

      <el-alert
        v-if="mediaIds.length"
        type="info"
        :closable="false"
        show-icon
        :title="`正文包含 ${mediaIds.length} 个私有媒体，发布后将异步转为静态资源`"
      />
      <el-alert
        v-if="mediaStatus.failed"
        type="warning"
        :closable="false"
        show-icon
        title="有媒体上传失败，请在编辑器下方重试或移除"
      />

      <div class="form-actions">
        <el-button :loading="saving" :disabled="mediaStatus.uploading" @click="submit(0)">保存草稿</el-button>
        <el-button type="primary" :loading="saving" :disabled="mediaStatus.uploading" @click="submit(1)">提交发布</el-button>
        <el-button :disabled="!form.href" :loading="analyzing" @click="analyzeUrl">加载源文章</el-button>
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import type { APIClassifyDTO } from '~/services/public-api'
import type { UserArticleSaveRequest } from '~/services/article-api'

interface FlatCategory {
  id: number
  label: string
}

const props = defineProps<{
  mode: 'add' | 'edit'
  initialValue?: Partial<UserArticleSaveRequest> | null
  categories: APIClassifyDTO[]
  loading?: boolean
  saving?: boolean
}>()

const emit = defineEmits<{
  (e: 'submit', value: UserArticleSaveRequest): void
  (e: 'analyze', url: string): void
}>()

const formRef = ref()
const analyzing = ref(false)

type EditorTab = 'rich' | 'markdown'

const activeTab = ref<EditorTab>('rich')
const htmlContent = ref<string>('')
const mdContent = ref<string>('')
const editorHeight = '520px'
const mediaStatus = reactive({ uploading: false, failed: false })

function handleMediaStatus(value: { uploading: boolean; failed: boolean }) {
  Object.assign(mediaStatus, value)
}

const form = reactive<UserArticleSaveRequest>({
  title: '',
  categoryId: '',
  href: '',
  image: '',
  keywords: '',
  description: '',
  status: 0,
})
/** 多选分类 id 数组，与 select 绑定。提交时再 join(',') 回写 form.categoryId */
const categoryIds = ref<string[]>([])
const mediaIds = computed(() => extractArticleMediaIds(
  activeTab.value === 'rich' ? htmlContent.value : mdContent.value,
))
/** 把后端返回的 categoryId（可能是 '5' / '1,2,3' / '["1","2"]'）拆成数组，只保留最后一级 id，前面层级（路径前缀）丢弃 */
function toCategoryIdArray(value: unknown): string[] {
  if (value == null) return []
  const trimmed = String(value).trim()
  if (!trimmed) return []
  let arr: string[]
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) arr = parsed.map(String).filter(Boolean)
      else arr = [trimmed]
    } catch { arr = [trimmed] }
  } else {
    arr = trimmed.split(',').map(item => item.trim()).filter(Boolean)
  }
  return arr.length ? [arr[arr.length - 1]] : []
}

const rules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  categoryIds: [{
    validator: (_: unknown, _value: string[] | undefined, callback: (err?: Error) => void) => {
      if (!categoryIds.value.length) return callback(new Error('请选择分类'))
      callback()
    },
    trigger: 'change',
  }],
  content: [{
    validator: (_: unknown, _value: string, callback: (err?: Error) => void) => {
      const current = activeTab.value === 'rich' ? htmlContent.value : mdContent.value
      if (!current || !current.trim()) {
        return callback(new Error('请输入正文'))
      }
      // 富文本模式下若只有空白标签也视为空
      if (activeTab.value === 'rich') {
        const stripped = current.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').trim()
        if (!stripped && extractArticleMediaIds(current).length === 0) {
          return callback(new Error('请输入正文'))
        }
      }
      callback()
    },
    trigger: 'blur',
  }],
}

const flatCategories = computed(() => flattenCategories(props.categories))

function looksLikeHtml(s: string): boolean {
  const t = (s || '').trim()
  if (!t.startsWith('<')) return false
  return /<(h[1-6]|p|div|ul|ol|li|pre|blockquote|img|table|code|strong|em|br|hr|section|article)[\s>]/i.test(t)
}

watch(
  () => props.initialValue,
  (value) => {
    Object.assign(form, {
      title: value?.title || '',
      categoryId: value?.categoryId ? `${value.categoryId}` : '',
      href: value?.href || '',
      image: value?.image || '',
      keywords: value?.keywords || '',
      description: value?.description || '',
      status: value?.status ?? 0,
    })
    categoryIds.value = toCategoryIdArray(value?.categoryId)
    const content = value?.content || ''
    htmlContent.value = content
    mdContent.value = content
    // 根据内容自动选择合适的编辑器 tab
    activeTab.value = content && looksLikeHtml(content) ? 'rich' : 'markdown'
  },
  { immediate: true },
)

function flattenCategories(categories: APIClassifyDTO[], prefix = ''): FlatCategory[] {
  const result: FlatCategory[] = []
  for (const item of categories || []) {
    const label = prefix ? `${prefix} / ${item.name}` : item.name
    if (!item.children || item.children.length === 0) {
      result.push({ id: item.id, label })
    } else {
      result.push(...flattenCategories(item.children, label))
    }
  }
  return result
}

async function submit(status: number) {
  if (mediaStatus.uploading) {
    ElMessage?.warning?.('请等待媒体上传完成')
    return
  }
  // 同步当前 tab 的内容到 form.content 用于校验
  form.content = activeTab.value === 'rich' ? htmlContent.value : mdContent.value
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  emit('submit', {
    ...form,
    status,
    content: form.content,
    categoryId: categoryIds.value.join(','),
    mediaIds: extractArticleMediaIds(form.content),
  })
}

async function analyzeUrl() {
  if (!form.href) return
  analyzing.value = true
  try {
    emit('analyze', form.href)
  } finally {
    analyzing.value = false
  }
}

defineExpose({
  applyPatch(value: Partial<UserArticleSaveRequest>) {
    Object.assign(form, {
      title: value.title || form.title,
      href: value.href || form.href,
      image: value.image || form.image,
      keywords: value.keywords || form.keywords,
      description: value.description || form.description,
    })
    if (value.content) {
      htmlContent.value = value.content
      mdContent.value = value.content
      activeTab.value = looksLikeHtml(value.content) ? 'rich' : 'markdown'
    }
  },
})
</script>

<style scoped>
.editor-page {
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
  margin: 0 0 6px;
  font-size: 22px;
  color: #303133;
}
.page-header p {
  margin: 0;
  color: #909399;
  font-size: 13px;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.form-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.form-actions + .el-alert,
.el-alert + .form-actions {
  margin-top: 12px;
}
.table-link {
  color: #409eff;
  text-decoration: none;
}
.content-tabs {
  width: 100%;
}
.content-tabs :deep(.el-tabs__header) {
  margin-bottom: 8px;
}
.content-tabs :deep(.el-tabs__content) {
  padding: 0;
}
@media (max-width: 768px) {
  .page-header,
  .form-grid {
    grid-template-columns: 1fr;
  }
  .page-header {
    flex-direction: column;
  }
}
</style>
