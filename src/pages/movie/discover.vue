<script setup lang="ts">
import View from '~/modules/movie-discover/views/MovieDiscoverView.vue';
definePageMeta({ name: 'movie-discover', layout: 'default', roles: ['ADM', 'USER'] });
useHead({ title: 'Movie Mux - Descobrir Filmes' });
</script>
<template><View /></template>
