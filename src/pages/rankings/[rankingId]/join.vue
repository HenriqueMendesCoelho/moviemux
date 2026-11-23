<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import View from '~/modules/ranking/views/RankingJoinView.vue';
const route = useRoute();
const { t } = useI18n();

definePageMeta({ name: 'ranking-join', layout: 'default', roles: ['ADM', 'USER'] });
useHead(() => ({ title: `MovieMux - ${t('rankingJoin.title')}` }));
</script>
<template><View :ranking-id="route.params.rankingId" /></template>
