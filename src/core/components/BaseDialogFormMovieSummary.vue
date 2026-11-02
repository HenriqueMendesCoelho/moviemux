<template>
  <BaseModal
    v-model="visible"
    class="mm-summary-dialog"
    title="Detalhes do filme"
    wide
    :class="{ 'mm-summary-maximized': maximized }"
    @hide="onHide"
    ><template #header
      ><slot name="prepend:bar" /><button
        type="button"
        class="mm-button mm-button-ghost"
        @click="copyMovie"
      >
        Copiar URL</button
      ><button
        type="button"
        class="mm-button mm-button-ghost"
        :aria-pressed="maximized"
        @click="maximized = !maximized"
      >
        {{ maximized ? 'Restaurar' : 'Maximizar' }}
      </button></template
    ><BaseFormMovieSummary
      v-if="visible && movieId"
      :key="movieId"
      ref="summary"
      :movie-id="movieId"
      :external-rating="externalRating"
  /></BaseModal>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import BaseModal from './BaseModal.vue';
import BaseFormMovieSummary from './BaseFormMovieSummary.vue';
import { showError, showSuccess } from 'src/core/utils/NotificationUtils';
const props = defineProps<{
  modelValue: boolean;
  movieId?: number;
  externalRating?: { movieId: number; value: number; votes?: number };
}>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; hide: [] }>();
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});
const maximized = ref(false),
  summary = ref<{ getMovie: () => Promise<void> }>();
function onHide() {
  maximized.value = false;
  emit('hide');
}
async function copyMovie() {
  if (!props.movieId) return;
  try {
    await navigator.clipboard.writeText(
      `${window.location.origin}/movie/discover?movie=${props.movieId}`,
    );
    showSuccess('URL copiada');
  } catch {
    showError('Não foi possível copiar a URL.');
  }
}
defineExpose({ loadMovie: () => summary.value?.getMovie() });
</script>
<style scoped>
.mm-summary-dialog {
  height: min(780px, 88dvh);
  overflow: hidden;
}
.mm-summary-dialog :deep(.mm-modal-content) {
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.mm-summary-dialog :deep(.mm-modal-header) {
  flex-shrink: 0;
  margin-bottom: 1rem;
}
.mm-summary-dialog :deep(.mm-summary-stage) {
  overflow: auto;
  min-height: 0;
  flex: 1;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  padding-right: 0.25rem;
}
@media (max-width: 650px) {
  .mm-summary-dialog {
    height: 90dvh;
  }
  .mm-summary-dialog :deep(.mm-modal-content) {
    padding: 1rem;
  }
  .mm-summary-dialog :deep(.mm-modal-header) {
    gap: 0.4rem;
  }
  .mm-summary-dialog :deep(.mm-modal-header h2) {
    font-size: 1.1rem;
    flex-basis: 100%;
  }
  .mm-summary-dialog :deep(.mm-modal-header button) {
    font-size: 0.75rem;
    min-height: 44px;
    padding: 0.4rem 0.6rem;
  }
}

.mm-summary-maximized {
  width: calc(100vw - 16px) !important;
  max-height: calc(100dvh - 16px) !important;
  height: calc(100dvh - 16px);
}
</style>
