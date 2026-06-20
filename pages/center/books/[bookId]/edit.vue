<template>
  <div class="book-editor">
    <el-skeleton v-if="loading" :rows="10" animated />
    <template v-else-if="book">
      <div class="page-header">
        <div>
          <NuxtLink :to="`/center/books/${book.id}`" class="back-link">返回目录</NuxtLink>
          <h1>编辑 {{ book.name }}</h1>
        </div>
        <div class="page-actions">
          <el-button :loading="fixingCatalog" @click="fixCatalog">修复目录</el-button>
          <el-button type="primary" @click="openAddDialog">新增目录或章节</el-button>
        </div>
      </div>

      <div class="editor-grid">
        <section class="chapter-panel">
          <div class="section-head">
            <h2>章节结构</h2>
            <span>{{ chapterCount }} 个节点</span>
          </div>
          <BooksBookChapterTree
            v-if="chapters.length"
            :chapters="chapters"
            :book-id="book.id"
            selectable
            :selected-id="selected?.id"
            @select="selectChapter"
          />
          <el-empty v-else description="暂无目录或章节" />
        </section>

        <div class="edit-panels">
          <section class="form-panel">
            <h2>书籍信息</h2>
            <BooksBookMetaForm
              :model-value="book"
              :categories="bookClassifies"
              :saving="savingBook"
              @submit="saveBook"
            />
          </section>

          <section class="form-panel">
            <div class="section-head">
              <h2>当前节点</h2>
              <div v-if="selected && selected.id !== '-'" class="node-actions">
                <NuxtLink
                  v-if="selected.leaf !== false"
                  :to="`/center/books/${book.id}/chapter/${selected.id}`"
                  class="table-link"
                >编辑正文</NuxtLink>
                <el-button link type="danger" @click="removeChapter">删除</el-button>
              </div>
            </div>

            <el-empty v-if="!selected" description="请选择左侧节点" />
            <p v-else-if="selected.id === '-'" class="root-copy">当前是虚拟根目录，可在这里新增目录或章节。</p>
            <el-form v-else label-position="top">
              <div class="node-grid">
                <el-form-item label="编号">
                  <el-input v-model="nodeForm.number" maxlength="80" />
                </el-form-item>
                <el-form-item label="名称">
                  <el-input v-model="nodeForm.name" maxlength="160" />
                </el-form-item>
                <el-form-item v-if="selected.leaf !== false" label="父目录">
                  <el-select v-model="nodeForm.pid" clearable placeholder="根目录">
                    <el-option v-for="item in catalogOptions" :key="item.id" :label="chapterTitle(item)" :value="item.id" />
                  </el-select>
                </el-form-item>
                <el-form-item v-if="selected.leaf !== false" label="内容类型">
                  <el-select v-model="nodeForm.contentType">
                    <el-option label="文字" value="TEXT" />
                    <el-option label="图片" value="IMAGE" />
                    <el-option label="视频" value="VIDEO" />
                    <el-option label="混合" value="MIX" />
                  </el-select>
                </el-form-item>
              </div>
              <el-button type="primary" :loading="savingChapter" @click="saveChapter">保存节点</el-button>
            </el-form>
          </section>
        </div>
      </div>
    </template>
    <el-empty v-else description="书籍不存在或无权访问" />

    <el-dialog v-model="addVisible" title="新增目录或章节" width="min(560px, 94vw)">
      <el-form label-position="top">
        <el-form-item label="节点类型">
          <el-segmented v-model="addForm.leaf" :options="nodeTypeOptions" />
        </el-form-item>
        <el-form-item v-if="addForm.leaf" label="所属目录">
          <el-select v-model="addForm.pid" clearable placeholder="根目录">
            <el-option v-for="item in catalogOptions" :key="item.id" :label="chapterTitle(item)" :value="item.id" />
          </el-select>
        </el-form-item>
        <div class="node-grid">
          <el-form-item label="编号">
            <el-input v-model="addForm.number" maxlength="80" placeholder="如：第一章" />
          </el-form-item>
          <el-form-item label="名称">
            <el-input v-model="addForm.name" maxlength="160" />
          </el-form-item>
        </div>
        <el-form-item v-if="addForm.leaf" label="内容类型">
          <el-select v-model="addForm.contentType">
            <el-option label="文字" value="TEXT" />
            <el-option label="图片" value="IMAGE" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addVisible = false">取消</el-button>
        <el-button type="primary" :loading="adding" @click="createChapter">确认新增</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import type { APIClassifyDTO } from '~/services/public-api'
import type {
  BookContentType,
  UserBook,
  UserBookChapter,
  UserBookChapterSaveRequest,
  UserBookSaveRequest,
} from '~/services/user-book-api'

definePageMeta({ layout: 'center', middleware: 'auth' })

const route = useRoute()
const api = useUserBookApi()
const loading = ref(true)
const savingBook = ref(false)
const savingChapter = ref(false)
const fixingCatalog = ref(false)
const adding = ref(false)
const addVisible = ref(false)
const book = ref<UserBook | null>(null)
const bookClassifies = ref<APIClassifyDTO[]>([])
const chapters = ref<UserBookChapter[]>([])
const selected = ref<UserBookChapter | null>(null)
const bookId = computed(() => Number(route.params.bookId))

const nodeForm = reactive({
  number: '',
  name: '',
  pid: '',
  contentType: 'TEXT' as BookContentType,
})

const addForm = reactive({
  leaf: true,
  pid: '',
  number: '',
  name: '',
  contentType: 'TEXT' as BookContentType,
})

const nodeTypeOptions = [
  { label: '章节', value: true },
  { label: '目录', value: false },
]

const flatChapters = computed(() => flattenBookChapters(chapters.value))
const catalogOptions = computed(() => flatChapters.value.filter(item => item.id !== '-' && item.leaf === false))
const chapterCount = computed(() => flatChapters.value.filter(item => item.id !== '-').length)

function chapterTitle(item: UserBookChapter) {
  return [item.number, item.name].filter(Boolean).join(' ') || '未命名'
}

async function loadData(preferredId?: string) {
  loading.value = true
  try {
    const [classifyData, data] = await Promise.all([
      api.getBookClassifies(),
      api.getBook(bookId.value),
    ])
    bookClassifies.value = classifyData
    book.value = data
    chapters.value = data?.chapterList || []
    selected.value = flatChapters.value.find(item => item.id === preferredId) || null
    if (selected.value) applySelection(selected.value)
  } catch {
    ElMessage?.error?.('书籍加载失败')
  } finally {
    loading.value = false
  }
}

function selectChapter(chapter: UserBookChapter) {
  selected.value = chapter
  applySelection(chapter)
}

function applySelection(chapter: UserBookChapter) {
  Object.assign(nodeForm, {
    number: chapter.number || '',
    name: chapter.name || '',
    pid: chapter.pid || '',
    contentType: chapter.contentType || 'TEXT',
  })
}

async function saveBook(value: UserBookSaveRequest) {
  if (!book.value) return
  savingBook.value = true
  try {
    if (await api.updateBook(book.value.id, value)) {
      ElMessage?.success?.('书籍信息已保存')
      await loadData(selected.value?.id)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : '书籍保存失败'
    ElMessage?.error?.(message)
  } finally {
    savingBook.value = false
  }
}

async function saveChapter() {
  if (!book.value || !selected.value || selected.value.id === '-') return
  if (!nodeForm.number && !nodeForm.name) {
    ElMessage?.warning?.('请填写编号或名称')
    return
  }
  savingChapter.value = true
  try {
    // 切父目录时:用目标父目录的最后一个同级作为 pre;
    // 否则保留原 pre。lastSiblingId 可能返回 undefined(没有同级),
    // 这种情况不能让 pre 出现在请求体里(后端把空串视为非法值)
    const newPre = selected.value.leaf !== false && (nodeForm.pid || '') !== (selected.value.pid || '')
      ? lastSiblingId(nodeForm.pid, selected.value.id)
      : selected.value.pre
    const request: UserBookChapterSaveRequest = {
      number: nodeForm.number,
      name: nodeForm.name,
      pid: selected.value.leaf === false ? selected.value.pid : nodeForm.pid,
      ...(newPre ? { pre: newPre } : {}),
      leaf: selected.value.leaf !== false,
      contentType: nodeForm.contentType,
      status: selected.value.status ?? 0,
    }
    if (await api.updateChapter(book.value.id, selected.value.id, request)) {
      ElMessage?.success?.('节点已保存')
      await loadData(selected.value.id)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : '节点保存失败'
    ElMessage?.error?.(message)
  } finally {
    savingChapter.value = false
  }
}

async function fixCatalog() {
  if (!book.value) return
  try {
    await ElMessageBox?.confirm?.('将根据当前章节数据修复目录结构，是否继续？', '修复目录', { type: 'warning' })
  } catch {
    return
  }
  fixingCatalog.value = true
  try {
    if (await api.fixCatalog(book.value.id)) {
      ElMessage?.success?.('目录已修复')
      await loadData(selected.value?.id)
    }
  } catch {
    ElMessage?.error?.('目录修复失败')
  } finally {
    fixingCatalog.value = false
  }
}

function openAddDialog() {
  Object.assign(addForm, {
    leaf: true,
    pid: selected.value?.leaf === false && selected.value.id !== '-' ? selected.value.id : selected.value?.pid || '',
    number: '',
    name: '',
    contentType: 'TEXT',
  })
  addVisible.value = true
}

function lastSiblingId(pid: string, excludeId?: string) {
  // 虚拟根 id='-',leaf 字段后端没设置(为 null),不是 boolean false,
  // 所以 'item.leaf !== false' 仍会把它算进来,导致 at(-1)?.id 返回 '-' 当作 pre 发出。
  // 这里显式排除虚拟根,与 catalogOptions/chapterCount 的过滤保持一致。
  return flatChapters.value
    .filter(item => item.id !== '-'
      && item.id !== excludeId
      && item.leaf !== false
      && (item.pid || '') === (pid || ''))
    .sort((a, b) => (a.sort || 0) - (b.sort || 0))
    .at(-1)?.id
}

async function createChapter() {
  if (!book.value || (!addForm.number && !addForm.name)) {
    ElMessage?.warning?.('请填写编号或名称')
    return
  }
  adding.value = true
  try {
    const pid = addForm.leaf ? addForm.pid : ''
    // 没有同父级的前一章节时,后端校验会拒绝,这里直接传 undefined 让字段不出现在请求体里
    const pre = addForm.leaf ? lastSiblingId(pid) : undefined
    const id = await api.createChapter(book.value.id, {
      leaf: addForm.leaf,
      pid,
      ...(pre ? { pre } : {}),
      number: addForm.number,
      name: addForm.name,
      contentType: addForm.leaf ? addForm.contentType : 'TEXT',
      status: 0,
      content: '',
    })
    if (id) {
      ElMessage?.success?.(addForm.leaf ? '章节已新增' : '目录已新增')
      addVisible.value = false
      await loadData(id)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : '新增节点失败'
    ElMessage?.error?.(message)
  } finally {
    adding.value = false
  }
}

async function removeChapter() {
  if (!book.value || !selected.value || selected.value.id === '-') return
  try {
    await ElMessageBox?.confirm?.('删除后不可恢复；目录必须为空才能删除。', '删除节点', { type: 'warning' })
    if (await api.deleteChapter(book.value.id, selected.value.id)) {
      ElMessage?.success?.('节点已删除')
      await loadData()
    }
  } catch {
    // cancel or request error
  }
}

onMounted(() => loadData())
useHead({ title: () => book.value ? `编辑 ${book.value.name}` : '编辑书籍 - ch-wiki' })
</script>

<style scoped>
.book-editor {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
}
.page-header,
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.page-header {
  margin-bottom: 20px;
}
.page-actions {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}
.page-header h1 {
  margin: 8px 0 0;
  font-size: 22px;
}
.back-link,
.table-link {
  color: #1677b8;
  text-decoration: none;
}
/* 节点操作区：inline-flex 统一 <a>(inline) 与 <button>(inline-block) 的基线和间距 */
.node-actions {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}
.node-actions .table-link {
  margin: 0;
}
.editor-grid {
  display: grid;
  grid-template-columns: minmax(240px, 0.8fr) minmax(0, 1.8fr);
  gap: 18px;
  align-items: start;
}
.chapter-panel,
.form-panel {
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 18px;
}
.edit-panels {
  display: grid;
  gap: 18px;
}
.section-head h2,
.form-panel > h2 {
  margin: 0 0 16px;
  font-size: 17px;
}
.section-head span {
  color: #909399;
  font-size: 12px;
}
.node-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.node-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}
.root-copy {
  color: #606266;
}
@media (max-width: 860px) {
  .editor-grid,
  .node-grid {
    grid-template-columns: 1fr;
  }
  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }
  .page-actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
