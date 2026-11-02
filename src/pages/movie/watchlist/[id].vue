<script setup lang="ts">
import View from '~/modules/movie-watchlist/views/MovieWatchlistView.vue';
definePageMeta({ name: 'movie-watchlist-id', layout: 'default', roles: ['ADM', 'USER'] });
</script>
<template><View /></template>
