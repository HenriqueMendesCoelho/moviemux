<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
import BaseIcon from '~/core/components/BaseIcon.vue';
import { useStyleStore } from '~/core/stores/StyleStore';
const style = useStyleStore();
</script>
<template>
  <header class="mm-topbar">
    <button
      class="mm-mobile-menu"
      :aria-label="t('shell.menuOpen')"
      aria-controls="primary-sidebar"
      :aria-expanded="style.layoutSettings.isSideBarExpanded"
      @click="style.layoutSettings.isSideBarExpanded = !style.layoutSettings.isSideBarExpanded"
    >
      <BaseIcon name="menu" /></button
    ><span class="mm-muted">{{ t('shell.story') }}</span
    ><NuxtLink :to="{ name: 'movie-discover' }" class="mm-text-button"
      >{{ t('shell.explore') }} <BaseIcon name="arrow"
    /></NuxtLink>
  </header>
</template>
