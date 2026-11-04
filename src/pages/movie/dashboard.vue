<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
import View from '~/modules/movie-charts/views/MovieChartsView.vue';
definePageMeta({ name: 'movie-charts', layout: 'default', roles: ['ADM', 'USER'] });
useHead(() => ({ title: `Movie Mux - ${t('pages.statistics')}` }));
</script>
<template><View /></template>
