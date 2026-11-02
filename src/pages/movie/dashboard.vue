<script setup lang="ts">
import View from '~/modules/movie-charts/views/MovieChartsView.vue';
definePageMeta({ name: 'movie-charts', layout: 'default', roles: ['ADM', 'USER'] });
useHead({ title: 'Movie Mux - Dashboard' });
</script>
<template><View /></template>
