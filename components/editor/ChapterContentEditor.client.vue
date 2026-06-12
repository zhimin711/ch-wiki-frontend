<template>
  <div class="chapter-editor">
    <!-- TEXT / MIX：富文本 + Markdown 双 tab -->
    <el-tabs
      v-if="isRichType"
      v-model="activeTab"
      type="card"
      class="content-tabs"
    >
      <el-tab-pane label="富文本编辑" name="rich">
        <ClientOnly>
          <EditorRichTextEditor
            v-model="htmlContent"
            :height="height"
            :upload-image-server="uploadImageServer"
            :upload-image-headers="uploadImageHeaders"
          />
          <template #fallback>
            <el-skeleton :rows="14" animated />
          </template>
        </ClientOnly>
      </el-tab-pane>
      <el-tab-pane label="Markdown 编辑" name="markdown">
        <ClientOnly>
          <EditorMarkdownEditor
            v-model="mdContent"
            :height="height"
          />
          <template #fallback>
            <el-skeleton :rows="14" animated />
          </template>
        </ClientOnly>
      </el-tab-pane>
    </el-tabs>

    <!-- IMAGE：多 URL 列表 + 预览 -->
    <template v-else-if="contentType === 'IMAGE'">
      <el-input
        :model-value="urlContent"
        type="textarea"
        :rows="8"
        placeholder="每行一个图片地址，或用逗号/分号分隔"
        @update:model-value="onUrlInput"
      />
      <div v-if="imageUrls.length" class="image-preview">
        <h3>图片预览（{{ imageUrls.length }}）</h3>
        <div class="image-preview__grid">
          <div v-for="(url, idx) in imageUrls" :key="`${url}-${idx}`" class="image-preview__item">
            <img :src="url" alt="" loading="lazy" @error="onImgError($event)">
            <div class="image-preview__url">{{ url }}</div>
          </div>
        </div>
      </div>
      <el-empty v-else description="还没有图片地址" />
    </template>

    <!-- VIDEO：单 URL + 预览 -->
    <template v-else-if="contentType === 'VIDEO'">
      <el-input
        :model-value="urlContent"
        placeholder="视频地址（支持 mp4 直接播放，或 iframe/video 标签）"
        clearable
        @update:model-value="onUrlInput"
      />
      <div v-if="urlContent" class="video-preview">
        <h3>视频预览</h3>
        <video
          v-if="isDirectVideo"
          :src="urlContent"
          controls
          preload="metadata"
        />
        <iframe
          v-else
          :srcdoc="urlContent"
          sandbox=""
          title="视频嵌入预览"
        />
      </div>
    </template>

    <div v-if="showStatus" class="status-bar">
      <span>字符数 {{ charCount }}</span>
      <template v-if="isRichType">
        <span class="status-bar__sep">·</span>
        <span>{{ activeTab === 'rich' ? '富文本' : 'Markdown' }} 模式</span>
      </template>
      <template v-else>
        <span class="status-bar__sep">·</span>
        <span>{{ contentTypeLabel }}</span>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { normalizeBackendUrl } from '~/composables/useAvatar'
import type { BookContentType } from '~/services/user-book-api'

type EditorTab = 'rich' | 'markdown'

interface Props {
  modelValue?: string
  contentType?: BookContentType
  height?: string
  /** 图片上传端点，默认 /upload/image/article */
  uploadImageServer?: string
  /** 是否显示底部状态栏 */
  showStatus?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  contentType: 'TEXT',
  height: '600px',
  uploadImageServer: '/upload/image/article',
  showStatus: true,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const htmlContent = ref<string>('')
const mdContent = ref<string>('')
const urlContent = ref<string>('')
const activeTab = ref<EditorTab>('rich')

// 记录上一次 emit 的值，避免 props.modelValue 变化回环触发 watch
// 初始值必须为空串: 若初始化为 props.modelValue，则 immediate: true 的
// 首次回调里 next === lastEmittedValue 会直接 return，导致 syncAll
// 不执行、编辑器收到的 modelValue 为空字符串（典型场景: 章节内容是
// 异步加载的，挂载时 props.modelValue 已是正文，但三个本地 ref 仍为 ''）。
let lastEmittedValue: string = ''

const isRichType = computed(
  () => props.contentType === 'TEXT' || props.contentType === 'MIX',
)

const contentTypeLabel = computed(() => {
  if (props.contentType === 'IMAGE') return '图片集'
  if (props.contentType === 'VIDEO') return '视频'
  if (props.contentType === 'MIX') return '混合'
  return '文字'
})

const uploadImageHeaders = (): Record<string, string> => {
  const token = useAuthToken().value
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const imageUrls = computed(() =>
  (urlContent.value || '')
    .split(/[,;\n]/)
    .map(item => normalizeBackendUrl(item.trim()))
    .filter(Boolean),
)

const isDirectVideo = computed(() => {
  const url = (urlContent.value || '').trim().toLowerCase()
  return /\.(mp4|m4v|webm|ogv|mov)(\?|#|$)/.test(url)
})

const charCount = computed(() => {
  if (isRichType.value) {
    return (activeTab.value === 'rich' ? htmlContent.value : mdContent.value).length
  }
  return urlContent.value.length
})

function looksLikeHtml(s: string): boolean {
  const t = (s || '').trim()
  if (!t.startsWith('<')) return false
  return /<(h[1-6]|p|div|ul|ol|li|pre|blockquote|img|table|code|strong|em|br|hr|section|article)[\s>]/i.test(t)
}

function syncAll(value: string) {
  if (value !== htmlContent.value) htmlContent.value = value
  if (value !== mdContent.value) mdContent.value = value
  if (value !== urlContent.value) urlContent.value = value
}

function emitIfChanged(value: string) {
  if (value === lastEmittedValue) return
  lastEmittedValue = value
  emit('update:modelValue', value)
}

// 外部值变化 -> 同步到内部
watch(
  () => props.modelValue,
  (val) => {
    const next = val ?? ''
    if (next === lastEmittedValue) return
    lastEmittedValue = next
    syncAll(next)
    if (isRichType.value && next) {
      activeTab.value = looksLikeHtml(next) ? 'rich' : 'markdown'
    }
  },
  { immediate: true },
)

// contentType 变化时，把当前内容同步到新模式对应的 ref
watch(
  () => props.contentType,
  () => {
    const current = htmlContent.value || mdContent.value || urlContent.value
    syncAll(current)
  },
)

// 内部内容变化 -> emit
watch(
  [htmlContent, activeTab],
  () => {
    if (!isRichType.value) return
    if (activeTab.value !== 'rich') return
    emitIfChanged(htmlContent.value)
  },
)

watch(
  [mdContent, activeTab],
  () => {
    if (!isRichType.value) return
    if (activeTab.value !== 'markdown') return
    emitIfChanged(mdContent.value)
  },
)

watch(activeTab, (newTab, oldTab) => {
  if (!isRichType.value) return
  // 初次设置不算切换
  if (oldTab === undefined) return
  const value = newTab === 'rich' ? htmlContent.value : mdContent.value
  emitIfChanged(value)
})

watch(urlContent, (val) => {
  if (isRichType.value) return
  emitIfChanged(val)
})

function onUrlInput(value: string | number) {
  urlContent.value = String(value ?? '')
}

function onImgError(event: Event) {
  const img = event.target as HTMLImageElement
  // 简单兜底:隐藏失效图片
  img.style.display = 'none'
}
</script>

<style scoped>
.chapter-editor {
  width: 100%;
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
.image-preview {
  margin-top: 14px;
  padding: 12px 14px;
  background: #fafafa;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}
.image-preview h3 {
  margin: 0 0 10px;
  font-size: 14px;
  color: #606266;
}
.image-preview__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 10px;
}
.image-preview__item {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  overflow: hidden;
}
.image-preview__item img {
  display: block;
  width: 100%;
  height: 120px;
  object-fit: cover;
}
.image-preview__url {
  padding: 4px 8px;
  font-size: 11px;
  color: #909399;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.video-preview {
  margin-top: 14px;
  padding: 12px 14px;
  background: #fafafa;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}
.video-preview h3 {
  margin: 0 0 10px;
  font-size: 14px;
  color: #606266;
}
.video-preview video,
.video-preview iframe {
  display: block;
  width: 100%;
  max-height: 480px;
  background: #000;
  border: 0;
  border-radius: 4px;
}
.status-bar {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
}
.status-bar__sep {
  color: #dcdfe6;
}
</style>
