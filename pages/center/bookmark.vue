<template>
  <div class="list-page">
    <div class="page-header">
      <div>
        <h1>我的书签</h1>
        <p>管理收藏的文章、资源和外部链接。</p>
      </div>
      <el-button type="primary" @click="openCreate">新增书签</el-button>
    </div>

    <div class="filter-bar">
      <el-input v-model="query.name" placeholder="名称" clearable @keyup.enter="reload" />
      <el-input v-model="query.mark" placeholder="标签" clearable @keyup.enter="reload" />
      <el-input v-model="query.type" placeholder="类型" clearable @keyup.enter="reload" />
      <el-button type="primary" @click="reload">查询</el-button>
    </div>

    <el-table v-loading="loading" :data="records" row-key="id">
      <el-table-column prop="name" label="名称" min-width="220">
        <template #default="{ row }">
          <a v-if="row.href" :href="row.href" target="_blank" rel="noopener noreferrer">{{ row.name }}</a>
          <span v-else>{{ row.name }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="type" label="类型" width="110" />
      <el-table-column prop="mark" label="标签" width="160" />
      <el-table-column prop="status" label="状态" width="100" />
      <el-table-column label="创建" width="170">
        <template #default="{ row }">{{ formatDate(row.createAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button link type="danger" @click="deleteBookmark(row as BookmarkItem)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <CommonPagination v-model="pageNum" :total="total" :page-size="pageSize" />

    <el-dialog v-model="dialogVisible" title="新增书签" width="520px">
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" maxlength="80" />
        </el-form-item>
        <el-form-item label="链接" prop="href">
          <el-input v-model="form.href" maxlength="512" />
        </el-form-item>
        <div class="dialog-grid">
          <el-form-item label="类型" prop="type">
            <el-input v-model="form.type" maxlength="40" />
          </el-form-item>
          <el-form-item label="标签" prop="mark">
            <el-input v-model="form.mark" maxlength="80" />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="createBookmark">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import type { BookmarkItem } from '~/services/bookmark-api'

definePageMeta({
  layout: 'center',
  middleware: 'auth',
})

const bookmarkApi = useBookmarkApi()
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const formRef = ref()
const records = ref<BookmarkItem[]>([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = 10

const query = reactive({
  name: '',
  mark: '',
  type: '',
})

const form = reactive({
  name: '',
  href: '',
  type: '',
  mark: '',
})

const rules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  href: [{ type: 'url', message: '链接格式不正确', trigger: 'blur' }],
}

function resetForm() {
  form.name = ''
  form.href = ''
  form.type = ''
  form.mark = ''
  formRef.value?.clearValidate?.()
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString() : '-'
}

async function fetchData() {
  loading.value = true
  try {
    const page = await bookmarkApi.getBookmarks({
      pageNum: pageNum.value,
      pageSize,
      name: query.name,
      mark: query.mark,
      type: query.type,
    })
    records.value = page.list
    total.value = page.total
  } catch {
    ElMessage?.error?.('书签加载失败')
  } finally {
    loading.value = false
  }
}

function reload() {
  pageNum.value = 1
  fetchData()
}

function openCreate() {
  resetForm()
  dialogVisible.value = true
}

async function createBookmark() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    const ok = await bookmarkApi.createBookmark({ ...form })
    if (ok) {
      ElMessage?.success?.('书签已保存')
      dialogVisible.value = false
      reload()
    }
  } catch {
    ElMessage?.error?.('保存失败')
  } finally {
    saving.value = false
  }
}

async function deleteBookmark(row: BookmarkItem) {
  try {
    await ElMessageBox?.confirm?.('删除后不可恢复，是否继续？', '删除书签', { type: 'warning' })
    const ok = await bookmarkApi.deleteBookmark(row.id)
    if (ok) {
      ElMessage?.success?.('已删除')
      fetchData()
    }
  } catch {
    // cancel
  }
}

watch(pageNum, fetchData)
onMounted(fetchData)

useHead({ title: '我的书签 - ch-wiki' })
</script>

<style scoped>
.list-page {
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
  color: #303133;
}
.page-header p {
  margin: 0;
  color: #909399;
  font-size: 13px;
}
.filter-bar {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) 140px 120px 88px;
  gap: 12px;
  margin-bottom: 16px;
}
.dialog-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
a {
  color: #409eff;
  text-decoration: none;
}
@media (max-width: 768px) {
  .page-header,
  .filter-bar,
  .dialog-grid {
    grid-template-columns: 1fr;
  }
  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
