<template>
  <div class="chapter-editor">
    <!-- 顶部工具条:内容类型(仅作展示)+ 全屏按钮 -->
    <div class="chapter-editor__toolbar">
      <span class="chapter-editor__type">
        <template v-if="isRichType">富文本 / Markdown</template>
        <template v-else-if="contentType === 'IMAGE'">图片</template>
        <template v-else-if="contentType === 'VIDEO'">视频</template>
        <template v-else>{{ contentTypeLabel }}</template>
      </span>
      <el-button
        size="small"
        :icon="FullScreen"
        class="chapter-editor__fullscreen-btn"
        @click="openFullscreen"
      >
        全屏编辑
      </el-button>
    </div>

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
            media-purpose="BOOK_CONTENT"
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
      <details class="image-source-panel" :open="!imageUrls.length">
        <summary>源地址</summary>
        <el-input
          :model-value="imageSourceContent"
          type="textarea"
          :rows="8"
          placeholder="每行一个图片地址，或用逗号/分号分隔"
          @update:model-value="onUrlInput"
        />
      </details>
      <div v-if="imageUrls.length" class="image-preview">
        <h3>图片预览（{{ visibleImageCount }} / {{ imageUrls.length }}）</h3>
        <div class="image-preview__scroller" @scroll="onImagePreviewScroll">
          <figure
            v-for="(url, idx) in previewImageUrls"
            :key="`${url}-${idx}`"
            class="image-preview__page"
          >
            <img
              :src="url"
              :alt="`第${idx + 1}页`"
              loading="lazy"
              decoding="async"
              @error="onImgError($event)"
            >
          </figure>
          <div v-if="hasMorePreviewImages" class="image-preview__load-more">
            向下滚动加载更多
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

    <!-- 全屏编辑面板:用 Teleport 到 body,确保覆盖父级 el-tabs/表单,
         右上角"退出全屏"按钮 + Esc 都可关闭 -->
    <EditorFullscreenPanel
      v-model="fullscreen"
      :title="fullscreenTitle"
      :top-offset="'2vh'"
      :bottom-offset="'2vh'"
      :side-offset="'2vw'"
    >
      <el-tabs
        v-if="isRichType"
        v-model="activeTab"
        type="card"
        class="content-tabs content-tabs--fullscreen"
      >
        <el-tab-pane label="富文本编辑" name="rich">
          <ClientOnly>
            <EditorRichTextEditor
              v-model="htmlContent"
              :height="fullscreenHeight"
              media-purpose="BOOK_CONTENT"
            />
            <template #fallback>
              <el-skeleton :rows="20" animated />
            </template>
          </ClientOnly>
        </el-tab-pane>
        <el-tab-pane label="Markdown 编辑" name="markdown">
          <ClientOnly>
            <EditorMarkdownEditor
              v-model="mdContent"
              :height="fullscreenHeight"
            />
            <template #fallback>
              <el-skeleton :rows="20" animated />
            </template>
          </ClientOnly>
        </el-tab-pane>
      </el-tabs>

      <template v-else-if="contentType === 'IMAGE'">
        <details class="image-source-panel" :open="!imageUrls.length">
          <summary>源地址</summary>
          <el-input
            :model-value="imageSourceContent"
            type="textarea"
            :rows="14"
            placeholder="每行一个图片地址，或用逗号/分号分隔"
            @update:model-value="onUrlInput"
          />
        </details>
        <div v-if="imageUrls.length" class="image-preview image-preview--fullscreen">
          <h3>图片预览（{{ visibleImageCount }} / {{ imageUrls.length }}）</h3>
          <div class="image-preview__scroller" @scroll="onImagePreviewScroll">
            <figure
              v-for="(url, idx) in previewImageUrls"
              :key="`fs-${url}-${idx}`"
              class="image-preview__page"
            >
              <img
                :src="url"
                :alt="`第${idx + 1}页`"
                loading="lazy"
                decoding="async"
                @error="onImgError($event)"
              >
            </figure>
            <div v-if="hasMorePreviewImages" class="image-preview__load-more">
              向下滚动加载更多
            </div>
          </div>
        </div>
        <el-empty v-else description="还没有图片地址" />
      </template>

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
    </EditorFullscreenPanel>
  </div>
</template>

<script setup lang="ts">
import { FullScreen } from '@element-plus/icons-vue'
import { normalizeBackendUrl } from '~/composables/useAvatar'
import type { BookContentType } from '~/services/user-book-api'

type EditorTab = 'rich' | 'markdown'

interface Props {
  modelValue?: string
  contentType?: BookContentType
  height?: string
  /** 是否显示底部状态栏 */
  showStatus?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  contentType: 'TEXT',
  height: '600px',
  showStatus: true,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const htmlContent = ref<string>('')
const mdContent = ref<string>('')
const urlContent = ref<string>('')
const activeTab = ref<EditorTab>('rich')
const IMAGE_PREVIEW_BATCH_SIZE = 8
const IMAGE_PREVIEW_LOAD_OFFSET = 480
const visibleImageCount = ref(IMAGE_PREVIEW_BATCH_SIZE)

// 全屏编辑面板开关
const fullscreen = ref(false)
// 全屏下编辑器高度：撑满面板剩余空间
const fullscreenHeight = 'calc(100vh - 22vh)'
const fullscreenTitle = computed(() => {
  if (isRichType.value) {
    return `全屏编辑 - ${activeTab.value === 'rich' ? '富文本' : 'Markdown'}`
  }
  return `全屏编辑 - ${contentTypeLabel.value}`
})

function openFullscreen() {
  fullscreen.value = true
}

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

const imageUrls = computed(() =>
  imageSourceContent.value
    .split(/[,;\n]/)
    .map(item => normalizeBackendUrl(item.trim()))
    .filter(Boolean),
)

const imageSourceContent = computed(() => {
  const content = decodeHtmlEntities(urlContent.value || '')
  if (!looksLikeHtml(content) || typeof DOMParser === 'undefined') return content
  const document = new DOMParser().parseFromString(content, 'text/html')
  const urls = [...document.querySelectorAll<HTMLImageElement>('img')]
    .map(img => img.getAttribute('src') || '')
    .filter(Boolean)
  return urls.join('\n')
})

const previewImageUrls = computed(() => imageUrls.value.slice(0, visibleImageCount.value))
const hasMorePreviewImages = computed(() => visibleImageCount.value < imageUrls.value.length)

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

function decodeHtmlEntities(value: string): string {
  if (!value || typeof document === 'undefined') return value
  const textarea = document.createElement('textarea')
  textarea.innerHTML = value
  return textarea.value
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
    resetImagePreview()
  },
)

watch(
  imageUrls,
  () => resetImagePreview(),
  { immediate: true },
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
  emitIfChanged(props.contentType === 'IMAGE' ? imageUrlsToHtml(val) : val)
})

function onUrlInput(value: string | number) {
  urlContent.value = String(value ?? '')
}

function resetImagePreview() {
  visibleImageCount.value = Math.min(IMAGE_PREVIEW_BATCH_SIZE, imageUrls.value.length)
}

function loadMorePreviewImages() {
  if (!hasMorePreviewImages.value) return
  visibleImageCount.value = Math.min(
    visibleImageCount.value + IMAGE_PREVIEW_BATCH_SIZE,
    imageUrls.value.length,
  )
}

function onImagePreviewScroll(event: Event) {
  const scroller = event.currentTarget as HTMLElement
  const distanceToBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight
  if (distanceToBottom <= IMAGE_PREVIEW_LOAD_OFFSET) loadMorePreviewImages()
}

function imageUrlsToHtml(value: string): string {
  const urls = (value || '')
    .split(/[,;\n]/)
    .map(item => normalizeBackendUrl(item.trim()))
    .filter(Boolean)
  return urls
    .map((url, index) =>
      `<p><img src="${escapeHtml(url)}" alt="第${index + 1}页" loading="lazy" /></p>`,
    )
    .join('')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
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
.chapter-editor__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}
.chapter-editor__type {
  font-size: 12px;
  color: #909399;
}
.chapter-editor__fullscreen-btn {
  margin-left: auto;
}
.content-tabs {
  width: 100%;
}
/* 全屏面板里的 tabs:占满面板高度 */
.content-tabs--fullscreen {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
}
.content-tabs--fullscreen :deep(.el-tabs__content) {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.content-tabs--fullscreen :deep(.el-tab-pane) {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.content-tabs--fullscreen :deep(.el-tab-pane > .w-e-text-container),
.content-tabs--fullscreen :deep(.md-editor) {
  flex: 1 1 auto;
  min-height: 0;
}
.content-tabs :deep(.el-tabs__header) {
  margin-bottom: 8px;
}
.content-tabs :deep(.el-tabs__content) {
  padding: 0;
}

/* =========================================================
   IMAGE 预览容器:固定 max-height + overflow-y:auto,
   这是浏览器原生 <img loading="lazy"> 真正分批加载的前提。
   容器高度受限 + 可滚动,浏览器才能识别"可滚动容器",超出视口
   的图片会被推迟加载。否则容器 = 内容总高,所有图片都在视口内
   → 一次全加载。
   ========================================================= */
.image-preview {
  display: flex;
  flex-direction: column;
  margin-top: 14px;
  background: #f5f7fa;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  overflow: hidden;
}
.image-preview h3 {
  flex: 0 0 auto;
  margin: 0;
  padding: 10px 14px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
  font-size: 14px;
  color: #606266;
}
.image-preview__scroller {
  display: flex;
  flex-direction: column;
  gap: 12px;
  /* 关键:受限制高度 + overflow 才能让浏览器把"外部"图片判定为非视口内 */
  max-height: min(70vh, 820px);
  min-height: 200px;
  padding: 16px;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.image-preview__page {
  display: flex;
  justify-content: center;
  width: min(100%, 900px);
  margin: 0 auto;
  background: #fff;
}
.image-preview__page img {
  display: block;
  width: auto;
  max-width: 100%;
  height: auto;
}
.image-preview__load-more {
  padding: 6px 0 2px;
  color: #909399;
  font-size: 12px;
  text-align: center;
}

/* 全屏模式:scroller 撑满面板剩余空间 */
.image-preview--fullscreen {
  flex: 1 1 auto;
  min-height: 0;
}
.image-preview--fullscreen .image-preview__scroller {
  flex: 1 1 auto;
  min-height: 0;
  max-height: none;
}

.image-source-panel {
  margin-bottom: 12px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  overflow: hidden;
}
.image-source-panel summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 12px;
  color: #606266;
  font-size: 13px;
  cursor: pointer;
  list-style: none;
}
.image-source-panel summary::-webkit-details-marker {
  display: none;
}
.image-source-panel summary::after {
  content: "展开";
  color: #909399;
  font-size: 12px;
}
.image-source-panel[open] > summary {
  border-bottom: 1px solid #ebeef5;
}
.image-source-panel[open] summary::after {
  content: "收起";
}
.image-source-panel :deep(.el-textarea__inner) {
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

.video-preview {
  margin-top: 14px;
  padding: 12px 14px;
  background: #fafbfc;
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
  emitIfChanged(props.contentType === 'IMAGE' ? imageUrlsToHtml(val) : val)
})

function onUrlInput(value: string | number) {
  urlContent.value = String(value ?? '')
}

function imageUrlsToHtml(value: string): string {
  const urls = (value || '')
    .split(/[,;\n]/)
    .map(item => item.trim())
    .filter(Boolean)
  return urls
    .map((url, index) => {
      // 私有 URL 用 ObjectURL 替换 src,避免 <img> 直接请求私域 401
      const resolvedSrc = resolveImageUrl(url) || escapeHtml(normalizeBackendUrl(url))
      return `<p><img src="${escapeHtml(resolvedSrc)}" alt="第${index + 1}页" loading="lazy" /></p>`
    })
    .join('')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
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
.chapter-editor__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}
.chapter-editor__type {
  font-size: 12px;
  color: #909399;
}
.chapter-editor__fullscreen-btn {
  margin-left: auto;
}
.content-tabs {
  width: 100%;
}
/* 全屏面板里的 tabs:占满面板高度 */
.content-tabs--fullscreen {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
}
.content-tabs--fullscreen :deep(.el-tabs__content) {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.content-tabs--fullscreen :deep(.el-tab-pane) {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.content-tabs--fullscreen :deep(.el-tab-pane > .w-e-text-container),
.content-tabs--fullscreen :deep(.md-editor) {
  flex: 1 1 auto;
  min-height: 0;
}
.content-tabs :deep(.el-tabs__header) {
  margin-bottom: 8px;
}
.content-tabs :deep(.el-tabs__content) {
  padding: 0;
}
.image-source-panel {
  margin-bottom: 12px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  overflow: hidden;
}
.image-source-panel summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 12px;
  color: #606266;
  font-size: 13px;
  cursor: pointer;
  list-style: none;
}
.image-source-panel summary::-webkit-details-marker {
  display: none;
}
.image-source-panel summary::after {
  content: "展开";
  color: #909399;
  font-size: 12px;
}
.image-source-panel[open] summary {
  border-bottom: 1px solid #ebeef5;
}
.image-source-panel[open] summary::after {
  content: "收起";
}
.image-source-panel :deep(.el-textarea__inner) {
  border: 0;
  border-radius: 0;
  box-shadow: none;
}
.image-preview {
  display: flex;
  flex-direction: column;
  margin-top: 14px;
  background: #f5f7fa;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  overflow: hidden;
}
.image-preview h3 {
  flex: 0 0 auto;
  margin: 0;
  padding: 10px 14px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
  font-size: 14px;
  color: #606266;
}
.image-preview__scroller {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: min(70vh, 820px);
  padding: 16px;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.image-preview__page {
  display: flex;
  justify-content: center;
  width: min(100%, 900px);
  margin: 0 auto;
  background: #fff;
}
.image-preview__page img {
  display: block;
  width: auto;
  max-width: 100%;
  height: auto;
}
/* 私域图片 ObjectURL 解析中,展示占位 */
.image-preview__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 120px;
  color: #909399;
  font-size: 13px;
  background: #fafafa;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
  padding: 12px 16px;
}
.image-preview--fullscreen {
  flex: 1 1 auto;
  min-height: 0;
}
.image-preview--fullscreen .image-preview__scroller {
  flex: 1 1 auto;
  min-height: 0;
  max-height: none;
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
