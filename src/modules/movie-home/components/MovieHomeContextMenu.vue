<template>
  <BaseContextMenu
    :label="title ? t('catalog.optionsOf', { title }) : t('catalog.movieOptions')"
    :title="title || t('catalog.collectionMovie')"
  >
    <button type="button" :disabled="!movieId" @click.prevent="copyMovie(movieId)">
      <BaseIcon name="share" />{{ t('catalog.copyMovieLink') }}
    </button>
    <router-link
      v-if="movieId"
      :to="{ name: 'movie', params: { id: movieId } }"
      target="_blank"
      rel="noopener noreferrer"
    >
      <BaseIcon name="arrow" />{{ t('catalog.openNewTab') }}
    </router-link>
    <button v-else type="button" disabled>
      <BaseIcon name="arrow" />{{ t('catalog.openNewTab') }}
    </button>
  </BaseContextMenu>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
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
    showSuccess(() => t('catalog.linkCopied'));
  } catch {
    showError(() => t('catalog.copyFailed'));
  }
}
</script>
