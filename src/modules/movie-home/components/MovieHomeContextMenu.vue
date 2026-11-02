<template>
  <BaseContextMenu
    ><div class="mm-menu">
      <button type="button" @click.prevent="copyMovie(movieId)">Copiar URL</button
      ><router-link
        :to="{ name: 'movie', params: { id: movieId } }"
        target="_blank"
        rel="noopener noreferrer"
        >Abrir em nova guia</router-link
      >
    </div></BaseContextMenu
  >
</template>
<script setup lang="ts">
import BaseContextMenu from 'src/core/components/BaseContextMenu.vue';
import { showError, showSuccess } from 'src/core/utils/NotificationUtils';
defineProps<{ movieId: string; deleteEnable?: boolean }>();
async function copyMovie(id: string) {
  if (!id) return;
  try {
    await navigator.clipboard.writeText(`${window.location.origin}/movie/${id}`);
    showSuccess('Link copiado');
  } catch {
    showError('Não foi possível copiar o link');
  }
}
</script>
