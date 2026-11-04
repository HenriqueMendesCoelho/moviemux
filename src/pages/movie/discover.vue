<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
import View from '~/modules/movie-discover/views/MovieDiscoverView.vue';
definePageMeta({ name: 'movie-discover', layout: 'default', roles: ['ADM', 'USER'] });
useHead(() => ({ title: `Movie Mux - ${t('pages.discover')}` }));
</script>
<template><View /></template>
