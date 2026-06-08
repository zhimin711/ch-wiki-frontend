<template>
  <div class="center-page">
    <h1>个人中心</h1>
    <div v-if="profile" class="profile-card">
      <div class="profile-header">
        <img :src="avatarSrc" :alt="profile.nickname || profile.username" class="avatar" />
        <div class="profile-info">
          <h2>{{ profile.nickname || profile.username }}</h2>
          <p class="profile-type">{{ profile.type }} · 等级 {{ profile.level }}</p>
        </div>
      </div>
      <div class="profile-details">
        <div class="detail-item">
          <span class="detail-label">用户名</span>
          <span class="detail-value">{{ profile.username }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">昵称</span>
          <span class="detail-value">{{ profile.nickname || '-' }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">邮箱</span>
          <span class="detail-value">{{ profile.email || '-' }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">积分</span>
          <span class="detail-value">{{ profile.integral || 0 }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">站内密码</span>
          <span class="detail-value">{{ profile.hasPassword ? '已设置' : '未设置' }}</span>
        </div>
      </div>
      <div class="profile-actions">
        <NuxtLink to="/center/profile">编辑资料</NuxtLink>
        <NuxtLink to="/center/avatar">更换头像</NuxtLink>
        <NuxtLink to="/center/password">管理密码</NuxtLink>
      </div>
    </div>
    <el-empty v-else description="请先登录" />
  </div>
</template>

<script setup lang="ts">
import type { UserProfile } from '~/services/user-api'

definePageMeta({
  layout: 'center',
  middleware: 'auth',
})

const userApi = useUserApi()
const profile = ref<UserProfile | null>(null)
const avatarSrc = computed(() => resolveDisplayImage(
  profile.value?.avatar,
  profile.value?.nickname || profile.value?.username || '?',
  64,
))

onMounted(async () => {
  try {
    profile.value = await userApi.getProfile()
  } catch {
    // 认证失败由拦截器处理
  }
})

useHead({ title: '个人中心 - ch-wiki' })
</script>

<style scoped>
.profile-card { background: #fff; border-radius: 8px; padding: 24px; }
.profile-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
.avatar { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; }
.profile-info h2 { font-size: 20px; margin-bottom: 4px; }
.profile-type { font-size: 13px; color: #909399; }
.profile-details { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.detail-item { display: flex; flex-direction: column; }
.detail-label { font-size: 12px; color: #909399; margin-bottom: 4px; }
.detail-value { font-size: 14px; }
.profile-actions { display: flex; gap: 12px; margin-top: 20px; flex-wrap: wrap; }
.profile-actions a { color: #409eff; text-decoration: none; font-size: 14px; }
</style>
