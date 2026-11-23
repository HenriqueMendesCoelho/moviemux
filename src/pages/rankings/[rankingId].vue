<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import View from '~/modules/ranking/views/RankingDetailView.vue';
const route = useRoute();
const { t } = useI18n();
definePageMeta({ name: 'ranking-detail', layout: 'default', roles: ['ADM', 'USER'] });
useHead(() => ({ title: `MovieMux - ${t('rankingDetail.title')}` }));
</script>
<template><View :ranking-id="String(route.params.rankingId || '')" /></template>
