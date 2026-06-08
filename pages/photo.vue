<template>
  <div class="photo-page">
    <h1 class="page-title">相册</h1>

    <div class="page-toolbar" v-if="categories.length">
      <CommonCategoryFilter v-model="selectedCategory" :categories="categories" placeholder="选择分类" @update:model-value="onCategoryChange" />
    </div>

    <div class="image-grid" v-if="images.length">
      <div v-for="img in images" :key="img.id" class="image-card">
        <img :src="normalizeUrl(img.path)" :alt="img.name" loading="lazy" />
        <div class="image-overlay">
          <span class="image-name">{{ img.name }}</span>
          <span class="image-desc" v-if="img.description">{{ img.description }}</span>
        </div>
      </div>
    </div>

    <el-empty v-else description="暂无相册图片" />
    <CommonPagination v-model="pageNum" :total="total" :page-size="pageSize" />
  </div>
</template>

<script setup lang="ts">
import type { APIClassifyDTO, PublicImageDTO } from '~/services/public-api'

const { getImageCategories, getPhotos } = usePublicApi()

const pageNum = ref(1)
const pageSize = ref(20)
const total = ref(0)
const selectedCategory = ref<string | null>(null)
const images = ref<PublicImageDTO[]>([])
const categories = ref<APIClassifyDTO[]>([])
const normalizeUrl = normalizeBackendUrl

async function loadImages() {
  const result = await getPhotos({
    pageNum: pageNum.value,
    pageSize: pageSize.value,
    categoryId: selectedCategory.value ? Number(selectedCategory.value) : undefined,
  })
  images.value = result.list || []
  total.value = result.total || 0
}

async function loadCategories() {
  categories.value = (await getImageCategories()) || []
}

function onCategoryChange() {
  pageNum.value = 1
  loadImages()
}

watch(pageNum, loadImages)
onMounted(() => {
  loadCategories()
  loadImages()
})

useHead({ title: '相册 - ch-wiki' })
</script>

<style scoped>
.photo-page { max-width: 1200px; margin: 0 auto; }
.page-title { font-size: 24px; font-weight: 600; margin-bottom: 20px; color: var(--color-text); }
.page-toolbar { margin-bottom: 20px; }
.image-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
.image-card { position: relative; border-radius: 8px; overflow: hidden; aspect-ratio: 1; background: #f5f7fa; }
.image-card img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
.image-card:hover img { transform: scale(1.05); }
.image-overlay { position: absolute; bottom: 0; left: 0; right: 0; padding: 12px; background: linear-gradient(transparent, rgba(0,0,0,0.72)); color: #fff; }
.image-name { font-size: 14px; display: block; }
.image-desc { font-size: 12px; opacity: 0.85; }
</style>
