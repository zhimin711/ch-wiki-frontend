<template>
  <aside class="workbench-sidebar">
    <el-menu :default-active="activeMenu" router>
      <el-menu-item index="/workbench">
        <span>工作台首页</span>
      </el-menu-item>
      <el-menu-item index="/workbench/article">
        <span>文章审核</span>
      </el-menu-item>
      <el-menu-item index="/workbench/resource">
        <span>资源审核</span>
      </el-menu-item>
      <el-menu-item index="/workbench/image">
        <span>图片审核</span>
      </el-menu-item>
      <el-menu-item index="/workbench/classify">
        <span>分类管理</span>
      </el-menu-item>
      <el-menu-item index="/workbench/apikey-config">
        <span>密钥配置</span>
      </el-menu-item>
    </el-menu>
  </aside>
</template>

<script setup lang="ts">
const route = useRoute()
const activeMenu = computed(() => route.path)
</script>

<style scoped>
.workbench-sidebar {
  width: 200px;
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid #e4e7ed;
}
</style>
