<script setup lang="ts">
import View from '~/modules/movie-watchlist/views/MovieWatchlistsListView.vue';
definePageMeta({ name: 'movie-watchlist-list', layout: 'default', roles: ['ADM', 'USER'] });
useHead({ title: 'Movie Mux - Lista de Filmes' });
</script>
<template><View /></template>
