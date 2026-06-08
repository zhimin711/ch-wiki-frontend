<template>
  <div class="app-layout">
    <LayoutAppHeader />
    <main class="app-main">
      <slot />
    </main>
    <LayoutAppFooter />
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.app-main {
  flex: 1;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}
</style>
