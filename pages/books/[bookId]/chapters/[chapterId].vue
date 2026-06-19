<template>
  <article class="chapter-page" v-if="chapter" :style="styleVars">
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
      <div v-if="chapter.content" class="chapter-content" v-html="chapter.content" />
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

    <!-- 浮动阅读设置入口(右下角) -->
    <el-popover
      v-model:visible="settingsOpen"
      placement="left-end"
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
import { ArrowLeft, ArrowRight, Check, Setting } from '@element-plus/icons-vue'
import type { PublicBookChapterDTO } from '~/services/public-api'

const route = useRoute()
const { getChapterContent } = usePublicApi()
const { settings, styleVars, update, reset, options } = useReaderSettings()
const settingsOpen = ref(false)

const bookId = computed(() => Number(route.params.bookId))
const chapterId = computed(() => route.params.chapterId as string)
const { data: result } = await useAsyncData(
  `chapter-${bookId.value}-${chapterId.value}`,
  () => getChapterContent(bookId.value, chapterId.value),
)
const chapter = computed<PublicBookChapterDTO | null>(() => result.value ?? null)

useHead({ title: () => chapter.value ? `${chapter.value.number} ${chapter.value.name} - ch-wiki` : '章节 - ch-wiki' })
</script>

<style scoped>
/* ============ 整体卡片 ============ */
.chapter-page {
  max-width: var(--reader-width, 820px);
  width: 100%;
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
  margin-bottom: 16px;
}
.chapter-content {
  font-size: var(--reader-font-size, 17px);
  line-height: var(--reader-line-height, 2);
  font-family: var(--reader-font-family, inherit);
  color: inherit;
}
.chapter-content :deep(p) {
  margin-bottom: 18px;
  text-indent: 2em;
}
.chapter-content :deep(p:last-child) {
  margin-bottom: 0;
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
    padding: 20px 16px 28px;
    border-radius: 0;
  }
  .chapter-title {
    font-size: 22px;
  }
  .chapter-content {
    font-size: 16px;
    line-height: 1.9;
  }
  .toolbar-prev-next .toolbar-link {
    padding: 4px 4px;
  }
  .reader-settings-fab {
    right: 12px;
    bottom: 12px;
  }
}

/* ============ 浮动设置按钮 ============ */
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
</style>

<!-- 阅读设置面板(popover 内容,需要全局样式) -->
<style>
.reader-settings-popover {
  padding: 4px !important;
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
</style>
