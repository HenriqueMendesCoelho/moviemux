<template>
  <header class="mm-page-title">
    <div>
      <p class="mm-eyebrow">MOVIE MUX</p>
      <h1>{{ title }} <slot name="title" /></h1>
    </div>
    <div><slot name="after-icon" /></div>
  </header>
</template>
<script setup lang="ts">
defineProps<{ title: string; icon?: string }>();
</script>
<style scoped>
.mm-page-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 32px;
}
.mm-page-title h1 {
  font-size: clamp(1.8rem, 4vw, 3rem);
  letter-spacing: -0.05em;
  margin: 6px 0;
}
.mm-eyebrow {
  font-size: 0.7rem;
  letter-spacing: 0.2em;
  color: var(--primary);
}
</style>
