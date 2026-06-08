<template>
  <div class="center-layout">
    <LayoutAppHeader />
    <div class="center-body">
      <LayoutCenterSidebar />
      <main class="center-content">
        <slot />
      </main>
    </div>
    <LayoutAppFooter />
  </div>
</template>

<style scoped>
.center-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.center-body {
  flex: 1;
  display: flex;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  gap: 20px;
}
.center-content {
  flex: 1;
  min-width: 0;
}
</style>
