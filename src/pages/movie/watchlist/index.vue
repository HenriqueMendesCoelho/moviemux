<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
import View from '~/modules/movie-watchlist/views/MovieWatchlistsListView.vue';
definePageMeta({ name: 'movie-watchlist-list', layout: 'default', roles: ['ADM', 'USER'] });
useHead(() => ({ title: `Movie Mux - ${t('pages.watchlists')}` }));
</script>
<template><View /></template>
