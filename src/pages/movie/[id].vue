<script setup lang="ts">
import View from '~/modules/movie/views/MovieView.vue';
import { legacyFilmHandoffMode } from '~/core/legacy-film-handoff';
const legacyEnabled =
  legacyFilmHandoffMode(useRuntimeConfig().public.legacyFilmHandoffEnabled) === 'off';
definePageMeta({ name: 'movie', layout: 'default', roles: ['ADM', 'USER'] });
</script>
<template>
  <View v-if="legacyEnabled" />
  <p v-else role="status">{{ $t('rankingDetail.legacyLinkUnavailable') }}</p>
</template>
