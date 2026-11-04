<template>
  <footer class="mm-actions">
    <button
      type="button"
      class="mm-button mm-button-primary"
      :disabled="disableSave"
      @click="emit('save')"
    >
      {{ t('catalog.movie.saveMovie') }}</button
    ><button type="button" class="mm-button" :disabled="disableCancel" @click="emit('cancel')">
      {{ t('catalog.movie.cancel') }}
    </button>
  </footer>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
defineProps<{ disableSave?: boolean; disableCancel?: boolean }>();
const emit = defineEmits<{ save: []; cancel: [] }>();
</script>
<style scoped>
.mm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin: 2rem 0;
}
</style>
