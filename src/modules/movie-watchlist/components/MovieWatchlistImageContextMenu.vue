<template>
  <BaseContextMenu
    ><button type="button" class="mm-button" @click="emit('copy-url')">
      {{ t('library.copyLink') }}
    </button></BaseContextMenu
  >
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
import BaseContextMenu from 'src/core/components/BaseContextMenu.vue';

const emit = defineEmits<{
  (e: 'copy-url', value: void): void;
}>();
</script>

<style scoped>
.mw-menu {
  min-width: 100px;
}
</style>
