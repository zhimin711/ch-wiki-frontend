<template>
  <div class="admin-page">
    <header class="admin-page__header">
      <div>
        <h1>文章审核</h1>
        <p>筛选待处理文章，查看正文后完成审核或推荐。</p>
      </div>
    </header>

    <WorkbenchStatusFilterBar
      v-model:keyword="query.title"
      v-model:status="query.approveStatus"
      keyword-placeholder="文章标题"
      status-placeholder="审核状态"
      :status-options="approveOptions"
      :loading="loading"
      @search="reload"
      @reset="resetFilters"
    >
      <el-select v-model="query.status" clearable placeholder="文章状态">
        <el-option label="草稿" :value="0" />
        <el-option label="发布" :value="1" />
      </el-select>
      <el-select v-model="query.recommendType" clearable placeholder="推荐类型">
        <el-option label="不推荐" value="0" />
        <el-option label="首页" value="1" />
        <el-option label="热门" value="2" />
        <el-option label="精选" value="3" />
      </el-select>
    </WorkbenchStatusFilterBar>

    <WorkbenchAdminDataTable
      :rows="records"
      :loading="loading"
      :error="error"
      :page="pageNum"
      :page-size="pageSize"
      :total="total"
      empty-text="没有符合条件的文章"
      @update:page="changePage"
      @update:page-size="changePageSize"
      @retry="fetchData"
    >
      <el-table-column prop="categoryName" label="分类" width="150" show-overflow-tooltip />
      <el-table-column prop="title" label="标题" min-width="240" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="title-cell">
            <strong>{{ row.title || '-' }}</strong>
            <span>{{ row.author || row.keywords || '-' }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="86" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
            {{ row.status === 1 ? '发布' : '草稿' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="审核" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="approveType(row.approveStatus)" size="small">
            {{ approveLabel(row.approveStatus) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="推荐" width="86" align="center">
        <template #default="{ row }">{{ recommendLabel(row.recommendType) }}</template>
      </el-table-column>
      <el-table-column label="更新时间" width="170">
        <template #default="{ row }">{{ formatDate(row.updateAt || row.publishAt || row.createAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right" align="center">
        <template #default="{ row }">
          <el-button
            v-if="isReviewable(row.approveStatus)"
            link
            type="primary"
            :disabled="actionLoading"
            @click="openApprove(row as AdminArticle)"
          >
            审核
          </el-button>
          <el-button
            v-if="!isUnknownStatus(row.approveStatus)"
            link
            type="success"
            :disabled="!isRecommendable(row.approveStatus) || actionLoading"
            @click="openRecommend(row as AdminArticle)"
          >
            推荐
          </el-button>
        </template>
      </el-table-column>
    </WorkbenchAdminDataTable>

    <WorkbenchApproveDialog
      v-model="approveVisible"
      :title="`审核 - ${selected?.title || ''}`"
      :content="articleContent"
      :loading="actionLoading"
      :allow-approve="Boolean(articleContent)"
      @approve="submitApprove('1', $event)"
      @reject="confirmReject"
    />

    <el-dialog v-model="recommendVisible" title="设置文章推荐" width="min(520px, 94vw)">
      <el-form label-position="top">
        <el-form-item label="文章">
          <strong>{{ selected?.title }}</strong>
        </el-form-item>
        <el-form-item label="推荐类型">
          <el-segmented v-model="recommendType" :options="recommendOptions" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="recommendRemark" type="textarea" :rows="3" maxlength="300" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="recommendVisible = false">取消</el-button>
        <el-button type="primary" :loading="actionLoading" @click="submitRecommend">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import type { AdminArticle } from '~/services/admin-api'

definePageMeta({
  layout: 'workbench',
  middleware: 'admin',
})

const adminApi = useAdminApi()
const records = ref<AdminArticle[]>([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const actionLoading = ref(false)
const error = ref('')
const selected = ref<AdminArticle | null>(null)
const approveVisible = ref(false)
const articleContent = ref('')
const recommendVisible = ref(false)
const recommendType = ref('0')
const recommendRemark = ref('')

const query = reactive({
  title: '',
  approveStatus: '',
  status: null as number | null,
  recommendType: '',
})

const approveOptions = [
  { label: '待审核', value: '0' },
  { label: '审核通过', value: '1' },
  { label: '重新审核', value: '2' },
  { label: '取消审核', value: '3' },
  { label: '审核驳回', value: '4' },
  { label: '审核中', value: '5' },
  { label: '未知状态', value: '-1' },
]
const recommendOptions = [
  { label: '不推荐', value: '0' },
  { label: '首页', value: '1' },
  { label: '热门', value: '2' },
  { label: '精选', value: '3' },
]

function toApproveKey(status?: string | number | null) {
  if (status == null) return ''
  return String(status).trim()
}

function approveLabel(status?: string | number) {
  const map: Record<string, string> = {
    '0': '待审核',
    '1': '审核通过',
    '2': '重新审核',
    '3': '取消审核',
    '4': '审核驳回',
    '5': '审核中',
    '-1': '未知状态',
  }
  return map[toApproveKey(status)] || '未知状态'
}

function approveType(status?: string | number) {
  const map: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'primary'> = {
    '0': 'warning',
    '1': 'success',
    '2': 'warning',
    '3': 'info',
    '4': 'danger',
    '5': 'primary',
    '-1': 'info',
  }
  return map[toApproveKey(status)] || 'info'
}

function isReviewable(status?: string | number) {
  return ['0', '2'].includes(toApproveKey(status))
}

function isRecommendable(status?: string | number) {
  return toApproveKey(status) === '1'
}

function isUnknownStatus(status?: string | number) {
  return toApproveKey(status) === '-1'
}

function recommendLabel(type?: string | number) {
  return ({ '0': '-', '1': '首页', '2': '热门', '3': '精选' } as Record<string, string>)[String(type ?? 0)] || '-'
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString() : '-'
}

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const page = await adminApi.listArticles({
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      ...query,
    })
    records.value = page.list
    total.value = page.total
  } catch (cause) {
    records.value = []
    total.value = 0
    error.value = getAdminErrorMessage(cause, '文章列表加载失败')
  } finally {
    loading.value = false
  }
}

function reload() {
  pageNum.value = 1
  fetchData()
}

function resetFilters() {
  Object.assign(query, { title: '', approveStatus: '', status: null, recommendType: '' })
  reload()
}

function changePage(value: number) {
  pageNum.value = value
  fetchData()
}

function changePageSize(value: number) {
  pageSize.value = value
  pageNum.value = 1
  fetchData()
}

async function openApprove(row: AdminArticle) {
  selected.value = row
  articleContent.value = ''
  actionLoading.value = true
  approveVisible.value = true
  try {
    const content = await adminApi.getArticleContent(row.id)
    articleContent.value = content.content || ''
  } catch (cause) {
    ElMessage.error(getAdminErrorMessage(cause, '文章正文加载失败'))
  } finally {
    actionLoading.value = false
  }
}

async function submitApprove(status: '1' | '4', opinion: string) {
  if (!selected.value) return
  actionLoading.value = true
  try {
    await adminApi.approveArticle({ srcUid: String(selected.value.id), status, opinion })
    ElMessage.success(status === '1' ? '文章审核通过' : '文章已驳回')
    approveVisible.value = false
    await fetchData()
  } catch (cause) {
    ElMessage.error(getAdminErrorMessage(cause, '审核操作失败'))
  } finally {
    actionLoading.value = false
  }
}

async function confirmReject(opinion: string) {
  try {
    await ElMessageBox.confirm('驳回后作者需要重新提交，是否继续？', '确认驳回', { type: 'warning' })
    await submitApprove('4', opinion)
  } catch {
    // User cancelled.
  }
}

function openRecommend(row: AdminArticle) {
  selected.value = row
  recommendType.value = String(row.recommendType ?? 0)
  recommendRemark.value = ''
  recommendVisible.value = true
}

async function submitRecommend() {
  if (!selected.value) return
  actionLoading.value = true
  try {
    await adminApi.recommendArticle({
      srcUid: String(selected.value.id),
      type: recommendType.value,
      remark: recommendRemark.value,
    })
    ElMessage.success('推荐设置已保存')
    recommendVisible.value = false
    await fetchData()
  } catch (cause) {
    ElMessage.error(getAdminErrorMessage(cause, '推荐设置失败'))
  } finally {
    actionLoading.value = false
  }
}

onMounted(fetchData)
useHead({ title: '文章审核 - 工作台' })
</script>

<style scoped>
.admin-page {
  background: #fff;
  padding: 20px;
}
.admin-page__header {
  margin-bottom: 18px;
}
.admin-page__header h1 {
  margin: 0 0 5px;
  font-size: 22px;
}
.admin-page__header p {
  margin: 0;
  color: #606266;
  font-size: 13px;
}
.title-cell {
  display: grid;
  gap: 4px;
  min-width: 0;
}
.title-cell strong,
.title-cell span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.title-cell span {
  color: #909399;
  font-size: 12px;
}
</style>
