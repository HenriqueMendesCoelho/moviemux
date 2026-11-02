<script setup lang="ts">
import View from '~/modules/movie/views/MovieAddView.vue';
definePageMeta({ name: 'add', layout: 'default', roles: ['ADM', 'USER'] });
useHead({ title: 'Movie Mux - Cadastrar Filme' });
</script>
<template><View /></template>
