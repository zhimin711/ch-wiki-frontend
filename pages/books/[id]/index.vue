<template>
  <div class="book-detail-page" v-if="book">
    <!-- 顶部工具条 -->
    <div class="book-toolbar">
      <NuxtLink to="/books" class="toolbar-link">
        <el-icon><ArrowLeft /></el-icon>
        <span>返回藏书阁</span>
      </NuxtLink>
    </div>

    <!-- 书籍信息区 -->
    <header class="book-header">
      <h1 class="book-title">{{ book.name || book.title }}</h1>
      <div class="book-meta" v-if="book.author || totalChapterCount">
        <span class="meta-item" v-if="book.author">
          <el-icon><User /></el-icon>
          <span>{{ book.author }}</span>
        </span>
        <span class="meta-dot" v-if="book.author && totalChapterCount">·</span>
        <span class="meta-item" v-if="totalChapterCount">
          <el-icon><Document /></el-icon>
          <span>共 {{ totalChapterCount }} 章</span>
        </span>
      </div>
      <p class="book-summary" v-if="book.summary">{{ book.summary }}</p>
    </header>

    <!-- 章节目录 -->
    <section class="chapter-list" v-if="book.chapters?.length">
      <div class="chapter-list-header">
        <h2 class="chapter-list-title">章节目录</h2>
        <span class="chapter-list-subtitle">按章节顺序排列</span>
      </div>
      <ul class="chapter-grid">
        <li
          v-for="ch in book.chapters"
          :key="ch.id"
          class="chapter-cell"
          :class="{ 'chapter-cell--has-sub': ch.children?.length }"
        >
          <NuxtLink
            :to="`/books/${book.id}/chapters/${ch.id}`"
            class="chapter-link"
          >
            <span class="chapter-number">{{ ch.number }}</span>
            <span class="chapter-name">{{ ch.name }}</span>
          </NuxtLink>

          <!-- 有子章节时,把子网格作为该 li 的兄弟元素而不是子 ul,
               并把"父链接+子网格"整体作为一个 grid item 占满整行 (3 列),
               子网格再用内部 grid 平铺到 3 列上,与同层其他章对齐 -->
          <ul v-if="ch.children?.length" class="chapter-grid chapter-grid--sub">
            <li v-for="sub in ch.children" :key="sub.id" class="chapter-cell">
              <NuxtLink
                :to="`/books/${book.id}/chapters/${sub.id}`"
                class="chapter-link chapter-link--sub"
              >
                <span class="chapter-number">{{ sub.number }}</span>
                <span class="chapter-name">{{ sub.name }}</span>
              </NuxtLink>
            </li>
          </ul>
        </li>
      </ul>
    </section>
  </div>
  <el-empty v-else description="书籍不存在" />
</template>

<script setup lang="ts">
import { ArrowLeft, ArrowRight, Document, User } from '@element-plus/icons-vue'
import type { PublicBookChapterDTO, PublicBookDetailDTO } from '~/services/public-api'

const route = useRoute()
const { getBookChapters } = usePublicApi()

const id = computed(() => Number(route.params.id))
const { data: result } = await useAsyncData(`book-${id.value}`, () => getBookChapters(id.value))
const book = computed<PublicBookDetailDTO | null>(() => result.value ?? null)

// 递归统计总章节数（含子章节）
function countChapters(chapters?: PublicBookChapterDTO[]): number {
  if (!chapters?.length) return 0
  return chapters.reduce((sum, ch) => sum + 1 + countChapters(ch.children), 0)
}

const totalChapterCount = computed(() => countChapters(book.value?.chapters))

useHead({ title: () => book.value ? `${book.value.name || book.value.title} - ch-wiki` : '书籍 - ch-wiki' })
</script>

<style scoped>
/* ============ 整体卡片 ============ */
.book-detail-page {
  max-width: 820px;
  margin: 24px auto;
  background: var(--color-bg-white);
  border-radius: 8px;
  box-shadow: var(--shadow-sm);
  padding: 32px 40px 40px;
}

/* ============ 顶部工具条 ============ */
.book-toolbar {
  display: flex;
  align-items: center;
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
  padding: 6px 10px;
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

/* ============ 书籍信息区 ============ */
.book-header {
  text-align: center;
  padding: 0 8px;
  margin-bottom: 36px;
}
.book-title {
  font-size: 30px;
  font-weight: 700;
  line-height: 1.3;
  color: var(--color-text);
  margin: 0 0 14px;
  word-break: break-word;
}
.book-meta {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-bottom: 20px;
  color: var(--color-text-secondary);
  font-size: 14px;
}
.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.meta-item .el-icon {
  font-size: 14px;
  color: var(--color-text-placeholder);
}
.meta-dot {
  color: var(--color-text-placeholder);
}
.book-summary {
  font-size: 15px;
  line-height: 1.85;
  color: var(--color-text-secondary);
  margin: 0;
  text-align: left;
  text-indent: 2em;
  background: #fafbfc;
  border-left: 3px solid var(--color-primary-light);
  padding: 14px 18px;
  border-radius: 4px;
}

/* ============ 章节目录 ============ */
.chapter-list {
  margin-top: 8px;
}
.chapter-list-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 14px;
  margin-bottom: 4px;
  border-bottom: 1px solid var(--color-border);
}
.chapter-list-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
  position: relative;
  padding-left: 12px;
}
.chapter-list-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 16px;
  background: var(--color-primary);
  border-radius: 2px;
}
.chapter-list-subtitle {
  font-size: 13px;
  color: var(--color-text-placeholder);
}

/* 章节列表：每行最多 3 章（窗口宽时 3 列，中等 2 列，手机 1 列） */
.chapter-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px 12px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.chapter-cell {
  margin: 0;
  padding: 0;
  min-width: 0;
}

/* 有子章节的父 cell:占满整行 3 列,
   内部用纵向布局堆叠"父链接 + 子网格",
   避免子章节被压到第 1 列下面、导致 2/3 列空着 */
.chapter-cell--has-sub {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* 二级章节网格：缩进 + 左边竖线，与父章节 3 列对齐 */
.chapter-grid--sub {
  margin: 0;
  padding: 0 0 0 14px;
  border-left: 1px solid var(--color-border);
  /* 不在这里设置列数:让内部 grid 与主网格列宽一致,
     但去掉列表默认样式 */
  list-style: none;
  display: grid;
  /* 在父章节自己的网格 cell 内再平铺,使用父 cell 的可用宽度 */
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px 12px;
}

/* 章节项：紧凑内联布局（章节号 + 章节名） */
.chapter-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: #fff;
  color: var(--color-text);
  text-decoration: none;
  min-height: 44px;
  line-height: 1.4;
  transition: background 0.2s, color 0.2s, border-color 0.2s, box-shadow 0.2s;
}
.chapter-link:hover {
  background: rgba(64, 158, 255, 0.06);
  color: var(--color-primary);
  border-color: var(--color-primary-light);
  box-shadow: 0 1px 4px rgba(64, 158, 255, 0.12);
}

/* 二级章节项：更小字号 + 更紧凑 */
.chapter-link--sub {
  font-size: 13px;
  color: var(--color-text-secondary);
  padding: 8px 10px;
  min-height: 36px;
  background: #fafbfc;
}
.chapter-link--sub:hover {
  color: var(--color-primary);
  background: rgba(64, 158, 255, 0.06);
}

/* 章节号（小灰色，可截断） */
.chapter-number {
  flex-shrink: 1;
  min-width: 0;
  max-width: 90px;
  font-size: 12px;
  color: var(--color-text-placeholder);
  font-family: 'SF Mono', Consolas, Menlo, monospace;
  letter-spacing: 0.3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 章节名（占满剩余空间 + 截断） */
.chapter-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
}

/* ============ 响应式 ============ */
@media (max-width: 768px) {
  .book-detail-page {
    margin: 0;
    border-radius: 0;
    padding: 20px 16px 28px;
    box-shadow: none;
  }
  .book-title {
    font-size: 24px;
  }
  .book-summary {
    font-size: 14px;
    padding: 12px 14px;
  }
  .chapter-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px 10px;
  }
  .chapter-grid--sub {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding-left: 10px;
  }
  .chapter-link {
    padding: 8px 10px;
    min-height: 38px;
  }
  .chapter-name {
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .chapter-grid {
    grid-template-columns: 1fr;
  }
  .chapter-grid--sub {
    grid-template-columns: 1fr;
  }
}
</style>
