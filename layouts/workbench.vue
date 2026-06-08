<template>
  <div class="workbench-layout">
    <LayoutAppHeader />
    <div class="workbench-body">
      <LayoutWorkbenchSidebar />
      <main class="workbench-content">
        <slot />
      </main>
    </div>
    <LayoutAppFooter />
  </div>
</template>

<style scoped>
.workbench-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.workbench-body {
  flex: 1;
  display: flex;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  gap: 20px;
}
.workbench-content {
  flex: 1;
  min-width: 0;
}
</style>
