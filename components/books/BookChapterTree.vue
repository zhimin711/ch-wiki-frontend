<template>
  <ul class="chapter-tree">
    <li v-for="item in chapters" :key="item.id">
      <button
        v-if="selectable"
        type="button"
        class="chapter-row"
        :class="{ selected: item.id === selectedId }"
        @click="$emit('select', item)"
      >
        <span>{{ chapterTitle(item) }}</span>
        <el-tag size="small" :type="item.leaf === false || item.id === '-' ? 'success' : 'info'">
          {{ item.leaf === false || item.id === '-' ? '目录' : contentTypeLabel(item.contentType) }}
        </el-tag>
      </button>
      <NuxtLink
        v-else-if="item.id !== '-' && item.leaf !== false"
        class="chapter-row link-row"
        :to="`/center/books/${bookId}/chapter/${item.id}`"
      >
        <span>{{ chapterTitle(item) }}</span>
        <span>打开</span>
      </NuxtLink>
      <div v-else class="chapter-row static-row">
        <strong>{{ chapterTitle(item) }}</strong>
        <span>{{ item.children?.length || 0 }} 章</span>
      </div>

      <BooksBookChapterTree
        v-if="item.children?.length"
        :chapters="item.children"
        :book-id="bookId"
        :selectable="selectable"
        :selected-id="selectedId"
        @select="$emit('select', $event)"
      />
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { UserBookChapter } from '~/services/user-book-api'

defineProps<{
  chapters: UserBookChapter[]
  bookId: number
  selectable?: boolean
  selectedId?: string
}>()

defineEmits<{
  (e: 'select', chapter: UserBookChapter): void
}>()

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
.chapter-tree {
  list-style: none;
  margin: 0;
  padding: 0;
}
.chapter-tree .chapter-tree {
  padding-left: 18px;
  border-left: 1px solid #e4e7ed;
}
.chapter-row {
  width: 100%;
  min-height: 42px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  border: 0;
  border-bottom: 1px solid #f0f2f5;
  background: transparent;
  color: #303133;
  text-align: left;
}
button.chapter-row {
  cursor: pointer;
}
.chapter-row.selected {
  background: #ecf5ff;
  color: #1677b8;
}
.link-row {
  color: #1677b8;
  text-decoration: none;
}
.static-row {
  color: #606266;
}
</style>
