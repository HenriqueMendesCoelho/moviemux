<script setup lang="ts">
import { LEGACY_HISTORY_NOTICE } from '~/core/legacy-film-handoff';
import { useI18n } from 'vue-i18n';
import View from '~/modules/ranking/views/RankingDetailView.vue';
const route = useRoute();
const moved = useCookie('moviemux-history-moved', {
  path: '/movies/collections',
  sameSite: 'lax',
});
const historyMoved = ref(moved.value === LEGACY_HISTORY_NOTICE);
onMounted(() => {
  moved.value = null;
});
const { t } = useI18n();
definePageMeta({ name: 'ranking-detail', layout: 'default', roles: ['ADM', 'USER'] });
useHead(() => ({ title: `MovieMux - ${t('rankingDetail.title')}` }));
</script>
<template>
  <div>
    <p v-if="historyMoved" role="status" class="mm-empty">
      {{ t('rankingDetail.legacyHistoryMoved') }}
    </p>
    <View :ranking-id="String(route.params.rankingId || '')" />
  </div>
</template>
