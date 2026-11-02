<script setup lang="ts">
defineOptions({ name: 'MovieMuxHomePage' });
import View from '~/modules/movie-home/views/MovieHomeView.vue';
definePageMeta({ name: 'home', layout: 'default', roles: ['ADM', 'USER'] });
useHead({ title: 'Movie Mux - Home' });
</script>
<template><View /></template>
