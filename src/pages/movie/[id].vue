<script setup lang="ts">
import View from '~/modules/movie/views/MovieView.vue';
definePageMeta({ name: 'movie', layout: 'default', roles: ['ADM', 'USER'] });
</script>
<template><View /></template>
