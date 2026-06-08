<template>
  <aside class="center-sidebar">
    <!-- 用户信息卡片 -->
    <div class="user-card">
      <div class="user-avatar">
        <img v-if="avatar" :src="avatar" :alt="displayName" />
        <div v-else class="avatar-fallback">{{ initial }}</div>
      </div>
      <div class="user-info">
        <div class="user-name">{{ displayName }}</div>
        <div class="user-meta">个人中心</div>
      </div>
    </div>

    <!-- 菜单 -->
    <el-menu :default-active="activeMenu" router class="sidebar-menu">
      <el-menu-item-group title="概览">
        <el-menu-item index="/center">
          <el-icon><HomeFilled /></el-icon>
          <span>中心概览</span>
        </el-menu-item>
      </el-menu-item-group>

      <el-menu-item-group title="账户">
        <el-menu-item index="/center/profile">
          <el-icon><User /></el-icon>
          <span>个人资料</span>
        </el-menu-item>
        <el-menu-item index="/center/password">
          <el-icon><Lock /></el-icon>
          <span>站内密码</span>
        </el-menu-item>
        <el-menu-item index="/center/avatar">
          <el-icon><Picture /></el-icon>
          <span>头像</span>
        </el-menu-item>
      </el-menu-item-group>

      <el-menu-item-group title="内容">
        <el-menu-item index="/center/article">
          <el-icon><Document /></el-icon>
          <span>我的文章</span>
        </el-menu-item>
        <el-menu-item index="/center/bookmark">
          <el-icon><Star /></el-icon>
          <span>我的书签</span>
        </el-menu-item>
        <el-menu-item index="/center/resource">
          <el-icon><Folder /></el-icon>
          <span>我的资源</span>
        </el-menu-item>
        <el-menu-item index="/center/books">
          <el-icon><Reading /></el-icon>
          <span>我的书籍</span>
        </el-menu-item>
      </el-menu-item-group>

      <el-menu-item-group title="计划">
        <el-menu-item index="/center/plans">
          <el-icon><Calendar /></el-icon>
          <span>周期计划</span>
        </el-menu-item>
        <el-menu-item index="/center/calendar">
          <el-icon><Clock /></el-icon>
          <span>我的日程</span>
        </el-menu-item>
      </el-menu-item-group>

      <el-menu-item-group title="安全">
        <el-menu-item index="/center/personal-tokens">
          <el-icon><Key /></el-icon>
          <span>私人令牌</span>
        </el-menu-item>
      </el-menu-item-group>
    </el-menu>
  </aside>
</template>

<script setup lang="ts">
import {
  HomeFilled,
  User,
  Lock,
  Picture,
  Document,
  Star,
  Folder,
  Reading,
  Calendar,
  Clock,
  Key,
} from '@element-plus/icons-vue'
import { getInitials } from '~/composables/useAvatar'

const route = useRoute()
const activeMenu = computed(() => route.path)

const { username, nickname, avatar } = useAuth()
const displayName = computed(() => nickname.value || username.value || '未登录')
const initial = computed(() => getInitials(displayName.value))
</script>

<style scoped>
.center-sidebar {
  width: 220px;
  flex-shrink: 0;
  background: #fff;
  border-radius: 12px;
  padding: 8px 8px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  height: fit-content;
  position: sticky;
  top: 80px;
}

/* 用户信息卡片 */
.user-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 14px 16px;
  border-bottom: 1px solid var(--color-border);
  margin: 0 -8px 8px;
}
.user-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: linear-gradient(135deg, #5b86e5, #36d1dc);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 600;
  font-size: 16px;
  box-shadow: 0 2px 6px rgba(91, 134, 229, 0.25);
}
.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  user-select: none;
  letter-spacing: 0;
}
.user-info {
  flex: 1;
  min-width: 0;
}
.user-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.user-meta {
  font-size: 12px;
  color: var(--color-text-placeholder);
  margin-top: 2px;
}

/* 菜单分组标题 */
:deep(.el-menu-item-group__title) {
  font-size: 11px !important;
  font-weight: 600 !important;
  color: var(--color-text-placeholder) !important;
  letter-spacing: 1.5px;
  padding: 12px 12px 4px !important;
  text-transform: uppercase;
}
:deep(.el-menu-item-group:first-child .el-menu-item-group__title) {
  padding-top: 4px !important;
}
:deep(.el-menu-item-group__title)::after {
  display: none !important;
}
:deep(.el-menu-item-group > ul) {
  padding: 0 !important;
}

/* 菜单本身：去掉默认右边框 */
:deep(.el-menu) {
  border-right: none !important;
}
:deep(.el-menu-item) {
  height: 40px !important;
  line-height: 40px !important;
  margin: 2px 0;
  padding: 0 12px !important;
  border-radius: 6px;
  font-size: 13px;
  color: var(--color-text-secondary);
  transition: all 0.2s;
}
:deep(.el-menu-item:hover) {
  background: rgba(64, 158, 255, 0.08) !important;
  color: var(--color-primary) !important;
}
:deep(.el-menu-item.is-active) {
  background: linear-gradient(90deg, rgba(64, 158, 255, 0.15), rgba(64, 158, 255, 0.04)) !important;
  color: var(--color-primary) !important;
  font-weight: 500;
  box-shadow: inset 3px 0 0 var(--color-primary);
}
:deep(.el-menu-item .el-icon) {
  margin-right: 10px !important;
  font-size: 16px;
}
:deep(.el-menu-item.is-active .el-icon) {
  color: var(--color-primary);
}
</style>
