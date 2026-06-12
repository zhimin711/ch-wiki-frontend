<template>
  <div class="books-page">
    <div class="page-header">
      <div>
        <h1>我的书籍</h1>
        <p>管理书籍元信息、章节目录和正文。</p>
      </div>
      <el-button type="primary" @click="createVisible = true">新建书籍</el-button>
    </div>

    <div class="filter-bar">
      <el-input v-model="query.title" placeholder="书名或标题" clearable @keyup.enter="reload" />
      <el-select v-model="query.type" clearable placeholder="类型">
        <el-option label="小说" value="1" />
        <el-option label="漫画" value="2" />
        <el-option label="其他" value="0" />
      </el-select>
      <el-select v-model="query.status" clearable placeholder="状态">
        <el-option label="新书" value="0" />
        <el-option label="连载" value="1" />
        <el-option label="完结" value="2" />
        <el-option label="暂无内容" value="4" />
      </el-select>
      <el-button type="primary" @click="reload">查询</el-button>
    </div>

    <el-table v-loading="loading" :data="records" row-key="id">
      <el-table-column label="书籍" min-width="280">
        <template #default="{ row }">
          <div class="book-cell">
            <el-image :src="cover(row as UserBook)" fit="cover" class="cover">
              <template #error><div class="cover-fallback">书</div></template>
            </el-image>
            <div>
              <NuxtLink :to="`/center/books/${row.id}`">{{ row.name }}</NuxtLink>
              <small>{{ row.summary || row.description || '暂无简介' }}</small>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="类型" width="90">
        <template #default="{ row }">{{ bookTypeLabel(row.type) }}</template>
      </el-table-column>
      <el-table-column prop="classifyName" label="分类" width="130" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === '2' ? 'success' : 'info'">{{ bookStatusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="发布" width="90">
        <template #default="{ row }">{{ row.released ? '公开' : '私有' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="190" fixed="right">
        <template #default="{ row }">
          <div class="table-actions">
            <NuxtLink :to="`/center/books/${row.id}`" class="table-link">目录</NuxtLink>
            <NuxtLink :to="`/center/books/${row.id}/edit`" class="table-link">编辑</NuxtLink>
            <el-button link type="danger" @click="removeBook(row as UserBook)">删除</el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <CommonPagination v-model="pageNum" :total="total" :page-size="pageSize" />

    <el-dialog v-model="createVisible" title="新建书籍" width="min(680px, 94vw)">
      <BooksBookMetaForm :saving="creating" submit-text="创建书籍" @submit="createBook" />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { normalizeBackendUrl } from '~/composables/useAvatar'
import type { UserBook, UserBookSaveRequest } from '~/services/user-book-api'

definePageMeta({ layout: 'center', middleware: 'auth' })

const api = useUserBookApi()
const loading = ref(false)
const creating = ref(false)
const createVisible = ref(false)
const records = ref<UserBook[]>([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = 10
const query = reactive({ title: '', type: '', status: '' })

function cover(book: UserBook) {
  return normalizeBackendUrl(book.image)
}

async function fetchData() {
  loading.value = true
  try {
    const page = await api.getBooks({ ...query, pageNum: pageNum.value, pageSize })
    records.value = page.list
    total.value = page.total
  } catch {
    ElMessage?.error?.('书籍加载失败')
  } finally {
    loading.value = false
  }
}

function reload() {
  pageNum.value = 1
  fetchData()
}

async function createBook(value: UserBookSaveRequest) {
  creating.value = true
  try {
    const id = await api.createBook(value)
    if (id) {
      ElMessage?.success?.('书籍已创建')
      createVisible.value = false
      await navigateTo(`/center/books/${id}/edit`)
    }
  } catch {
    ElMessage?.error?.('创建书籍失败')
  } finally {
    creating.value = false
  }
}

async function removeBook(book: UserBook) {
  try {
    await ElMessageBox?.confirm?.('删除后书籍、章节和正文均不可恢复，是否继续？', '删除书籍', { type: 'warning' })
    if (await api.deleteBook(book.id)) {
      ElMessage?.success?.('书籍已删除')
      fetchData()
    }
  } catch {
    // cancel
  }
}

watch(pageNum, fetchData)
onMounted(fetchData)
useHead({ title: '我的书籍 - ch-wiki' })
</script>

<style scoped>
.books-page {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}
.page-header h1 {
  margin: 0 0 6px;
  font-size: 22px;
}
.page-header p {
  margin: 0;
  color: #909399;
  font-size: 13px;
}
.filter-bar {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) 120px 120px 88px;
  gap: 12px;
  margin-bottom: 16px;
}
.book-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}
.book-cell > div {
  min-width: 0;
}
.book-cell a,
.table-link {
  color: #1677b8;
  text-decoration: none;
  margin-right: 10px;
}
/* 操作列：inline-flex 统一 <a>(inline) 与 <button>(inline-block) 的基线和间距 */
.table-actions {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}
.table-actions .table-link {
  margin: 0;
}
.book-cell small {
  display: block;
  max-width: 360px;
  margin-top: 4px;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cover {
  width: 42px;
  height: 56px;
  flex: 0 0 auto;
  border-radius: 4px;
}
.cover-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background: #eef2f5;
  color: #7a8791;
}
@media (max-width: 760px) {
  .page-header,
  .filter-bar {
    grid-template-columns: 1fr;
  }
  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
