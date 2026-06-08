<template>
  <div class="doc-detail-page" v-if="detail">
    <h1 class="page-title">{{ detail.title }}</h1>
    <div class="doc-meta">
      <span v-if="detail.author">{{ detail.author }}</span>
      <span v-if="detail.publishAt">{{ formatDate(detail.publishAt) }}</span>
      <span v-if="detail.countView != null">{{ detail.countView }} 浏览</span>
      <span v-if="detail.countDownload != null">{{ detail.countDownload }} 下载</span>
    </div>
    <p class="doc-desc" v-if="detail.description">{{ detail.description }}</p>
    <div class="doc-actions">
      <el-button v-if="detail.downloadUrl" type="primary" @click="download(detail.downloadUrl)">下载</el-button>
      <el-button v-if="detail.previewUrl" @click="preview(detail.previewUrl)">预览</el-button>
    </div>
  </div>
  <el-empty v-else description="文档不存在或未公开" />
</template>

<script setup lang="ts">
import type { PublicResourceDetailDTO } from '~/services/public-api'

const route = useRoute()
const { getResourceDetail } = usePublicApi()

const id = computed(() => Number(route.params.id))
const { data: result } = await useAsyncData(`resource-${id.value}`, () => getResourceDetail(id.value))
const detail = computed<PublicResourceDetailDTO | null>(() => result.value ?? null)

function formatDate(ts: number) { return new Date(ts).toLocaleDateString('zh-CN') }
function download(url: string) { window.open(url, '_blank') }
function preview(url: string) { window.open(url, '_blank') }

useHead({ title: () => detail.value ? `${detail.value.title} - ch-wiki` : '文档 - ch-wiki' })
</script>

<style scoped>
.page-title { font-size: 28px; font-weight: 600; margin-bottom: 12px; }
.doc-meta { font-size: 13px; color: #909399; display: flex; gap: 16px; margin-bottom: 16px; }
.doc-desc { font-size: 16px; line-height: 1.8; margin-bottom: 24px; }
.doc-actions { display: flex; gap: 12px; }
</style>
