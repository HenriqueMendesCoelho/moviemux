<script setup lang="ts">
import View from '~/modules/not-found/views/NotFoundView.vue';
definePageMeta({ name: 'notFound', layout: 'public', roles: ['UNSECURE'] });
useHead({ title: 'Movie Mux - Página não encontrada' });
</script>
<template><View /></template>
