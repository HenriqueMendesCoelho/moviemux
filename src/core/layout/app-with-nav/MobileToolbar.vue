<script setup lang="ts">
import BaseIcon from '~/core/components/BaseIcon.vue';
import { useStyleStore } from '~/core/stores/StyleStore';
const style = useStyleStore();
</script>
<template>
  <header class="mm-topbar">
    <button
      class="mm-mobile-menu"
      aria-label="Abrir menu"
      aria-controls="primary-sidebar"
      :aria-expanded="style.layoutSettings.isSideBarExpanded"
      @click="style.layoutSettings.isSideBarExpanded = !style.layoutSettings.isSideBarExpanded"
    >
      <BaseIcon name="menu" /></button
    ><span class="mm-muted">Uma boa história começa aqui.</span
    ><NuxtLink :to="{ name: 'movie-discover' }" class="mm-text-button"
      >Explorar filmes <BaseIcon name="arrow"
    /></NuxtLink>
  </header>
</template>
