<template>
  <section class="article-comments">
    <h3 class="section-title">
      <el-icon><ChatLineRound /></el-icon>
      评论
      <span v-if="total > 0" class="count">({{ total }})</span>
    </h3>

    <!-- 评论输入框 -->
    <div class="comment-composer">
      <el-avatar
        v-if="isLoggedIn"
        :size="36"
        :src="auth.avatar || generateAvatar(userNickname)"
        :alt="userNickname"
      />
      <el-avatar v-else :size="36" :src="generateAvatar(userNickname || '?')" />
      <div class="composer-body">
        <el-input
          v-model="newComment"
          type="textarea"
          :rows="3"
          :placeholder="isLoggedIn ? '说点什么吧…' : '登录后即可评论'"
          :disabled="!isLoggedIn"
          maxlength="1000"
          show-word-limit
          resize="none"
        />
        <div class="composer-actions">
          <span v-if="!isLoggedIn" class="composer-tip">
            <el-icon><InfoFilled /></el-icon>
            请先
            <NuxtLink to="/login" class="login-link">登录</NuxtLink>
            后参与评论
          </span>
          <span v-else-if="replyTo" class="composer-tip">
            回复
            <strong>@{{ replyTo.nickname || replyTo.username }}</strong>
            <el-button link size="small" @click="cancelReply">取消</el-button>
          </span>
          <span v-else class="composer-tip">支持 Markdown 语法</span>
          <el-button
            type="primary"
            size="small"
            :disabled="!canSubmit"
            :loading="submitting"
            @click="submit"
          >
            发表评论
          </el-button>
        </div>
      </div>
    </div>

    <!-- 列表 -->
    <div v-if="loading" class="comment-loading">
      <el-skeleton :rows="3" animated />
    </div>

    <div v-else-if="!comments.length" class="comment-empty">
      <el-empty :image-size="80" description="还没有评论，来抢沙发吧" />
    </div>

    <ul v-else class="comment-list">
      <li v-for="c in comments" :key="c.id" class="comment-item">
        <el-avatar :size="40" :src="c.avatar || defaultAvatarFor(c.nickname || c.username)" :alt="c.nickname || c.username" />
        <div class="comment-body">
          <div class="comment-meta">
            <span class="comment-name">{{ c.nickname || c.username || '匿名用户' }}</span>
            <span class="comment-time">{{ formatRelative(c.createAt) }}</span>
          </div>
          <div class="comment-content">{{ c.content }}</div>
          <div class="comment-actions">
            <button
              class="action-btn"
              :disabled="!isLoggedIn"
              @click="onReply(c)"
            >
              <el-icon><ChatLineSquare /></el-icon>
              回复
            </button>
            <button
              v-if="canDelete(c)"
              class="action-btn action-danger"
              @click="onDelete(c)"
            >
              <el-icon><Delete /></el-icon>
              删除
            </button>
          </div>
        </div>
      </li>
    </ul>

    <!-- 分页 -->
    <div v-if="total > pageSize" class="comment-pagination">
      <el-pagination
        v-model:current-page="pageNum"
        :page-size="pageSize"
        :total="total"
        layout="prev, pager, next, total"
        background
        @current-change="load"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  ChatLineRound,
  ChatLineSquare,
  Delete,
  InfoFilled,
} from '@element-plus/icons-vue'
import { usePublicApi } from '~/services/public-api'

interface CommentDTO {
  id: number | string
  parentId?: number | string | null
  userId?: number | string
  username?: string
  nickname?: string
  avatar?: string
  content: string
  createAt: number | string | null
}

const props = defineProps<{ articleId: number }>()

const { getArticleComments } = usePublicApi()

const auth = useAuthStore()
const isLoggedIn = computed(() => !!auth.token)
const userNickname = computed(() => auth.nickname || auth.username || '')

// 列表中其他用户的默认头像
function defaultAvatarFor(name?: string) {
  return generateAvatar(name || '?')
}

const comments = ref<CommentDTO[]>([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const submitting = ref(false)

const newComment = ref('')
const replyTo = ref<CommentDTO | null>(null)

const canSubmit = computed(
  () => isLoggedIn.value && newComment.value.trim().length > 0 && !submitting.value,
)

function canDelete(c: CommentDTO) {
  // 后端若没返回 userId，就用 username 兜底
  return (
    (c.userId != null && auth.username && String(c.userId) === String(auth.username)) ||
    (c.username && auth.username && c.username === auth.username)
  )
}

function formatRelative(ts: number | string | null) {
  if (!ts) return ''
  const t = typeof ts === 'number' ? ts : Date.parse(ts)
  const diff = Date.now() - t
  const m = Math.floor(diff / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m} 分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} 小时前`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d} 天前`
  return new Date(t).toLocaleDateString('zh-CN')
}

async function load() {
  loading.value = true
  try {
    const res = await getArticleComments(props.articleId, pageNum.value, pageSize.value)
    if (res) {
      comments.value = (res.list || []) as CommentDTO[]
      total.value = res.total || 0
    } else {
      comments.value = []
      total.value = 0
    }
  } finally {
    loading.value = false
  }
}

function onReply(c: CommentDTO) {
  replyTo.value = c
  newComment.value = ''
}

function cancelReply() {
  replyTo.value = null
}

async function submit() {
  if (!canSubmit.value) return
  submitting.value = true
  try {
    // 简单用 alert 模拟提交成功 — 等后端提供 POST 接口
    // 实际接入：await api.post(`/api/public/articles/${props.articleId}/comments`, {
    //   content: newComment.value.trim(),
    //   parentId: replyTo.value?.id ?? null,
    // })
    ElMessage?.success?.('评论已提交（前端演示，待后端接入 POST 接口）')
    newComment.value = ''
    replyTo.value = null
    // 重新加载第一页
    pageNum.value = 1
    await load()
  } catch {
    // 静默
  } finally {
    submitting.value = false
  }
}

function onDelete(c: CommentDTO) {
  ElMessageBox?.confirm?.('确定要删除这条评论吗？', '提示', {
    type: 'warning',
  })
    .then(async () => {
      // await api.delete(`/api/public/articles/${props.articleId}/comments/${c.id}`)
      ElMessage?.success?.('已删除（前端演示）')
      await load()
    })
    .catch(() => {})
}

onMounted(load)
watch(() => props.articleId, load)
</script>

<style scoped>
.article-comments {
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 20px;
  color: #1f2329;
}
.section-title .el-icon { color: var(--color-primary); }
.section-title .count { color: var(--color-text-placeholder); font-size: 14px; font-weight: 400; }

/* 输入区 */
.comment-composer {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: #f6f8fa;
  border-radius: 8px;
  margin-bottom: 24px;
}
.composer-body { flex: 1; min-width: 0; }
.composer-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}
.composer-tip {
  font-size: 12px;
  color: var(--color-text-placeholder);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.login-link { color: var(--color-primary); text-decoration: none; }
.login-link:hover { text-decoration: underline; }

/* 列表 */
.comment-list { list-style: none; padding: 0; margin: 0; }
.comment-item {
  display: flex;
  gap: 12px;
  padding: 16px 0;
  border-bottom: 1px solid #f0f1f3;
}
.comment-item:last-child { border-bottom: none; }
.comment-body { flex: 1; min-width: 0; }
.comment-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}
.comment-name { font-size: 14px; font-weight: 600; color: #1f2329; }
.comment-time { font-size: 12px; color: var(--color-text-placeholder); }
.comment-content {
  font-size: 14px;
  line-height: 1.7;
  color: #374151;
  white-space: pre-wrap;
  word-break: break-word;
}
.comment-actions {
  margin-top: 6px;
  display: flex;
  gap: 16px;
}
.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: 0;
  padding: 0;
  font-size: 12px;
  color: var(--color-text-placeholder);
  cursor: pointer;
  transition: color 0.2s;
}
.action-btn:hover:not(:disabled) { color: var(--color-primary); }
.action-btn:disabled { cursor: not-allowed; opacity: 0.5; }
.action-btn.action-danger:hover { color: #f56c6c; }

.comment-loading,
.comment-empty { padding: 24px 0; }
.comment-pagination {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}
</style>
