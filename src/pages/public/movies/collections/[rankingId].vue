<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import PublicCollectionView from '~/modules/ranking/views/PublicCollectionView.vue';
const route = useRoute();
const { t } = useI18n();
const id = computed(() => {
  const value = route.params.rankingId;
  return typeof value === 'string' && route.path === `/public/movies/collections/${value}` ? value : null;
});
definePageMeta({
  name: 'public-collection',
  layout: false,
  roles: ['UNSECURE'],
  publicCollection: true,
});
useHead(() => ({
  title: `MovieMux - ${t('publicCollection.title')}`,
  meta: [{ name: 'robots', content: 'noindex, nofollow, noarchive' }],
}));
</script>
<template><PublicCollectionView :ranking-id="id" /></template>
