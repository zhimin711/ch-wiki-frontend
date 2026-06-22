<template>
  <ul class="chapter-tree" :class="{ 'chapter-tree--root': depth === 0 }">
    <li v-for="item in chapters" :key="item.id" class="chapter-tree__item">
      <button
          v-if="selectable"
          type="button"
          class="chapter-row chapter-row--button"
          :class="{
          'chapter-row--selected': item.id === selectedId,
          'chapter-row--catalog': isCatalog(item),
        }"
          @click="$emit('select', item)"
      >
        <span class="chapter-row__icon">
          <el-icon><FolderOpened v-if="isCatalog(item)" /><Document v-else /></el-icon>
        </span>
        <span class="chapter-row__title">{{ chapterTitle(item) }}</span>
        <el-tag
            size="small"
            :type="isCatalog(item) ? 'success' : 'info'"
            effect="plain"
            round
            class="chapter-row__tag"
        >
          {{ isCatalog(item) ? '目录' : contentTypeLabel(item.contentType) }}
        </el-tag>
        <el-tag
            v-if="!isCatalog(item) && item.status !== 1"
            size="small"
            type="warning"
            effect="plain"
            round
            class="chapter-row__tag"
        >
          草稿
        </el-tag>
      </button>
      <NuxtLink
          v-else-if="!readonly && !isCatalog(item)"
          class="chapter-row chapter-row--link"
          :to="`/center/books/${bookId}/chapter/${item.id}`"
      >
        <span class="chapter-row__icon"><el-icon><Document /></el-icon></span>
        <span class="chapter-row__title">{{ chapterTitle(item) }}</span>
        <el-tag
            v-if="item.status !== 1"
            size="small"
            type="warning"
            effect="plain"
            round
            class="chapter-row__tag"
        >
          草稿
        </el-tag>
        <span class="chapter-row__suffix">编辑 →</span>
      </NuxtLink>
      <div
          v-else
          class="chapter-row chapter-row--static"
          :class="{ 'chapter-row--catalog': isCatalog(item) }"
      >
        <span class="chapter-row__icon">
          <el-icon><FolderOpened v-if="isCatalog(item)" /><Document v-else /></el-icon>
        </span>
        <strong v-if="isCatalog(item)" class="chapter-row__title">{{ chapterTitle(item) }}</strong>
        <span v-else class="chapter-row__title">{{ chapterTitle(item) }}</span>
        <span v-if="isCatalog(item)" class="chapter-row__suffix">{{ item.children?.length || 0 }} 章</span>
      </div>

      <BooksBookChapterTree
          v-if="item.children?.length"
          class="chapter-tree__children"
          :chapters="item.children"
          :book-id="bookId"
          :selectable="selectable"
          :readonly="readonly"
          :selected-id="selectedId"
          :depth="(depth || 0) + 1"
          @select="$emit('select', $event)"
      />
    </li>
  </ul>
</template>

<script setup lang="ts">
import { Document, FolderOpened } from '@element-plus/icons-vue'
import type { UserBookChapter } from '~/services/user-book-api'

withDefaults(defineProps<{
  chapters: UserBookChapter[]
  bookId: number
  selectable?: boolean
  readonly?: boolean
  selectedId?: string
  depth?: number
}>(), {
  depth: 0,
})

defineEmits<{
  (e: 'select', chapter: UserBookChapter): void
}>()

function isCatalog(item: UserBookChapter) {
  return item.leaf === false || item.id === '-' || !item.id || Boolean(item.children?.length)
}

function chapterTitle(item: UserBookChapter) {
  return [item.number, item.name].filter(Boolean).join(' ') || '未命名'
}

function contentTypeLabel(type?: string) {
  if (type === 'IMAGE') return '图片'
  if (type === 'VIDEO') return '视频'
  if (type === 'MIX') return '混合'
  return '文字'
}
</script>

<style scoped>
/* =========================================================
   视觉层级与缩进:
   1. 目录行:浅绿底块 + 加粗标题 + 绿色 icon
   2. 章节行:纯文本行 + 灰色 icon,hover 时左侧出现 3px 主色 accent bar
   3. 子级:左侧用 1px 实心垂直引导线,每行用小圆点连接
   4. selected 行:左侧主色 3px accent bar + 浅蓝底
   ========================================================= */
.chapter-tree {
  list-style: none;
  margin: 0;
  padding: 0;
}
.chapter-tree--root {
  padding: 0;
}
.chapter-tree__item {
  margin: 0;
  position: relative;
}

/* 子级列表:左侧 1px 实心引导线 + 缩进 */
.chapter-tree .chapter-tree {
  margin: 4px 0 4px 22px;
  padding-left: 0;
  position: relative;
}
/* 引导线:贯穿整列的 1px 灰色细线 */
.chapter-tree .chapter-tree::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 4px;
  bottom: 4px;
  width: 1px;
  background: #e4e7ed;
}

/* =========================================================
   章节行:通用排版
   ========================================================= */
.chapter-row {
  width: 100%;
  min-height: 40px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px 8px 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #303133;
  text-align: left;
  text-decoration: none;
  font-size: 14px;
  line-height: 1.4;
  position: relative;
  transition: background-color 0.15s ease, color 0.15s ease;
}

/* 左侧 accent bar:默认隐藏,hover/selected 时显示 */
.chapter-row::before {
  content: '';
  position: absolute;
  left: -4px;
  top: 4px;
  bottom: 4px;
  width: 3px;
  border-radius: 2px;
  background: transparent;
  transition: background-color 0.15s ease, width 0.15s ease, box-shadow 0.15s ease;
}

.chapter-row--button {
  cursor: pointer;
}

.chapter-row--button:hover {
  background: #f0f4f8;
  color: #1677b8;
}
.chapter-row--button:hover::before {
  background: #1677b8;
}

.chapter-row--link {
  color: #303133;
}
.chapter-row--link:hover {
  background: #ecf5ff;
  color: #1677b8;
}
.chapter-row--link:hover::before {
  background: #1677b8;
}

/* 选中:主色 4px accent bar + 饱和蓝底 + 轻微 ring,比 hover 更强烈 */
.chapter-row--selected {
  background: linear-gradient(90deg, rgba(64, 158, 255, 0.18), rgba(64, 158, 255, 0.08)) !important;
  color: #0f4f8a !important;
  font-weight: 600;
  box-shadow: inset 0 0 0 1px rgba(64, 158, 255, 0.25);
}
.chapter-row--selected::before {
  background: #1677b8;
  width: 4px;
  box-shadow: 0 0 6px rgba(22, 119, 184, 0.45);
}
.chapter-row--selected .chapter-row__title {
  font-weight: 700;
}
.chapter-row--selected.chapter-row--catalog {
  background: linear-gradient(90deg, rgba(103, 194, 58, 0.20), rgba(103, 194, 58, 0.08)) !important;
  color: #2d7a1a !important;
  box-shadow: inset 0 0 0 1px rgba(103, 194, 58, 0.3);
}
.chapter-row--selected.chapter-row--catalog::before {
  background: #67c23a;
  width: 4px;
  box-shadow: 0 0 6px rgba(103, 194, 58, 0.45);
}
.chapter-row--selected.chapter-row--catalog .chapter-row__title {
  font-weight: 700;
}

/* =========================================================
   目录行:浅绿底块 + 加粗标题,与章节行明显区分
   ========================================================= */
.chapter-row--catalog {
  font-weight: 600;
  color: #1f2329;
  background: #f6fcf3;
}
.chapter-row--catalog.chapter-row--static {
  cursor: default;
}
.chapter-row--catalog:hover {
  background: #e9f7df !important;
  color: #67c23a;
}
.chapter-row--catalog:hover::before {
  background: #67c23a;
}

.chapter-row__icon {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  font-size: 14px;
  color: #909399;
  background: #f5f7fa;
  transition: color 0.15s ease, background-color 0.15s ease;
}
.chapter-row__icon .el-icon {
  font-size: 14px;
}
.chapter-row--catalog .chapter-row__icon {
  color: #67c23a;
  background: #e1f3d8;
}
.chapter-row--selected .chapter-row__icon {
  color: #fff;
  background: currentColor;
}
.chapter-row--selected .chapter-row__icon .el-icon {
  color: #fff;
}

.chapter-row__title {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.chapter-row__suffix {
  flex: 0 0 auto;
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
}
.chapter-row__tag {
  flex: 0 0 auto;
}
.chapter-row--link:hover .chapter-row__suffix,
.chapter-row--button:hover .chapter-row__suffix {
  color: #1677b8;
}
.chapter-row--catalog:hover .chapter-row__suffix {
  color: #67c23a;
}

/* =========================================================
   子级节点连接小圆点:每行左侧贴引导线
   ========================================================= */
.chapter-tree .chapter-tree__item {
  position: relative;
}
.chapter-tree .chapter-tree__item::before {
  content: '';
  position: absolute;
  left: -14px;
  top: 22px;
  width: 14px;
  height: 1px;
  background: #e4e7ed;
}
.chapter-tree .chapter-tree__item:first-child::before {
  /* 第一个子项不要引导线从顶部连出 */
  top: auto;
  bottom: auto;
  height: 1px;
}
</style>
