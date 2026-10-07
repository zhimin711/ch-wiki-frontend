<template>
  <article
    v-if="chapter"
    class="chapter-page"
    :class="{ 'chapter-page--image': isImageChapter && imagePages.length }"
    :style="styleVars"
  >
    <!-- 顶部工具条：返回目录 + 上下章快捷入口 -->
    <div class="chapter-toolbar">
      <NuxtLink :to="`/books/${chapter.bookId}`" class="toolbar-link toolbar-link--back">
        <el-icon><ArrowLeft /></el-icon>
        <span>返回目录</span>
      </NuxtLink>

      <div class="toolbar-prev-next">
        <NuxtLink
          v-if="chapter.pre"
          :to="`/books/${chapter.bookId}/chapters/${chapter.pre}`"
          class="toolbar-link"
        >
          <el-icon><ArrowLeft /></el-icon>
          <span>上一章</span>
        </NuxtLink>
        <NuxtLink
          v-if="chapter.next"
          :to="`/books/${chapter.bookId}/chapters/${chapter.next}`"
          class="toolbar-link"
        >
          <span>下一章</span>
          <el-icon><ArrowRight /></el-icon>
        </NuxtLink>
      </div>
    </div>

    <!-- 章节标题区：编号与标题合并为单行 -->
    <header class="chapter-header">
      <h1 class="chapter-title">
        <span v-if="chapter.number" class="chapter-number">{{ chapter.number }}</span>
        <span class="chapter-name">{{ chapter.name }}</span>
      </h1>
    </header>

    <!-- 章节正文 -->
    <section class="chapter-body">
      <div
        v-if="isImageChapter && imagePages.length"
        ref="imageReaderRef"
        class="chapter-image-reader"
      >
        <figure
          v-for="(page, index) in visibleImagePages"
          :key="`${page.src}-${index}`"
          class="chapter-image-page"
        >
          <img
            :src="page.src"
            :alt="page.alt || `第${index + 1}页`"
            loading="lazy"
            decoding="async"
            @load="markImageSettled(index)"
            @error="markImageSettled(index)"
          >
        </figure>
        <div
          v-if="hasMoreImages"
          ref="imageLoadMoreRef"
          class="chapter-image-sentinel"
          aria-hidden="true"
        />
      </div>
      <div v-else-if="chapter.content" class="chapter-content" v-html="chapter.content" />
      <el-empty v-else description="暂无内容" />
    </section>

    <!-- 底部导航：左上一章 / 右下一章 -->
    <nav class="chapter-nav-bottom">
      <NuxtLink
        v-if="chapter.pre"
        :to="`/books/${chapter.bookId}/chapters/${chapter.pre}`"
        class="nav-bottom-link nav-bottom-link--prev"
      >
        <el-icon><ArrowLeft /></el-icon>
        <span>上一章</span>
      </NuxtLink>
      <span v-else class="nav-bottom-placeholder" />

      <NuxtLink
        v-if="chapter.next"
        :to="`/books/${chapter.bookId}/chapters/${chapter.next}`"
        class="nav-bottom-link nav-bottom-link--next"
      >
        <span>下一章</span>
        <el-icon><ArrowRight /></el-icon>
      </NuxtLink>
      <span v-else class="nav-bottom-placeholder" />
    </nav>

    <el-backtop
      class="reader-backtop"
      :class="{ 'is-dark': settings.background === 'dark' }"
      :right="24"
      :bottom="80"
      :visibility-height="320"
      title="回到顶部"
      aria-label="回到顶部"
    >
      <el-icon><Top /></el-icon>
    </el-backtop>

    <!-- 浮动阅读设置入口(右下角) -->
    <el-popover
      v-model:visible="settingsOpen"
      placement="top-end"
      :width="320"
      trigger="click"
      popper-class="reader-settings-popover"
    >
      <template #reference>
        <button
          type="button"
          class="reader-settings-fab"
          :class="{ 'is-dark': settings.background === 'dark' }"
          title="阅读设置"
        >
          <el-icon><Setting /></el-icon>
        </button>
      </template>

      <div class="reader-settings">
        <header class="reader-settings__header">
          <span class="reader-settings__title">阅读设置</span>
          <el-button link size="small" @click="reset">恢复默认</el-button>
        </header>

        <div class="reader-settings__group">
          <label class="reader-settings__label">背景</label>
          <div class="reader-settings__swatches">
            <button
              v-for="opt in options.background"
              :key="opt.value"
              type="button"
              class="reader-settings__swatch"
              :class="{ 'is-active': settings.background === opt.value }"
              :style="{ background: opt.preview }"
              :title="opt.label"
              :aria-label="opt.label"
              @click="update('background', opt.value)"
            >
              <el-icon v-if="settings.background === opt.value"><Check /></el-icon>
            </button>
          </div>
        </div>

        <div class="reader-settings__group">
          <label class="reader-settings__label">字号</label>
          <el-radio-group :model-value="settings.fontSize" size="small" @change="(v: any) => update('fontSize', v)">
            <el-radio-button v-for="opt in options.fontSize" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </el-radio-button>
          </el-radio-group>
        </div>

        <div class="reader-settings__group">
          <label class="reader-settings__label">字体</label>
          <el-radio-group :model-value="settings.fontFamily" size="small" @change="(v: any) => update('fontFamily', v)">
            <el-radio-button v-for="opt in options.fontFamily" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </el-radio-button>
          </el-radio-group>
        </div>

        <div class="reader-settings__group">
          <label class="reader-settings__label">行高</label>
          <el-radio-group :model-value="settings.lineHeight" size="small" @change="(v: any) => update('lineHeight', v)">
            <el-radio-button v-for="opt in options.lineHeight" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </el-radio-button>
          </el-radio-group>
        </div>

        <div class="reader-settings__group">
          <label class="reader-settings__label">页宽</label>
          <el-radio-group :model-value="settings.width" size="small" @change="(v: any) => update('width', v)">
            <el-radio-button v-for="opt in options.width" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </el-radio-button>
          </el-radio-group>
        </div>
      </div>
    </el-popover>
  </article>
  <el-empty v-else description="章节不存在" />
</template>

<script setup lang="ts">
import { ArrowLeft, ArrowRight, Check, Setting, Top } from '@element-plus/icons-vue'
import type { PublicBookChapterDTO } from '~/services/public-api'
import { normalizeBackendUrl } from '~/composables/useAvatar'

const route = useRoute()
const { getChapterContent } = usePublicApi()
const { settings, styleVars, update, reset, options } = useReaderSettings()
const settingsOpen = ref(false)
const IMAGE_BATCH_SIZE = 6
const IMAGE_LOAD_ROOT_MARGIN = '400px 0px'

const bookId = computed(() => Number(route.params.bookId))
const chapterId = computed(() => route.params.chapterId as string)
const { data: result } = await useAsyncData(
  `chapter-${bookId.value}-${chapterId.value}`,
  () => getChapterContent(bookId.value, chapterId.value),
)
const chapter = computed<PublicBookChapterDTO | null>(() => result.value ?? null)
const imageReaderRef = ref<HTMLElement | null>(null)
const imageLoadMoreRef = ref<HTMLElement | null>(null)
const visibleImageCount = ref(IMAGE_BATCH_SIZE)
const settledImageIndexes = ref<Set<number>>(new Set())
let imageObserver: IntersectionObserver | null = null

useHead({ title: () => chapter.value ? `${chapter.value.number} ${chapter.value.name} - ch-wiki` : '章节 - ch-wiki' })

interface ImagePage {
  src: string
  alt: string
}

const imagePages = computed<ImagePage[]>(() => extractImagePages(chapter.value?.content || ''))
const isImageChapter = computed(() => {
  if (!chapter.value?.content) return false
  if (chapter.value.contentType === 'IMAGE') return true
  return imagePages.value.length > 0 && imageOnlyContent(chapter.value.content)
})
const visibleImagePages = computed(() => imagePages.value.slice(0, visibleImageCount.value))
const hasMoreImages = computed(() => visibleImageCount.value < imagePages.value.length)
const visibleImagesSettled = computed(() => {
  const count = Math.min(visibleImageCount.value, imagePages.value.length)
  if (count === 0) return false
  for (let index = 0; index < count; index += 1) {
    if (!settledImageIndexes.value.has(index)) return false
  }
  return true
})

watch(
  () => chapter.value?.content,
  () => resetImageReader(),
)

watch(imageLoadMoreRef, () => {
  syncSettledImages()
  observeImageSentinel()
})
watch([hasMoreImages, visibleImagesSettled], () => observeImageSentinel())
watch(visibleImageCount, () => nextTick(() => syncSettledImages()))

onMounted(() => syncSettledImages())
onBeforeUnmount(() => disconnectImageObserver())

function resetImageReader() {
  disconnectImageObserver()
  settledImageIndexes.value = new Set()
  visibleImageCount.value = Math.min(IMAGE_BATCH_SIZE, imagePages.value.length || IMAGE_BATCH_SIZE)
  nextTick(() => syncSettledImages())
}

function loadMoreImages() {
  if (!hasMoreImages.value) return
  disconnectImageObserver()
  visibleImageCount.value = Math.min(
    visibleImageCount.value + IMAGE_BATCH_SIZE,
    imagePages.value.length,
  )
}

function markImageSettled(index: number) {
  if (settledImageIndexes.value.has(index)) return
  const next = new Set(settledImageIndexes.value)
  next.add(index)
  settledImageIndexes.value = next
}

function syncSettledImages() {
  const images = imageReaderRef.value?.querySelectorAll('img')
  if (!images?.length) return
  const next = new Set(settledImageIndexes.value)
  images.forEach((image, index) => {
    if (image.complete) next.add(index)
  })
  if (next.size !== settledImageIndexes.value.size) {
    settledImageIndexes.value = next
  }
}

function observeImageSentinel() {
  if (!import.meta.client) return
  disconnectImageObserver()
  if (!hasMoreImages.value || !visibleImagesSettled.value || !imageLoadMoreRef.value) return
  imageObserver = new IntersectionObserver((entries) => {
    if (entries.some(entry => entry.isIntersecting)) {
      loadMoreImages()
    }
  }, { root: null, rootMargin: IMAGE_LOAD_ROOT_MARGIN })
  imageObserver.observe(imageLoadMoreRef.value)
}

function disconnectImageObserver() {
  if (!imageObserver) return
  imageObserver.disconnect()
  imageObserver = null
}

function extractImagePages(content: string): ImagePage[] {
  const pages: ImagePage[] = []
  for (const match of content.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0]
    const src = normalizeBackendUrl(decodeHtmlAttribute(readHtmlAttribute(tag, 'src')))
    if (!src) continue
    pages.push({
      src,
      alt: decodeHtmlAttribute(readHtmlAttribute(tag, 'alt')),
    })
  }
  return pages
}

function imageOnlyContent(content: string): boolean {
  const withoutImages = content
    .replace(/<img\b[^>]*>/gi, '')
    .replace(/<\/?p\b[^>]*>/gi, '')
    .replace(/<br\s*\/?>/gi, '')
    .replace(/&nbsp;/gi, '')
    .trim()
  return withoutImages.length === 0
}

function readHtmlAttribute(tag: string, name: string): string {
  const pattern = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i')
  const match = tag.match(pattern)
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? ''
}

function decodeHtmlAttribute(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}
</script>

<style scoped>
/* ============ 整体卡片 ============ */
.chapter-page {
  max-width: var(--reader-width, 820px);
  width: 100%;
  min-width: 0;
  margin: 0 auto;
  /* 背景与正文颜色由 useReaderSettings 的 --reader-bg / --reader-text 驱动 */
  background: var(--reader-bg, var(--color-bg-white));
  color: var(--reader-text, #2c3e50);
  border-radius: 8px;
  box-shadow: var(--shadow-sm);
  padding: 32px 40px 40px;
  transition: background 0.2s, color 0.2s, max-width 0.2s;
}

/* ============ 顶部工具条 ============ */
.chapter-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 20px;
  margin-bottom: 28px;
  border-bottom: 1px solid var(--color-border);
}
.toolbar-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: 14px;
  padding: 4px 8px;
  border-radius: 4px;
  transition: color 0.2s, background 0.2s;
}
.toolbar-link:hover {
  color: var(--color-primary);
  background: rgba(64, 158, 255, 0.08);
}
.toolbar-link .el-icon {
  font-size: 14px;
}
.toolbar-prev-next {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

/* ============ 章节标题区 ============ */
.chapter-header {
  text-align: center;
  margin-bottom: 36px;
  padding: 0 8px;
}
/* 编号 + 标题:同一行,字号一致,只靠颜色做层级区分
   用 · 中点作为分隔符 */
.chapter-title {
  font-size: 26px;
  font-weight: 700;
  line-height: 1.4;
  color: var(--color-text);
  word-break: break-word;
  margin: 0;
}
/* 编号:与标题同字号同字色同字重,仅靠等宽字体做"附属信息"层级 */
.chapter-number {
  font-weight: inherit;
  color: inherit;
  font-family: 'SF Mono', Consolas, Menlo, monospace;
  letter-spacing: 0.5px;
  white-space: nowrap;
  margin-right: 0.5em;
}
.chapter-name {
  /* 标题正文,自然占据剩余宽度 */
  flex: 1 1 auto;
  min-width: 0;
}

/* ============ 章节正文 ============ */
.chapter-body {
  min-width: 0;
  margin-bottom: 16px;
}
.chapter-content {
  min-width: 0;
  font-size: var(--reader-font-size, 17px);
  line-height: var(--reader-line-height, 2);
  font-family: var(--reader-font-family, inherit);
  color: inherit;
  overflow-wrap: anywhere;
  word-break: break-word;
}
.chapter-content :deep(p) {
  margin-bottom: 18px;
  text-indent: 2em;
}
.chapter-content :deep(p:last-child) {
  margin-bottom: 0;
}
.chapter-content :deep(h1),
.chapter-content :deep(h2),
.chapter-content :deep(h3),
.chapter-content :deep(h4),
.chapter-content :deep(h5),
.chapter-content :deep(h6) {
  line-height: 1.45;
  margin: 1.5em 0 0.7em;
  overflow-wrap: anywhere;
}
.chapter-content :deep(ul),
.chapter-content :deep(ol) {
  margin: 0 0 1em;
  padding-left: 1.6em;
}
.chapter-content :deep(blockquote) {
  margin: 1.4em 0;
  padding: 12px 16px;
  border-left: 4px solid var(--color-primary);
  background: rgba(64, 158, 255, 0.06);
}
.chapter-content :deep(blockquote p) {
  text-indent: 0;
}
.chapter-content :deep(img),
.chapter-content :deep(video),
.chapter-content :deep(canvas),
.chapter-content :deep(svg) {
  max-width: 100% !important;
  height: auto !important;
}
.chapter-content :deep(iframe) {
  display: block;
  width: 100% !important;
  max-width: 100% !important;
  aspect-ratio: 16 / 9;
  height: auto;
  border: 0;
}
.chapter-content :deep(table) {
  display: block;
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  border-collapse: collapse;
  -webkit-overflow-scrolling: touch;
}
.chapter-content :deep(pre) {
  max-width: 100%;
  margin: 1.4em 0;
  padding: 14px 16px;
  overflow-x: auto;
  border-radius: 6px;
  white-space: pre;
  -webkit-overflow-scrolling: touch;
}
.chapter-content :deep(code) {
  overflow-wrap: normal;
  word-break: normal;
}
.chapter-image-reader {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.chapter-image-page {
  display: flex;
  justify-content: center;
  width: 100%;
  min-height: 0;
  margin: 0;
  background: transparent;
}
.chapter-image-page img {
  display: block;
  width: 100%;
  max-width: 100%;
  height: auto;
  margin: 0;
  object-fit: contain;
}
.chapter-image-sentinel {
  width: 100%;
  height: 1px;
}

/* ============ 底部导航 ============ */
.chapter-nav-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-top: 48px;
  padding-top: 24px;
  border-top: 1px solid var(--color-border);
}
.nav-bottom-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: 14px;
  background: transparent;
  transition: all 0.2s;
  min-width: 110px;
}
.nav-bottom-link:hover {
  color: var(--color-primary);
  border-color: var(--color-primary);
  background: rgba(64, 158, 255, 0.04);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}
.nav-bottom-link--prev {
  margin-right: auto;
}
.nav-bottom-link--next {
  margin-left: auto;
}
.nav-bottom-link .el-icon {
  font-size: 14px;
}
.nav-bottom-placeholder {
  min-width: 110px;
}

/* ============ 响应式 ============ */
@media (max-width: 768px) {
  .chapter-page {
    padding: 18px 14px 32px;
    border-radius: 0;
    box-shadow: none;
  }
  .chapter-page--image {
    width: calc(100% + 24px);
    max-width: none;
    margin-right: -12px;
    margin-left: -12px;
  }
  .chapter-page--image .chapter-body {
    margin-right: -14px;
    margin-left: -14px;
  }
  .chapter-toolbar {
    gap: 8px;
    padding-bottom: 14px;
    margin-bottom: 22px;
  }
  .toolbar-link {
    min-height: 36px;
    padding: 6px;
    white-space: nowrap;
  }
  .toolbar-prev-next {
    gap: 2px;
    min-width: 0;
  }
  .chapter-title {
    font-size: 22px;
  }
  .chapter-header {
    margin-bottom: 26px;
    padding: 0;
  }
  .chapter-content {
    font-size: var(--reader-font-size, 17px);
  }
  .chapter-content :deep(h1) {
    font-size: 1.5em;
  }
  .chapter-content :deep(h2) {
    font-size: 1.3em;
  }
  .chapter-content :deep(h3) {
    font-size: 1.16em;
  }
  .chapter-content :deep(blockquote) {
    padding: 10px 12px;
  }
  .chapter-content :deep(pre) {
    margin-right: -6px;
    margin-left: -6px;
    padding: 12px;
    font-size: 13px;
  }
  .chapter-nav-bottom {
    gap: 10px;
    margin-top: 36px;
    padding-top: 18px;
  }
  .nav-bottom-link,
  .nav-bottom-placeholder {
    min-width: 0;
    width: calc(50% - 5px);
  }
  .nav-bottom-link {
    min-height: 42px;
    padding: 8px 12px;
  }
  .nav-bottom-link--next {
    justify-content: flex-end;
  }
  .toolbar-prev-next .toolbar-link {
    padding-right: 4px;
    padding-left: 4px;
  }
}

/* ============ 浮动设置按钮 ============ */
.reader-backtop {
  width: 44px;
  height: 44px;
  color: var(--color-text-secondary);
  background: #fff;
  border: 1px solid var(--color-border);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
  transition: color 0.2s, border-color 0.2s, transform 0.2s, box-shadow 0.2s;
}
.reader-backtop:hover {
  color: var(--color-primary);
  border-color: var(--color-primary);
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(64, 158, 255, 0.25);
}
.reader-backtop .el-icon {
  font-size: 18px;
}
.reader-backtop.is-dark {
  color: #cfd2d6;
  background: #2a2d31;
  border-color: #3a3d42;
}
.reader-settings-fab {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid var(--color-border);
  background: #fff;
  color: var(--color-text-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
  z-index: 50;
  transition: all 0.2s;
}
.reader-settings-fab:hover {
  color: var(--color-primary);
  border-color: var(--color-primary);
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(64, 158, 255, 0.25);
}
.reader-settings-fab .el-icon {
  font-size: 18px;
}
.reader-settings-fab.is-dark {
  background: #2a2d31;
  color: #cfd2d6;
  border-color: #3a3d42;
}

@media (max-width: 768px) {
  .reader-backtop {
    right: max(12px, env(safe-area-inset-right)) !important;
    bottom: calc(66px + env(safe-area-inset-bottom)) !important;
    width: 42px;
    height: 42px;
  }
  .reader-settings-fab {
    right: max(12px, env(safe-area-inset-right));
    bottom: calc(12px + env(safe-area-inset-bottom));
    width: 42px;
    height: 42px;
  }
}
</style>

<!-- 阅读设置面板(popover 内容,需要全局样式) -->
<style>
.reader-settings-popover {
  padding: 4px !important;
  max-width: calc(100vw - 24px) !important;
}
.reader-settings {
  display: flex;
  flex-direction: column;
  gap: 14px;
  font-size: 13px;
}
.reader-settings__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 4px;
  border-bottom: 1px solid #ebeef5;
}
.reader-settings__title {
  font-weight: 600;
  color: #303133;
}
.reader-settings__group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.reader-settings__label {
  color: #909399;
  font-size: 12px;
}
.reader-settings__swatches {
  display: flex;
  gap: 10px;
}
.reader-settings__swatch {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid #dcdfe6;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #409eff;
  font-size: 16px;
  padding: 0;
  transition: border-color 0.2s, transform 0.2s;
}
.reader-settings__swatch:hover {
  border-color: #409eff;
  transform: scale(1.06);
}
.reader-settings__swatch.is-active {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}
.reader-settings .el-radio-group {
  display: flex;
  width: 100%;
}
.reader-settings .el-radio-button {
  flex: 1;
  min-width: 0;
}
.reader-settings .el-radio-button__inner {
  width: 100%;
  padding-right: 8px;
  padding-left: 8px;
}
</style>
