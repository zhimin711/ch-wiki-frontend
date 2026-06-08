<template>
  <div class="home-page">
    <!-- 广告轮播 -->
    <section class="home-banner" v-if="homeData?.ads?.length">
      <el-carousel height="360px" :interval="5000">
        <el-carousel-item v-for="ad in homeData.ads" :key="ad.id">
          <a :href="ad.url" class="banner-item" target="_blank">
            <img :src="ad.image" :alt="ad.title" />
            <div class="banner-overlay" v-if="ad.title">
              <h3>{{ ad.title }}</h3>
              <p v-if="ad.description">{{ ad.description }}</p>
            </div>
          </a>
        </el-carousel-item>
      </el-carousel>
    </section>

    <!-- 主内容区 -->
    <div class="home-content">
      <!-- 最新文章 -->
      <section class="home-section">
        <div class="section-header">
          <h2 class="section-title">最新文章</h2>
          <NuxtLink to="/tech" class="section-more">查看更多 →</NuxtLink>
        </div>
        <div class="article-list">
          <div v-for="article in homeData?.latestArticles" :key="article.id" class="article-card">
            <NuxtLink :to="`/tech/${article.id}`" class="article-link">
              <div class="article-info">
                <div class="article-top">
                  <span class="article-category" v-if="article.categoryName">{{ article.categoryName }}</span>
                  <span class="article-date" v-if="article.publishAt">{{ formatDate(article.publishAt) }}</span>
                </div>
                <h3 class="article-title">{{ article.title }}</h3>
                <p class="article-desc" v-if="article.description">{{ article.description }}</p>
                <div class="article-meta">
                  <span v-if="article.author" class="meta-item">✍ {{ article.author }}</span>
                  <span v-if="article.countView != null" class="meta-item">👁 {{ article.countView }} 阅读</span>
                  <span v-if="article.countComment != null" class="meta-item">💬 {{ article.countComment }} 评论</span>
                </div>
              </div>
            </NuxtLink>
          </div>
        </div>
      </section>

      <!-- 精选文章 -->
      <section class="home-section" v-if="homeData?.goodArticles?.length">
        <div class="section-header">
          <h2 class="section-title"><span class="section-badge">精选</span>精选文章</h2>
          <NuxtLink to="/tech" class="section-more">查看更多 →</NuxtLink>
        </div>
        <div class="article-list">
          <div v-for="article in homeData.goodArticles" :key="'good-' + article.id" class="article-card article-card--good">
            <NuxtLink :to="`/tech/${article.id}`" class="article-link">
              <div class="article-info">
                <div class="article-top">
                  <span class="article-category" v-if="article.categoryName">{{ article.categoryName }}</span>
                  <span class="article-date" v-if="article.publishAt">{{ formatDate(article.publishAt) }}</span>
                </div>
                <h3 class="article-title">{{ article.title }}</h3>
                <p class="article-desc" v-if="article.description">{{ article.description }}</p>
                <div class="article-meta">
                  <span v-if="article.author" class="meta-item">✍ {{ article.author }}</span>
                  <span v-if="article.countView != null" class="meta-item">👁 {{ article.countView }} 阅读</span>
                </div>
              </div>
            </NuxtLink>
          </div>
        </div>
      </section>

      <!-- 推荐文章 -->
      <section class="home-section" v-if="homeData?.recommendArticles?.length">
        <div class="section-header">
          <h2 class="section-title"><span class="section-badge section-badge--rec">推荐</span>推荐文章</h2>
          <NuxtLink to="/tech" class="section-more">查看更多 →</NuxtLink>
        </div>
        <div class="article-list">
          <div v-for="article in homeData.recommendArticles" :key="'rec-' + article.id" class="article-card article-card--rec">
            <NuxtLink :to="`/tech/${article.id}`" class="article-link">
              <div class="article-info">
                <div class="article-top">
                  <span class="article-category" v-if="article.categoryName">{{ article.categoryName }}</span>
                  <span class="article-date" v-if="article.publishAt">{{ formatDate(article.publishAt) }}</span>
                </div>
                <h3 class="article-title">{{ article.title }}</h3>
                <p class="article-desc" v-if="article.description">{{ article.description }}</p>
                <div class="article-meta">
                  <span v-if="article.author" class="meta-item">✍ {{ article.author }}</span>
                  <span v-if="article.countView != null" class="meta-item">👁 {{ article.countView }} 阅读</span>
                </div>
              </div>
            </NuxtLink>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PublicHomeDTO } from '~/services/public-api'
import { usePublicApi } from '~/services/public-api'

// 客户端获取首页数据（避免 SSR 失败导致客户端不重试）
const { getHome } = usePublicApi()
const { data: homeData, pending, error } = await useAsyncData('home', () => getHome(), { server: false })

function formatDate(ts: number | null | undefined) {
  if (!ts) return ''
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('zh-CN')
}

// SEO
useHead({
  title: 'ch-wiki - 首页',
  meta: [
    { name: 'description', content: 'ch-wiki 知识库 - 沉淀知识，连接创作' },
  ],
})
</script>

<style scoped>
.home-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 4px;
}

/* 轮播 */
.home-banner {
  margin: 0 0 28px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--shadow-md);
}
.banner-item {
  display: block;
  position: relative;
  height: 360px;
}
.banner-item img {
  width: 100%;
  height: 360px;
  object-fit: cover;
}
.banner-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24px 28px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.72));
  color: #fff;
}
.banner-overlay h3 {
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 6px;
  letter-spacing: 0.5px;
}
.banner-overlay p {
  font-size: 14px;
  opacity: 0.92;
}

/* 区块 */
.home-content {
  display: flex;
  flex-direction: column;
  gap: 36px;
}
.home-section {
  background: var(--color-bg-white);
  border-radius: 12px;
  padding: 24px 28px;
  box-shadow: var(--shadow-sm);
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
  padding-bottom: 14px;
  border-bottom: 1px dashed var(--color-border);
}
.section-title {
  position: relative;
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text);
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding-left: 14px;
}
.section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 18px;
  background: linear-gradient(180deg, var(--color-primary), var(--color-primary-light));
  border-radius: 2px;
}
.section-badge {
  display: inline-block;
  font-size: 12px;
  font-weight: 500;
  color: #fff;
  background: linear-gradient(135deg, #ff9a44, #ff6a6a);
  padding: 2px 8px;
  border-radius: 4px;
  letter-spacing: 1px;
}
.section-badge--rec {
  background: linear-gradient(135deg, #67c23a, #409eff);
}
.section-more {
  font-size: 13px;
  color: var(--color-text-secondary);
  transition: color 0.2s;
}
.section-more:hover {
  color: var(--color-primary);
}

/* 文章列表（无封面） */
.article-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.article-card {
  position: relative;
  background: #fafbfc;
  border: 1px solid transparent;
  border-radius: 8px;
  transition: all 0.25s ease;
  overflow: hidden;
}
.article-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--color-primary);
  transform: scaleY(0);
  transform-origin: center;
  transition: transform 0.25s ease;
}
.article-card:hover {
  background: #fff;
  border-color: var(--color-primary);
  box-shadow: 0 6px 18px rgba(64, 158, 255, 0.12);
  transform: translateX(2px);
}
.article-card:hover::before {
  transform: scaleY(1);
}
.article-card--good {
  background: linear-gradient(135deg, #fff8f0 0%, #fafbfc 60%);
}
.article-card--good::before {
  background: linear-gradient(180deg, #ff9a44, #ff6a6a);
}
.article-card--rec {
  background: linear-gradient(135deg, #f0faf4 0%, #fafbfc 60%);
}
.article-card--rec::before {
  background: linear-gradient(180deg, #67c23a, #409eff);
}
.article-link {
  text-decoration: none;
  color: inherit;
  display: block;
  padding: 14px 18px 14px 22px;
}
.article-top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}
.article-category {
  display: inline-block;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-primary);
  background: rgba(64, 158, 255, 0.1);
  padding: 2px 8px;
  border-radius: 3px;
}
.article-date {
  font-size: 12px;
  color: var(--color-text-placeholder);
}
.article-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 6px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color 0.2s;
}
.article-card:hover .article-title {
  color: var(--color-primary);
}
.article-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.article-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 12px;
  color: var(--color-text-placeholder);
  flex-wrap: wrap;
}
.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
</style>
