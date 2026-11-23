<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import View from '~/modules/ranking/views/RankingListView.vue';
const { t } = useI18n();
definePageMeta({ name: 'rankings', layout: 'default', roles: ['ADM', 'USER'] });
useHead(() => ({ title: `MovieMux - ${t('rankings.title')}` }));
</script>
<template><View /></template>
