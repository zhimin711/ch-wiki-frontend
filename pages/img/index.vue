<template>
  <div class="img-list-page">
    <h1 class="page-title">印象城</h1>

    <!-- 分类筛选 -->
    <div class="page-toolbar" v-if="categories.length">
      <CommonCategoryFilter v-model="selectedCategory" :categories="categories" placeholder="选择分类" @update:model-value="onCategoryChange" />
    </div>

    <!-- 图片网格 -->
    <div class="image-grid" v-if="images.length">
      <div v-for="img in images" :key="img.id" class="image-card">
        <img :src="img.path" :alt="img.name" loading="lazy" />
        <div class="image-overlay">
          <span class="image-name">{{ img.name }}</span>
          <span class="image-desc" v-if="img.description">{{ img.description }}</span>
        </div>
      </div>
    </div>

    <el-empty v-else description="暂无图片" />
    <CommonPagination v-model="pageNum" :total="total" :page-size="pageSize" />
  </div>
</template>

<script setup lang="ts">
import type { PublicImageDTO, APIClassifyDTO } from '~/services/public-api'

const { getImages, getImageCategories } = usePublicApi()
const route = useRoute()

const pageNum = ref(1)
const pageSize = ref(20)
const total = ref(0)
const initialCategory = Array.isArray(route.query.categoryId) ? route.query.categoryId[0] : route.query.categoryId
const selectedCategory = ref<string | null>(typeof initialCategory === 'string' ? initialCategory : null)
const images = ref<PublicImageDTO[]>([])
const categories = ref<APIClassifyDTO[]>([])

async function loadImages() {
  const result = await getImages({
    pageNum: pageNum.value,
    pageSize: pageSize.value,
    categoryId: selectedCategory.value ? Number(selectedCategory.value) : undefined,
  })
  images.value = result.list || []
  total.value = result.total || 0
}

async function loadCategories() {
  const result = await getImageCategories()
  if (result) {
    categories.value = result
  }
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

useHead({ title: '印象城 - ch-wiki' })
</script>

<style scoped>
.page-title { font-size: 24px; font-weight: 600; margin-bottom: 20px; }
.page-toolbar { margin-bottom: 20px; }
.image-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
.image-card {
  position: relative; border-radius: 8px; overflow: hidden; cursor: pointer;
  aspect-ratio: 1; background: #f5f7fa;
}
.image-card img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
.image-card:hover img { transform: scale(1.05); }
.image-overlay {
  position: absolute; bottom: 0; left: 0; right: 0; padding: 12px;
  background: linear-gradient(transparent, rgba(0,0,0,0.7)); color: #fff;
}
.image-name { font-size: 14px; display: block; }
.image-desc { font-size: 12px; opacity: 0.8; }
</style>
