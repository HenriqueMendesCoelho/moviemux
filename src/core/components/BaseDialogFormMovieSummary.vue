<template>
  <BaseModal
    v-model="visible"
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
  /></BaseModal>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import BaseModal from './BaseModal.vue';
import BaseFormMovieSummary from './BaseFormMovieSummary.vue';
import { showError, showSuccess } from 'src/core/utils/NotificationUtils';
const props = defineProps<{ modelValue: boolean; movieId?: number }>();
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
.mm-summary-maximized {
  width: calc(100vw - 16px) !important;
  max-height: calc(100dvh - 16px) !important;
  height: calc(100dvh - 16px);
}
</style>
