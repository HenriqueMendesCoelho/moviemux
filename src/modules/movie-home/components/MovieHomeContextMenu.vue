<template>
  <BaseContextMenu
    :label="title ? `Opções de ${title}` : 'Opções do filme'"
    :title="title || 'Filme na coleção'"
  >
    <button type="button" :disabled="!movieId" @click.prevent="copyMovie(movieId)">
      <BaseIcon name="share" />Copiar link do filme
    </button>
    <router-link
      v-if="movieId"
      :to="{ name: 'movie', params: { id: movieId } }"
      target="_blank"
      rel="noopener noreferrer"
    >
      <BaseIcon name="arrow" />Abrir em nova guia
    </router-link>
    <button v-else type="button" disabled><BaseIcon name="arrow" />Abrir em nova guia</button>
  </BaseContextMenu>
</template>
<script setup lang="ts">
import BaseContextMenu from 'src/core/components/BaseContextMenu.vue';
import BaseIcon from 'src/core/components/BaseIcon.vue';
import { showError, showSuccess } from 'src/core/utils/NotificationUtils';
defineProps<{ movieId: string; title?: string; deleteEnable?: boolean }>();
async function copyMovie(id: string) {
  if (!id) return;
  try {
    await navigator.clipboard.writeText(
      `${window.location.origin}/movie/${encodeURIComponent(id)}`,
    );
    showSuccess('Link copiado');
  } catch {
    showError('Não foi possível copiar o link');
  }
}
</script>
