<script setup lang="ts">
import View from '~/modules/movie/views/MovieEditView.vue';
definePageMeta({ name: 'movie-edit', layout: 'default', roles: ['ADM', 'USER'] });
</script>
<template><View /></template>
